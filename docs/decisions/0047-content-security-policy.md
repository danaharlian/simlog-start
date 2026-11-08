# 0047 Content Security Policy and security headers for the app (closes open decision AC)

- Status: proposed
- Date: 2026-11-08
- Deciders: pending (Software Architect)

## Context

- **QA found no security headers.** QA round 1 of `specs/auth` (`09-qa.md`, D1, High) shows that the production build sends none of the headers `docs/03-standards/security.md` rule 9 requires. The checks:
  - `vite build`, then `vite preview`, then `curl -D -` on `/login`.
  - The only header present is `cache-control: private, no-store`.
- **The pattern is known, but not on a real app.** `docs/04-stack/tanstack-start.md`, "Security headers" (ADR 0015), observed on 2026-10-31 that:
  - a request middleware sets the headers;
  - a nonce passed through `ssr.nonce` keeps the router's inline scripts running;
  - `script-src 'self'` without a nonce leaves a blank page with status 200.

  It did not check component-library inline styles, fonts, images, or the dev server. Open decision AC covers exactly that gap.
- **What the app loads**, checked in the source and in `dist/client` on 2026-11-08:
  - fonts bundled into `/assets/*.woff2` (`@fontsource-variable/*`);
  - one image, `/bdh.avif`;
  - no external origin anywhere in `src/`;
  - **inline `style` attributes** from the generated `shared/ui/sidebar.tsx` (three places, the `--sidebar-width` custom properties). They are in the SSR HTML. An attribute cannot carry a nonce.
- **Creating `src/start.ts` turns off Start's automatic CSRF middleware** for server functions (`security.md` rule 2; `tanstack-start.md`, "CSRF", observed). The new file must add `createCsrfMiddleware` itself.

## Decision

A request middleware in `src/shared/server/security-headers.ts`, first in `requestMiddleware` in `src/start.ts`, next to an explicit `createCsrfMiddleware` with the filter `tanstack-start.md` documents. It sets these headers on every response:

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'nonce-<per request>'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `X-Frame-Options` | `DENY` (for browsers that ignore `frame-ancestors`) |

The nonce reaches the router through `ssr.nonce` in `src/router.tsx`. Each part of the policy has a reason:
- **`style-src 'unsafe-inline'`:** the sidebar's style attributes need it. Inline styles cannot run script, and scripts stay nonce-only.
- **`img-src data:`:** covers small inline images from CSS or icons.
- **HSTS:** set where TLS ends, at the proxy or the platform, not in the app. It is a line in the release checklist until hosting is documented.

A new external origin (analytics, a CDN, fonts) is added to the policy deliberately, in the PR that brings it, with a note here.

## Consequences

- **Gains:** `security.md` rule 9 is met, except HSTS, which is a release item. Inline script injection is blocked by the nonce. Framing is blocked by `frame-ancestors 'none'` and `X-Frame-Options`.
- **Risk: `'unsafe-inline'` for styles** allows injected CSS: visual changes or data exfiltration through selectors. That is limited, because the app renders no untrusted HTML, and React escapes text.
- **Risk: dev server breakage.** The policy may block the dev server's own scripts (HMR, React Refresh). The build task checks this, and if it happens, says so here before merging, with the narrowest fix.
- **Risk: static files outside the app.** Files served by a proxy do not pass through the middleware (`tanstack-start.md`). The release checklist covers this.
- **Follow-up:**
  - update `tanstack-start.md` "Security headers" and "CSRF" with what T8 observes;
  - move decision AC from the open list to this ADR in `docs/decisions/README.md`;
  - add the release item for HSTS.

## Not verified

- **The policy itself.** Not run against this app. T8 checks it in the production build, the dev server, and the owner's browser walk in QA round 2, which must show no CSP violation in the console.
- **Base UI positioning styles.** Whether popovers, menus, and dialogs set them through the CSSOM (allowed under any CSP) or through attributes. **Inferred**: the CSSOM, because they are computed on the client.
- **API names and types.** The type for passing the nonce in the request context (`getGlobalStartContext`, `Register`) is checked in the installed `@tanstack/react-start` types during T8.

## Alternatives considered

| Option | What it gives | Why not |
|---|---|---|
| Nonce for styles too, no `'unsafe-inline'` | Stricter CSS | Style attributes cannot carry a nonce. It would mean changing the generated sidebar primitive, which `tailwind-shadcn.md` forbids for one feature |
| `script-src 'self'` without a nonce | Simpler | Blank page (observed, ADR 0015) |
| HSTS from the app | Header present even without a proxy | Over plain HTTP it is ignored, and behind a proxy the proxy owns TLS. Duplicates the platform's job |
| `Content-Security-Policy-Report-Only` first | No risk of breaking pages | Leaves the app unprotected at release. Kept as a fallback if the browser walk finds a violation that cannot be fixed in T8 |

## Verification

`docs/03-standards/security.md` rules 2 and 9; `docs/04-stack/tanstack-start.md`, "Security headers" and "CSRF" (observed 2026-10-31, ADR 0015). `src/shared/ui/sidebar.tsx` lines 131, 187, 622. `dist/client/assets/*.css` (font URLs only). `specs/auth/09-qa.md` D1. Read 2026-11-08.
