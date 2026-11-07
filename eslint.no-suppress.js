// eslint.no-suppress.js
// Makes suppression comments useless and illegal, and closes the usual workarounds
// (`any`, `!`, `as unknown as X`). See docs/03-standards/linting-and-formatting.md ("No suppression").
// Rule and option names verified against typescript-eslint 8.72, @eslint-community/eslint-plugin-eslint-comments 4.8.1,
// ESLint 10.13 (installed package source + a fixture run). Re-check when upgrading any of them.
//
// Needs: typescript-eslint and @eslint-community/eslint-plugin-eslint-comments as direct devDependencies (the scaffold
// does not list them; `install.sh` adds them at the tested versions).
// Usage (flat config), put it LAST so nothing re-enables what it turns off:
//   import { noSuppressConfig } from './eslint.no-suppress.js'
//   export default [ /* ...other configs */, ...noSuppressConfig ]
//
// Generated files (src/routeTree.gen.ts has `/* eslint-disable */` and `// @ts-nocheck` as its default header)
// are excluded by `ignores` in the app's own config, never by comments. TanStack's docs say to ignore that file.
import comments from "@eslint-community/eslint-plugin-eslint-comments"
import tseslint from "typescript-eslint"

const SOURCE_FILES = ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"]
const TS_FILES = ["**/*.{ts,tsx,mts,cts}"]

export const noSuppressConfig = [
  {
    name: "no-suppress/inline-config-off",
    // Layer 1: ESLint ignores every `eslint-disable*`, `eslint-enable`, `/* eslint rule: ... */`, `/* global */` comment.
    // Even if an agent writes one, the error it tried to hide stays. ESLint also reports the ignored comment.
    linterOptions: { noInlineConfig: true },
  },
  {
    name: "no-suppress/directives",
    files: SOURCE_FILES,
    plugins: {
      "@eslint-community/eslint-comments": comments,
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      // Layer 2: any ESLint directive comment is an error with a clear message (not only a silent no-op).
      "@eslint-community/eslint-comments/no-use": ["error", { allow: [] }],

      // Layer 3: TypeScript directives, in TS and JS files. All three banned. `ts-check` is a harmless pragma.
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": true,
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-check": false,
        },
      ],
    },
  },
  {
    name: "no-suppress/typescript",
    files: TS_FILES,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        // `project: true` is what `@tanstack/eslint-config` already sets (verified in its dist, v0.4.0, and by a run on a
        // TanStack CLI scaffold). typescript-eslint throws when `project` and `projectService` are both set, so do not
        // switch this to `projectService` unless the app's own config does too.
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Layer 4: the workarounds that replace comments once comments are banned.
      "@typescript-eslint/no-explicit-any": [
        "error",
        { ignoreRestArgs: false },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      // Narrowing casts (`unknown as User`, `Base as User`) are errors. `as const`, `satisfies`, and upcasts stay legal.
      "@typescript-eslint/no-unsafe-type-assertion": "error",
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "as", objectLiteralTypeAssertions: "never" },
      ],
      // Double assertion (`x as unknown as T`) is a cast that silences the compiler. No built-in rule, so a selector.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'TSAsExpression > TSAsExpression.expression[typeAnnotation.type="TSUnknownKeyword"]',
          message:
            "Double assertion (`as unknown as T`) is banned. Validate with Zod or write a type guard.",
        },
        {
          selector:
            'TSAsExpression > TSAsExpression.expression[typeAnnotation.type="TSAnyKeyword"]',
          message:
            "Double assertion through `any` is banned. Validate with Zod or write a type guard.",
        },
        {
          selector: "TSTypeAssertion",
          message:
            "Angle-bracket assertions (`<T>x`) are banned. Validate with Zod or write a type guard.",
        },
        // No classes in app code (docs/03-standards/typescript.md). Errors are plain objects: Start serializes a
        // thrown error as its message only, so a class loses `code` and `details` between server and client.
        {
          selector: "ClassDeclaration",
          message:
            "Classes are banned. Use functions and plain objects; errors are `AppError` objects (docs/03-standards/error-handling.md).",
        },
        {
          selector: "ClassExpression",
          message:
            "Classes are banned. Use functions and plain objects; errors are `AppError` objects (docs/03-standards/error-handling.md).",
        },
        // Start's guide: a dynamic import of a server function "can cause bundler issues"; a static import is safe
        // (docs/04-stack/tanstack-start.md, rule 2). Here and not in eslint.code-rules.js: a later block would replace
        // these selectors. A path built at run time (template literal, variable) is not matched; review catches that.
        {
          selector: "ImportExpression[source.value=/\\.functions(\\.tsx?)?$/]",
          message:
            "Import a server function (`*.functions.ts`) statically, never with `import()` (docs/04-stack/tanstack-start.md, rule 2).",
        },
      ],

      // Implicit `any` from untyped sources (JSON.parse, catch variables, untyped libs) is `any` too.
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-argument": "error",

      // Deprecated APIs still compile; this is the only automatic guard (docs/04-stack/tanstack-query.md).
      "@typescript-eslint/no-deprecated": "error",
    },
  },
]
