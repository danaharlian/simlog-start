// eslint.code-rules.js
// Repo rules that no other gate catches: each of these passed lint and `tsc` before this file existed (ADR 0021).
// Rule and option names checked by a fixture run with typescript-eslint 8.72.1, @tanstack/eslint-config 0.4.0,
// ESLint 10.13. Re-check when upgrading any of them.
//
// `import/no-default-export` uses the `import` plugin that @tanstack/eslint-config registers, so this file must come
// after that config. `no-restricted-syntax` is not used here: a later block would replace the selectors in
// eslint.no-suppress.js.
// Usage (flat config), before noSuppressConfig:
//   import { codeRulesConfig } from './eslint.code-rules.js'
//   export default [ /* ...other configs */, ...codeRulesConfig, ...noSuppressConfig ]

const APP_TS_FILES = ['src/**/*.{ts,tsx}']

// Size and magic-number limits (docs/02-architecture/design-principles.md, "Complexity limits"; ADR 0034).
// Tests and generated shadcn primitives are exempt; our own `app-*` files in shared/ui are not.
const LIMITED_IGNORES = [
  'src/**/__tests__/**',
  'src/**/*.test.{ts,tsx}',
  'src/shared/ui/**/*',
  '!src/shared/ui/**/app-*.{ts,tsx}',
]
// Lines of code: blank lines and comments do not count, so a why-comment never pushes a file over.
const CODE_LINES = { skipBlankLines: true, skipComments: true }

export const codeRulesConfig = [
  {
    name: 'code-rules/exhaustive-switch',
    files: APP_TS_FILES,
    rules: {
      // A catch-all `default` does not count, so a new variant fails here and not in production.
      // A `switch` on a plain string may still use `default`: its values cannot be listed.
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        {
          considerDefaultExhaustiveForUnions: false,
          requireDefaultForNonUnion: false,
        },
      ],
    },
  },
  {
    name: 'code-rules/named-exports',
    // Routes and framework entry points stay out of scope: `src/server.ts` must export a default.
    files: ['src/features/**/*.{ts,tsx}', 'src/shared/**/*.{ts,tsx}'],
    rules: { 'import/no-default-export': 'error' },
  },
  {
    name: 'code-rules/env-modules',
    files: APP_TS_FILES,
    ignores: ['src/shared/config/env.server.ts', 'src/shared/config/env.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'Read env through shared/config/env.server.ts or env.ts (docs/03-standards/environment.md).',
        },
      ],
    },
  },
  {
    name: 'code-rules/server-logging',
    // Only code that never reaches the browser: a component also runs on the client (docs/03-standards/logging.md).
    files: [
      'src/features/*/server/**',
      'src/shared/server/**',
      'src/routes/api/**',
      'src/**/*.server.{ts,tsx}',
    ],
    rules: { 'no-console': 'error' },
  },
  {
    name: 'code-rules/size-limits',
    files: APP_TS_FILES,
    ignores: LIMITED_IGNORES,
    rules: {
      'max-lines': ['error', { max: 300, ...CODE_LINES }],
      'max-lines-per-function': ['error', { max: 50, ...CODE_LINES }],
      'max-depth': ['error', { max: 3 }],
      'max-params': ['error', { max: 4 }],
    },
  },
  {
    // A component is a function too, and components.md splits one over 200 lines. It replaces the 50 above.
    name: 'code-rules/component-size',
    files: ['src/**/*.tsx'],
    ignores: LIMITED_IGNORES,
    rules: {
      'max-lines-per-function': ['error', { max: 200, ...CODE_LINES }],
    },
  },
  {
    name: 'code-rules/no-magic-numbers',
    files: APP_TS_FILES,
    ignores: LIMITED_IGNORES,
    rules: {
      // A number other than -1, 0, or 1 gets a name in its owner (coding-standards.md, "One owner for each piece
      // of knowledge"). Object property values are not checked: `{ staleTime: 30_000 }` is already named by its key.
      'no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          enforceConst: true,
          detectObjects: false,
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreTypeIndexes: true,
        },
      ],
    },
  },
]
