// eslint.boundaries.js
// Enforces the feature-driven modular monolith (docs/02-architecture/modular-monolith.md).
// Verified on 2026-10-24 against eslint-plugin-boundaries 7.2.0 + ESLint 10.13 + typescript-eslint 8
// with a fixture project (see docs/03-standards/linting-and-formatting.md, "Boundary rules").
//
// Needs: eslint-plugin-boundaries, eslint-import-resolver-typescript (resolves the `@/*` alias).
// Usage (flat config):
//   import { boundariesConfig } from './eslint.boundaries.js'
//   export default [ /* ...other configs */, boundariesConfig ]
import boundaries from 'eslint-plugin-boundaries'

export const boundariesConfig = {
  files: ['src/**/*.{ts,tsx}'],
  plugins: { boundaries },
  settings: {
    // Lets the plugin resolve `@/features/...` to real files using tsconfig paths.
    'import/resolver': {
      typescript: { alwaysTryTypes: true, project: './tsconfig.json' },
    },

    // WHERE the boundaries are: each match is one "element".
    // partialMatch:false = the pattern is matched from the project root.
    'boundaries/elements': [
      {
        type: 'feature',
        pattern: 'src/features/*',
        partialMatch: false,
        capture: ['feature'],
      },
      { type: 'routes', pattern: 'src/routes', partialMatch: false },
      { type: 'shared', pattern: 'src/shared', partialMatch: false },
    ],

    // WHAT a file is inside a feature (categories can accumulate on one file).
    // A file that matches none of these gets no layer rules: keep new folders covered.
    'boundaries/files': [
      // Two public entry points: index.ts is client-safe; index.server.ts is server-only
      // (the bundler denies any client import of `*.server.*` files at build time).
      { category: 'shared-db', pattern: 'src/shared/db/**' },
      // Code that can reach the client bundle and names no other category (ADR 0022).
      {
        category: 'client-reachable',
        pattern: [
          'src/shared/ui/**',
          'src/shared/lib/**',
          'src/shared/hooks/**',
          'src/features/*/schemas.ts',
        ],
      },
      { category: 'public', pattern: 'src/features/*/index.ts' },
      { category: 'public-server', pattern: 'src/features/*/index.server.ts' },
      {
        category: 'ui',
        pattern: [
          'src/features/*/components/**',
          'src/features/*/hooks/**',
          'src/features/*/queries.ts',
        ],
      },
      { category: 'function', pattern: 'src/features/*/server/*.functions.ts' },
      // Event handlers (docs/decisions/0009-cross-feature-communication.md): transport like a server function.
      { category: 'listener', pattern: 'src/features/*/server/*.listeners.ts' },
      { category: 'service', pattern: 'src/features/*/server/*.service.ts' },
      {
        category: 'repository',
        pattern: 'src/features/*/server/*.repository.ts',
      },
      // Pure business rules (docs/decisions/0013-pure-business-rules-file.md): no data, no transport, server-only.
      { category: 'rules', pattern: 'src/features/*/server/*.rules.ts' },
      { category: 'db', pattern: 'src/features/*/db/**' },
      // Error codes and types a feature declares (docs/03-standards/error-handling.md). Pure: no server, db, or UI.
      { category: 'errors', pattern: 'src/features/*/errors.ts' },
      // Event definitions (name and Zod payload schema): pure and client-safe, like errors.ts.
      { category: 'events', pattern: 'src/features/*/events.ts' },
      // Server routes for external callers (docs/decisions/0012-server-routes-reach-services.md): transport with no user session.
      { category: 'route-handler', pattern: 'src/routes/api/**' },
      // The only parts of shared/ a rules file may use: they load no db client, env, or logger.
      {
        category: 'shared-pure',
        pattern: ['src/shared/lib/**', 'src/shared/errors/**'],
      },
      { category: 'test', pattern: ['**/*.test.{ts,tsx}', '**/__tests__/**'] },
    ],
  },
  rules: {
    'boundaries/dependencies': [
      2,
      {
        // Anything not explicitly allowed below is an error.
        default: 'disallow',
        // Required for the layer rules: by default same-element imports are NOT checked.
        checkInternals: true,
        // Policies are evaluated in order; a LATER matching policy overrides an EARLIER one
        // (the layer "disallow" entries below override "allow internal" above).
        // External packages and Node core modules are not checked (checkAllOrigins defaults to false).
        policies: [
          // 1) Imports inside the same element are allowed...
          { allow: { dependency: { relationship: { to: 'internal' } } } },
          // 2) ...everyone may use shared/...
          { allow: { to: { element: { type: 'shared' } } } },
          // 3) ...routes may use other routes...
          {
            from: { element: { type: 'routes' } },
            allow: { to: { element: { type: 'routes' } } },
          },
          // 4) ...and routes and features may use ANOTHER feature only through its public entry points (index.ts, or index.server.ts from server-side code).
          {
            from: { element: { type: ['routes', 'feature'] } },
            allow: {
              to: {
                element: { type: 'feature' },
                file: { categories: 'public' },
              },
            },
          },
          // 5) ...and only server-side code (functions, services, listeners, src/routes/api) may use another feature's server entry.
          //    UI and page routes never may: it would put server code in the client bundle.
          {
            from: {
              file: {
                categories: {
                  anyOf: ['function', 'service', 'listener', 'route-handler'],
                },
              },
            },
            allow: {
              to: {
                element: { type: 'feature' },
                file: { categories: 'public-server' },
              },
            },
          },

          // ---- Layers inside a feature (checked because checkInternals is true) ----
          // UI must not reach server internals or tables.
          {
            from: { file: { categories: 'ui' } },
            disallow: {
              to: {
                file: {
                  categories: {
                    anyOf: ['service', 'repository', 'db', 'listener'],
                  },
                },
              },
            },
          },
          // Server functions and event listeners go through the service, never straight to repository/db/UI.
          {
            from: { file: { categories: { anyOf: ['function', 'listener'] } } },
            disallow: {
              to: {
                file: { categories: { anyOf: ['repository', 'db', 'ui'] } },
              },
            },
          },
          // Service and repository must not depend on UI.
          {
            from: {
              file: { categories: { anyOf: ['service', 'repository'] } },
            },
            disallow: { to: { file: { categories: 'ui' } } },
          },
          // Client-reachable code and page routes never reach the database, not even the shared client
          // (ADR 0021, ADR 0022). Later policies override earlier ones, so the route-handler exception follows the routes rule.
          {
            from: {
              file: {
                categories: {
                  anyOf: ['ui', 'public', 'errors', 'events', 'client-reachable'],
                },
              },
            },
            disallow: { to: { file: { categories: 'shared-db' } } },
          },
          {
            from: { element: { type: 'routes' } },
            disallow: { to: { file: { categories: 'shared-db' } } },
          },
          {
            from: { file: { categories: 'route-handler' } },
            allow: { to: { file: { categories: 'shared-db' } } },
          },
          // Service holds business rules: it reaches data only through repositories (never the feature's
          // tables, also not as `import type`), and never calls upward into transport (server functions).
          // The shared db client stays allowed because services own transactions (modular-monolith.md).
          {
            from: { file: { categories: 'service' } },
            disallow: {
              to: {
                file: { categories: { anyOf: ['db', 'function', 'listener'] } },
              },
            },
          },
          // Repository must not call upward.
          {
            from: { file: { categories: 'repository' } },
            disallow: {
              to: {
                file: {
                  categories: { anyOf: ['service', 'function', 'listener'] },
                },
              },
            },
          },
          // errors.ts and events.ts are pure declarations so UI, service and functions can all import them safely.
          {
            from: { file: { categories: { anyOf: ['errors', 'events'] } } },
            disallow: {
              to: {
                file: {
                  categories: {
                    anyOf: [
                      'service',
                      'repository',
                      'function',
                      'listener',
                      'db',
                      'ui',
                      'public',
                      'public-server',
                    ],
                  },
                },
              },
            },
          },
          // Rules files stay pure: nothing that holds data or runs I/O, and of shared/ only shared-pure.
          // Packages and node: modules are not checked here, so review checks those.
          {
            from: { file: { categories: 'rules' } },
            disallow: {
              to: {
                file: {
                  categories: {
                    anyOf: [
                      'service',
                      'repository',
                      'function',
                      'listener',
                      'db',
                      'ui',
                      'public',
                      'public-server',
                    ],
                  },
                },
              },
            },
          },
          {
            from: { file: { categories: 'rules' } },
            disallow: { to: { element: { type: 'shared' } } },
          },
          {
            from: { file: { categories: 'rules' } },
            allow: {
              to: {
                element: { type: 'shared' },
                file: { categories: 'shared-pure' },
              },
            },
          },
          // Only the service, index.server.ts, and tests use a rules file. UI would ship it to the browser,
          // transport would skip the service, and a repository holds no rules.
          {
            from: {
              file: {
                categories: {
                  anyOf: [
                    'ui',
                    'function',
                    'listener',
                    'repository',
                    'public',
                    'errors',
                    'events',
                  ],
                },
              },
            },
            disallow: { to: { file: { categories: 'rules' } } },
          },
          // A feature must not import its own public entry points (barrel cycle).
          {
            from: { element: { type: 'feature' } },
            disallow: {
              to: {
                file: { categories: { anyOf: ['public', 'public-server'] } },
              },
              dependency: { relationship: { to: 'internal' } },
            },
          },
        ],
      },
    ],
  },
}
