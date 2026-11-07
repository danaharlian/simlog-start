#!/usr/bin/env node
// check-lint-integrity.mjs
// Fails when the quality gates themselves were weakened: a rule turned off for some path, a file added to
// ESLint `ignores`, `strict` switched off, a file dropped from tsconfig, `--max-warnings 0` removed.
// An agent that cannot suppress a single error may try to weaken the config instead. This script catches that.
//
// Usage (app root; needs the app's own `eslint` and `typescript`):  node scripts/check-lint-integrity.mjs
// Edit ALLOWED_IGNORED / REQUIRED_* below only through a reviewed change (CODEOWNERS, see docs).
// Exit codes: 0 pass, 1 gate weakened, 2 could not run.
import { ESLint } from "eslint"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import ts from "typescript"

const ROOT = process.cwd()
const SCAN_DIRS = ["src"]
const CODE_FILE = /\.(?:[cm]?[jt]s|[jt]sx)$/
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".output",
  ".tanstack",
  ".vinxi",
  "coverage",
  ".git",
])

/** Files ESLint may ignore. Everything else under SCAN_DIRS must be linted. */
const ALLOWED_IGNORED = [/^src\/routeTree\.gen\.ts$/]

/** Rules that must resolve to "error" for every linted file (so no per-path override can turn them off). */
const REQUIRED_ERROR_RULES = [
  "@typescript-eslint/ban-ts-comment",
  "@typescript-eslint/no-explicit-any",
  "@typescript-eslint/no-non-null-assertion",
  "@typescript-eslint/no-non-null-asserted-optional-chain",
  "@typescript-eslint/no-unnecessary-type-assertion",
  "@typescript-eslint/no-unsafe-type-assertion",
  "@typescript-eslint/consistent-type-assertions",
  "@typescript-eslint/no-unsafe-assignment",
  "@typescript-eslint/no-unsafe-member-access",
  "@typescript-eslint/no-unsafe-call",
  "@typescript-eslint/no-unsafe-return",
  "@typescript-eslint/no-unsafe-argument",
  "@typescript-eslint/no-deprecated",
  "no-restricted-syntax",
  "@eslint-community/eslint-comments/no-use",
  "@typescript-eslint/switch-exhaustiveness-check",
  "boundaries/dependencies",
]
/**
 * A file inside a feature that matches no category in eslint.boundaries.js gets no layer rules, so a new `utils/`
 * folder could import anything (docs/02-architecture/folder-structure.md). Keep in step with `boundaries/files`.
 */
const FEATURE_FILE =
  /^src\/features\/[^/]+\/(?:index(?:\.server)?\.ts|(?:schemas|errors|events|queries)\.ts|(?:components|hooks|db|__tests__)\/.+|server\/[^/]+\.(?:functions|listeners|service|repository|rules)\.ts|.+\.test\.tsx?)$/
/** Rules that must be "error" for the files they cover (eslint.code-rules.js). The env modules read env by design. */
const SCOPED_ERROR_RULES = [
  {
    id: "import/no-default-export",
    covers: /^src\/(?:features|shared)\/.*\.tsx?$/,
  },
  {
    id: "no-restricted-properties",
    covers: /^src\/(?!shared\/config\/env(?:\.server)?\.ts$).*\.tsx?$/,
  },
  {
    id: "no-console",
    covers:
      /^src\/(?:features\/[^/]+\/server\/|shared\/server\/|routes\/api\/)|\.server\.tsx?$/,
  },
]
/**
 * Size and magic-number limits (eslint.code-rules.js, ADR 0034): "error", and no limit above the documented one.
 * Tests and generated primitives in shared/ui are exempt; `app-*` files there are our code.
 */
const LIMITED_FILE =
  /^src\/(?!.*(?:__tests__\/|\.test\.tsx?$))(?:(?!shared\/ui\/).*|shared\/ui\/(?:.*\/)?app-[^/]+)\.tsx?$/
const LIMIT_RULES = [
  { id: "max-lines", max: () => 300 },
  {
    id: "max-lines-per-function",
    max: (file) => (file.endsWith(".tsx") ? 200 : 50),
  },
  { id: "max-depth", max: () => 3 },
  { id: "max-params", max: () => 4 },
]
const MAGIC_NUMBERS_ALLOWED = new Set([-1, 0, 1])
const REQUIRED_SELECTORS = [
  'TSAsExpression > TSAsExpression.expression[typeAnnotation.type="TSUnknownKeyword"]',
  'TSAsExpression > TSAsExpression.expression[typeAnnotation.type="TSAnyKeyword"]',
  "TSTypeAssertion",
  "ClassDeclaration",
  "ClassExpression",
  "ImportExpression[source.value=/\\.functions(\\.tsx?)?$/]",
]
const REQUIRED_TSCONFIG_TRUE = [
  "strict",
  "noUncheckedIndexedAccess",
  "noImplicitOverride",
  "noFallthroughCasesInSwitch",
  "verbatimModuleSyntax",
  "isolatedModules",
]
// Individual strict flags that may be switched off even when `strict` is true.
const STRICT_FLAGS = [
  "noImplicitAny",
  "strictNullChecks",
  "strictFunctionTypes",
  "strictBindCallApply",
  "strictPropertyInitialization",
  "noImplicitThis",
  "useUnknownInCatchVariables",
  "alwaysStrict",
]

const problems = []
const fail = (msg) => problems.push(msg)
const rel = (p) => relative(ROOT, p).split("\\").join("/")

// Each check script is installed into the app as a single file with no shared module, so it has its own walk()
// (ADR 0034). The installer's copy is installer/files.mjs, listFiles().
function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (CODE_FILE.test(entry.name)) out.push(full)
  }
  return out
}

const severity = (entry) => {
  const s = Array.isArray(entry) ? entry[0] : entry
  return s === 2 || s === "error"
}
const options = (entry) => (Array.isArray(entry) ? entry.slice(1) : [])

async function checkEslint(files) {
  const eslint = new ESLint({ cwd: ROOT })
  for (const abs of files) {
    const file = rel(abs)
    if (await eslint.isPathIgnored(abs)) {
      if (!ALLOWED_IGNORED.some((re) => re.test(file)))
        fail(`${file}: ignored by ESLint but not in ALLOWED_IGNORED`)
      continue
    }
    const cfg = await eslint.calculateConfigForFile(abs)
    if (!cfg) {
      fail(`${file}: no ESLint config applies`)
      continue
    }
    if (cfg.linterOptions?.noInlineConfig !== true)
      fail(`${file}: linterOptions.noInlineConfig is not true`)
    const rules = cfg.rules ?? {}
    for (const id of REQUIRED_ERROR_RULES) {
      if (!(id in rules) || !severity(rules[id]))
        fail(
          `${file}: rule ${id} is not "error" (got ${JSON.stringify(rules[id])})`
        )
    }
    for (const { id, covers } of SCOPED_ERROR_RULES) {
      if (covers.test(file) && (!(id in rules) || !severity(rules[id])))
        fail(
          `${file}: rule ${id} is not "error" (got ${JSON.stringify(rules[id])})`
        )
    }
    if (LIMITED_FILE.test(file)) checkLimits(file, rules)
    const boundaries = options(rules["boundaries/dependencies"])[0] ?? {}
    if (boundaries.default !== "disallow" || boundaries.checkInternals !== true)
      fail(
        `${file}: boundaries/dependencies must set default: 'disallow' and checkInternals: true`
      )
    if (!JSON.stringify(boundaries).includes("shared-db"))
      fail(`${file}: boundaries/dependencies lost its shared-db rules`)
    const exhaustive =
      options(rules["@typescript-eslint/switch-exhaustiveness-check"])[0] ?? {}
    if (exhaustive.considerDefaultExhaustiveForUnions !== false)
      fail(
        `${file}: switch-exhaustiveness-check must set considerDefaultExhaustiveForUnions to false`
      )
    const restricted = options(rules["no-restricted-properties"])
    if (
      "no-restricted-properties" in rules &&
      severity(rules["no-restricted-properties"]) &&
      !restricted.some((o) => o.object === "process" && o.property === "env")
    )
      fail(`${file}: no-restricted-properties lost process.env`)
    const ban = options(rules["@typescript-eslint/ban-ts-comment"])[0] ?? {}
    for (const k of ["ts-ignore", "ts-nocheck", "ts-expect-error"]) {
      if (ban[k] !== true)
        fail(`${file}: ban-ts-comment option "${k}" is not true`)
    }
    const selectors = options(rules["no-restricted-syntax"]).map((o) =>
      typeof o === "string" ? o : o.selector
    )
    for (const sel of REQUIRED_SELECTORS) {
      if (!selectors.includes(sel))
        fail(`${file}: no-restricted-syntax lost selector ${sel}`)
    }
    const assertions =
      options(rules["@typescript-eslint/consistent-type-assertions"])[0] ?? {}
    if (
      assertions.assertionStyle !== "as" ||
      assertions.objectLiteralTypeAssertions !== "never"
    ) {
      fail(
        `${file}: consistent-type-assertions must be { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' }`
      )
    }
    const noUse =
      options(rules["@eslint-community/eslint-comments/no-use"])[0] ?? {}
    if ((noUse.allow ?? []).length > 0)
      fail(
        `${file}: eslint-comments/no-use allows ${JSON.stringify(noUse.allow)}`
      )
  }
}

// A rule accepts its limit as a number or as `max` (also the older `maximum`); a missing limit is the rule's default.
function limitOf(entry) {
  const option = options(entry)[0]
  return typeof option === "number" ? option : (option?.max ?? option?.maximum)
}

function checkLimits(file, rules) {
  for (const { id, max } of LIMIT_RULES) {
    const limit = limitOf(rules[id])
    if (!(id in rules) || !severity(rules[id]))
      fail(
        `${file}: rule ${id} is not "error" (got ${JSON.stringify(rules[id])})`
      )
    else if (typeof limit !== "number" || limit > max(file))
      fail(`${file}: rule ${id} allows ${limit}, above ${max(file)}`)
  }
  const magic = rules["no-magic-numbers"]
  const magicOptions = options(magic)[0] ?? {}
  if (!magic || !severity(magic))
    fail(
      `${file}: rule no-magic-numbers is not "error" (got ${JSON.stringify(magic)})`
    )
  else if (
    magicOptions.enforceConst !== true ||
    (magicOptions.ignore ?? []).some((n) => !MAGIC_NUMBERS_ALLOWED.has(n))
  )
    fail(
      `${file}: no-magic-numbers must set enforceConst: true and ignore only -1, 0, 1 (got ${JSON.stringify(magicOptions)})`
    )
}

function checkTsconfig(files) {
  const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, "tsconfig.json")
  if (!configPath) return fail("tsconfig.json not found")
  const read = ts.readConfigFile(configPath, ts.sys.readFile)
  if (read.error)
    return fail(
      `tsconfig.json: ${ts.flattenDiagnosticMessageText(read.error.messageText, "\n")}`
    )
  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    dirname(configPath)
  )
  const o = parsed.options
  for (const flag of REQUIRED_TSCONFIG_TRUE)
    if (o[flag] !== true)
      fail(`tsconfig: "${flag}" must be true (got ${o[flag]})`)
  for (const flag of STRICT_FLAGS)
    if (o[flag] === false) fail(`tsconfig: "${flag}" is switched off`)
  const included = new Set(parsed.fileNames.map((f) => resolve(f)))
  for (const abs of files) {
    if (
      !/\.[cm]?tsx?$/.test(abs) ||
      ALLOWED_IGNORED.some((re) => re.test(rel(abs)))
    )
      continue
    if (!included.has(resolve(abs)))
      fail(
        `${rel(abs)}: not part of the tsconfig program (excluded from type checking)`
      )
  }
}

function checkPackageScripts() {
  const pkgPath = join(ROOT, "package.json")
  if (!existsSync(pkgPath)) return fail("package.json not found")
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
  const lint = pkg.scripts?.lint
  if (typeof lint !== "string" || !/--max-warnings(?:\s+|=)0\b/.test(lint)) {
    fail(
      `package.json: scripts.lint must include "--max-warnings 0" (got ${JSON.stringify(lint)})`
    )
  }
  const ui = pkg.scripts?.["check:ui"]
  if (typeof ui !== "string" || !ui.includes("scripts/check-ui.mjs")) {
    fail(
      `package.json: scripts["check:ui"] must run scripts/check-ui.mjs (got ${JSON.stringify(ui)})`
    )
  }
}

async function main() {
  const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)))
  if (files.length === 0) {
    console.error(
      `check-lint-integrity: no code files under ${SCAN_DIRS.join(", ")} (run from the app root)`
    )
    process.exit(2)
  }
  await checkEslint(files)
  for (const abs of files) {
    const file = rel(abs)
    if (file.startsWith("src/features/") && !FEATURE_FILE.test(file))
      fail(
        `${file}: matches no boundary category, so no layer rules apply. Move it to a standard folder (docs/02-architecture/folder-structure.md)`
      )
  }
  checkTsconfig(files)
  checkPackageScripts()

  if (problems.length === 0) {
    console.log(`check-lint-integrity: ok (${files.length} files checked)`)
    return
  }
  for (const p of problems) console.error(p)
  console.error(
    `\ncheck-lint-integrity: ${problems.length} problem(s). A quality gate was weakened. Restore it; do not edit this script.`
  )
  process.exit(1)
}

main().catch((err) => {
  console.error(
    `check-lint-integrity: could not run (${err instanceof Error ? err.message : String(err)})`
  )
  process.exit(2)
})
