# Task Breakdown: Auth (register, login, logout, aktivasi akun oleh superadmin)

- Slug: `auth` (file `07-tasks.md`)
- Feature Spec: `06-feature-spec.md`
- Tier: L
- Status: approved
- Gate: Tasks gate
- Owner: Dana Harliansyah
- Author: AI agent
- Date: 2026-11-08
- Approved by: Dana Harliansyah (Tech Lead), 2026-11-08, via chat

Tasks gate digabung dengan Spec gate (`06-feature-spec.md`, header `Tasks gate`). Semua instalasi, generate, dan pengecekan error terjadi di task, bukan di fase sebelumnya (keputusan owner, 2026-11-08).

## Overview

| ID | Task (user-visible outcome) | Risk (and why) | Depends on | AC and NFR covered | Estimate | PR | Status |
|---|---|---|---|---|---|---|---|
| T1 | Akun yang dibuat lewat `/api/auth/sign-up/email` tersimpan di PostgreSQL, dan `/status` menampilkan "menunggu persetujuan" dari database | high: Better Auth 1.7.18 + Drizzle 1.0.0-rc.5 + `pg` + Start + Prisma Postgres belum pernah jalan bersama; edit ADR 0043; ADR 0044 | none | AC1 (sisi server), AC4, AC16 (pembacaan status segar) | | [#2](https://github.com/danaharlian/simlog-start/pull/2) | merged |
| T2 | Pengunjung bisa register dan login lewat form `login-04` dengan username atau email, logout dari `/status`, dan pengalihan tamu dan status berjalan | medium: satu kolom login dua endpoint; pesan error yang sama; rate limit; enumerasi | T1 | AC1 (UI), AC2, AC3, AC5, AC6 (dari `/status`), AC7, AC9, AC11, AC21, AC24, AC25, AC26, NFR1, NFR2, NFR5 | | [#3](https://github.com/danaharlian/simlog-start/pull/3) | merged |
| T3 | Pengguna aktif masuk ke dashboard `/` dengan sidebar `sidebar-07`; tanpa sesi ke `/login`, belum aktif ke `/status` | low: UI shell dan pengalihan; `resolveAccessRedirect` sudah ada | T2 | AC6 (dari dashboard), AC8, AC10 (untuk `/`), AC12 (role `user`) | | [#4](https://github.com/danaharlian/simlog-start/pull/4) | merged |
| T4 | Superadmin melihat daftar akun di `/users` dengan saringan status; pengguna biasa ditolak | medium: otorisasi pertama di server function; DTO tanpa kolom sensitif | T3 | AC10 (untuk `/users`), AC12 (menu superadmin), AC13, AC14, NFR3, NFR6 | | [#5](https://github.com/danaharlian/simlog-start/pull/5) | merged |
| T5 | Superadmin mengaktifkan, menolak, menonaktifkan, dan mengaktifkan kembali akun; aksi bersamaan tidak saling menimpa | high: transaksi dengan `.for('update')`, aturan transisi, larangan diri sendiri | T4 (butuh tabel `/users` untuk aksi baris) | AC15, AC16, AC18 (status), AC20 (status), NFR4 | | [#6](https://github.com/danaharlian/simlog-start/pull/6) | merged |
| T6 | Superadmin mengangkat dan mencabut superadmin; minimal satu superadmin aktif tetap ada | high: invariant R20 di bawah konkurensi | T5 (memakai transaksi dan dialog dari T5) | AC17, AC18 (role), AC19, AC20 (saling cabut), NFR4 | | [#7](https://github.com/danaharlian/simlog-start/pull/7) | in review |
| T7 | Pengembang mengisi database dev dengan `pnpm db:seed` | low: `tsx` dengan alias `@/` (ADR 0042) | T6 (seed mengubah status dan role lewat service dari T5 dan T6) | AC22, AC23 | | | todo |

Urutan mengikuti risiko, kecuali T5 dan T6 yang menunggu T4 karena aksinya ada di baris tabel `/users`, dan T3 yang menunggu T2 karena memakai `useSignOut` dan `resolveAccessRedirect`.

**Coverage check:**
- PRD: R1–R25, NFR1–NFR6, US1–US8 masuk ke task di tabel di atas. M1 dan M2 bergantung pada `status_changed_at` (T1 membuat kolom, T5 mengisinya).
- Export `05-architecture-review.md` section 3: `currentUserQueryOptions`, `authScope`, `CurrentUser`, `AccountStatus`, `Role`, `authHandler`, `AccountStatusView` (T1); `LoginForm`, `RegisterForm`, `useSignOut`, `resolveAccessRedirect` (T2); `UserManagementView` (T4); `seedAccounts` (T7).
- `06-feature-spec.md` section 11: setiap baris dipetakan di detail task di bawah.
- `06-feature-spec.md` section 3: setiap baris ada di salah satu file list.
- Not covered: none.

## Task details

### T1: Register tersimpan di PostgreSQL dan `/status` membaca status dari database
- **Feature Spec rows delivered:** layer breakdown: Config (`package.json` dependency dan script `db:*`, `drizzle.config.ts`, `.env.example`, `src/router.tsx`), Shared (`env.server.ts`, `shared/db/*`, `shared/errors`, `logger.server.ts`, `with-error-boundary.ts`), Table, Schemas (`accountStatuses`, `roles`, `currentUserSchema`), Errors (`USERNAME_REQUIRED`), Auth config, Middleware (`withSession`), Repository (`findCurrentUser`), Service (`getCurrentUserDto`), Server function (`getCurrentUser`), Server route handler, Query options (`authScope`, `authKeys`, `currentUserQueryOptions`), Components (`account-status-view.tsx`, tanpa tombol), Routes (`_status.tsx` tanpa guard penuh, `_status/status.tsx`, `api/auth/$.ts`), Migration, Public API dan README, Docs. Test strategy: AC1 (server), AC4, AC16 (sebagian).
- **Files this task may change:**

  | File | Create / modify |
  |---|---|
  | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` (`allowBuilds` bila perlu) | modify |
  | `drizzle.config.ts`, `vitest.config.ts`, `.env.example` | create |
  | `.gitignore` (tambah `!.env.example`, karena `.env*` mengabaikannya) | modify |
  | `src/router.tsx` | modify |
  | `src/shared/config/env.server.ts` | create |
  | `src/shared/db/client.ts`, `columns.ts`, `errors.ts` | create |
  | `src/shared/errors/index.ts` | create |
  | `src/shared/server/logger.server.ts`, `with-error-boundary.ts` | create |
  | `src/features/auth/db/schema.ts`, `schemas.ts`, `errors.ts`, `queries.ts`, `index.ts`, `index.server.ts`, `README.md` | create |
  | `src/features/auth/server/auth.repository.ts`, `session.service.ts`, `session.functions.ts`, `accounts.repository.ts`, `accounts.service.ts`, `accounts.functions.ts` | create |
  | `src/features/auth/components/account-status-view.tsx` | create |
  | `src/routes/_status.tsx`, `src/routes/_status/status.tsx`, `src/routes/api/auth/$.ts` | create |
  | `src/routeTree.gen.ts` | generated |
  | `drizzle/<timestamp>_add-auth-tables/` | create (generated) |
  | `docs/04-stack/better-auth.md` (rule 4, 5), `docs/05-agent-tooling/skills.md` (baris middleware), `docs/04-stack/versions.md`, `docs/03-standards/environment.md`, `docs/03-standards/testing.md` (rule 1) | modify |

- **Tests written first:**
  - Asumsi yang belum dibuktikan kode (ADR 0037, point 5):
    - integrasi Better Auth + Drizzle RC + `pg` + Start (`02-research.md` section 5) → `sign-up.test.ts`: "register lewat auth.handler menyimpan baris di users, accounts, dan sessions"
    - output CLI dengan `usePlural` dan `generateId: "uuid"` bisa di-generate dan di-migrate (ADR 0043) → output `pnpm db:generate` dan `pnpm db:migrate:test` di PR; `sign-up.test.ts`: "id pengguna baru berbentuk uuid"
    - Better Auth menulis string ke kolom enum, dan `input: false` mengisi default (ADR 0038, 0043) → `sign-up.test.ts`: "akun baru berstatus pending dan berrole user"
    - `timestamptz` terbaca benar (ADR 0043) → `sign-up.test.ts`: "createdAt akun baru berada dalam satu menit dari waktu tes"
    - bentuk `ctx.path` dan `ctx.body` di `hooks.before` (spec section 13) → `sign-up.test.ts`: "register tanpa username ditolak dengan AUTH_USERNAME_REQUIRED"
    - validator username menolak `@`, dasar satu kolom login (`02-research.md` Q6, Inferred) → `sign-up.test.ts`: "username yang berisi @ ditolak INVALID_USERNAME"
    - `getSession` lewat `getRequestHeaders` membaca status segar karena cookie cache mati (D10) → `accounts.service.test.ts`: "getCurrentUserDto melihat status yang diubah langsung di database"
    - `test.env` Vitest berlaku sebelum `env.server.ts` dibaca (ADR 0044) → `env.test.ts`: "serverEnv.DATABASE_URL adalah TEST_DATABASE_URL"
    - `pg` tersambung ke Prisma Postgres dengan `sslmode=verify-full` (`02-research.md` Q12) → output `pnpm db:migrate:test` di PR
  - AC4 → `sign-up.test.ts`: "status dan role di body register diabaikan".
  - AC1 (server) → `sign-up.test.ts`: "register membuat akun pending role user dengan username huruf kecil dan sesi".
  - Exempt: `account-status-view.tsx` (layout), config.
- **Read first:** skill `build-task`, `new-feature`, `add-db-table`, `add-server-function`, `add-server-route`, `change-dependency`; `docs/04-stack/better-auth.md`, `drizzle-postgres.md`, `tanstack-start.md`, `tanstack-query.md`; `docs/03-standards/environment.md`, `database.md`, `testing.md`, `logging.md`; ADR 0038–0041, 0043–0045.
- **Migration · env · ADR:** migration `add-auth-tables` (dev lewat `pnpm db:migrate`, test lewat `pnpm db:migrate:test`); env `DATABASE_URL`, `TEST_DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `LOG_LEVEL` di `.env.example` (owner mengisi `.env`); ADR 0038–0041, 0043, 0044, 0045 (`@tanstack/react-query` dan `@tanstack/react-router-ssr-query` dipasang di sini karena `currentUserQueryOptions` memakai Query).
- **Public API or events added:** `currentUserQueryOptions`, `authScope`, `AccountStatusView`, `CurrentUser`, `AccountStatus`, `Role` (`index.ts`); `authHandler` (`index.server.ts`).
- **Done when:** semua tes di atas lulus terhadap database test; `/status` di dev menampilkan "menunggu persetujuan" untuk akun yang dibuat dengan `curl` ke `/api/auth/sign-up/email`; README fitur memuat daftar edit terhadap output CLI (ADR 0040, 0043); belum ada tautan dari UI. Jika satu asumsi gagal, build berhenti dan spec berubah lewat change log-nya.

### T2: Register, login, logout, dan pengalihan tamu
- **Feature Spec rows delivered:** Shared UI primitives `card`, `input`, `label`, `field`, `separator`, `alert`; Schemas (`usernameSchema`, `passwordSchema`, `registerSchema`, `loginSchema`); Hooks (`auth-client.ts`, `use-sign-in.ts`, `use-sign-up.ts`, `use-sign-out.ts`); Components (`login-form.tsx`, `register-form.tsx`, `auth-split-layout.tsx`, `access-redirect.ts`, `auth-messages.ts`, `account-status-view.tsx` lengkap); Routes (`_guest.tsx`, `_guest/login.tsx`, `_guest/register.tsx`, guard `_status.tsx`); dependency `@tanstack/react-form`. Test strategy: AC1 (UI), AC2, AC3, AC5, AC6, AC7, AC8–AC11 (unit `access-redirect`), AC21, AC24, AC25, AC26, NFR1, NFR2, NFR5.
- **Files this task may change:**

  | File | Create / modify |
  |---|---|
  | `package.json`, `pnpm-lock.yaml` | modify |
  | `src/shared/ui/card.tsx`, `input.tsx`, `label.tsx`, `field.tsx`, `separator.tsx`, `alert.tsx` | create (CLI) |
  | `shadcn-primitives.lock.json` | modify hanya lewat `node scripts/check-ui.mjs --accept <file>` untuk tiap primitive baru dari CLI (`tailwind-shadcn.md`); bila hook memblokirnya, berhenti dan minta person menjalankannya |
  | `src/features/auth/schemas.ts`, `index.ts`, `README.md` | modify |
  | `src/features/auth/hooks/auth-client.ts`, `use-sign-in.ts`, `use-sign-up.ts`, `use-sign-out.ts` | create |
  | `src/features/auth/components/login-form.tsx`, `register-form.tsx`, `auth-split-layout.tsx`, `access-redirect.ts`, `auth-messages.ts` | create |
  | `src/features/auth/components/account-status-view.tsx` | modify |
  | `src/routes/_guest.tsx`, `_guest/login.tsx`, `_guest/register.tsx` | create |
  | `src/routes/_status.tsx` | modify |
  | `src/routeTree.gen.ts` | generated |
  | `docs/04-stack/better-auth.md` (rule 2), `docs/04-stack/versions.md` | modify |

- **Tests written first:**
  - AC2 → `schemas.test.ts`: "registerSchema menolak username 2 dan 31 karakter, karakter lain, password 7 karakter, konfirmasi berbeda".
  - AC3 → `sign-up.test.ts`: "register dengan email atau username beda huruf ditolak, jumlah akun tetap"; termasuk `TODO(verify)` spec section 4: "dua register bersamaan dengan email sama: satu berhasil" dan kode yang diterima yang lain.
  - AC5 → `sign-in.test.ts`: "login dengan username huruf besar dan email huruf besar berhasil".
  - AC6 → `sign-in.test.ts`: "sign-out menghapus sesi".
  - AC7 → `sign-in.test.ts`: "password salah dan username tak dikenal tidak membuat sesi"; `auth-messages.test.ts`: "dua kode login gagal memetakan ke teks yang sama".
  - AC8, AC9, AC10, AC11 → `access-redirect.test.ts`: setiap baris tabel pengalihan spec section 1.
  - AC21, NFR1 → `sign-in.test.ts`: "permintaan keempat dalam 10 detik ke /sign-in/username mendapat 429".
  - AC24, NFR2 → `sign-in.test.ts`: "log yang ditangkap tidak memuat password; accounts.password bukan teks asli".
  - Exempt: layout `AuthSplitLayout` dan styling form. AC25, AC26, NFR5: manual check di QA.
- **Read first:** skill `build-task`, `add-route`, `add-ui-component`, `shadcn`, `email-and-password-best-practices`; `docs/04-stack/tanstack-form.md`, `zod.md`, `tanstack-router.md`, `tailwind-shadcn.md`; `docs/03-standards/components.md`.
- **Migration · env · ADR:** no · no · ADR 0039.
- **Public API or events added:** `LoginForm`, `RegisterForm`, `useSignOut`, `resolveAccessRedirect` (`index.ts`).
- **Done when:** tes di atas lulus; register dan login bisa dicoba di dev lewat URL `/register` dan `/login`; tidak ada tombol OAuth, "Forgot password", atau nilai Tailwind arbitrary (`check:ui`); setelah login, `/` masih halaman scaffold sampai T3.

### T3: Dashboard dan shell `sidebar-07`
- **Feature Spec rows delivered:** Shared UI primitives `sidebar`, `sheet`, `tooltip`, `skeleton`, `breadcrumb`, `dropdown-menu`, `avatar`, `collapsible`, `shared/hooks/use-mobile.ts`; `shared/ui/app-shell.tsx`; Routes (`_app.tsx`, `_app/index.tsx`, hapus `src/routes/index.tsx`). Test strategy: AC6 (dashboard), AC8, AC10 (untuk `/`), AC12 (role `user`).
- **Files this task may change:**

  | File | Create / modify |
  |---|---|
  | `src/shared/ui/sidebar.tsx`, `sheet.tsx`, `tooltip.tsx`, `skeleton.tsx`, `breadcrumb.tsx`, `dropdown-menu.tsx`, `avatar.tsx`, `collapsible.tsx` | create (CLI) |
  | `src/shared/hooks/use-mobile.ts` | create (CLI) |
  | `shadcn-primitives.lock.json` | modify lewat `check-ui.mjs --accept <file>` (sama dengan T2); `app-shell.tsx` tidak butuh entri (`app-*`) |
  | `src/shared/ui/app-shell.tsx` | create |
  | `src/routes/_app.tsx`, `src/routes/_app/index.tsx` | create |
  | `src/routes/index.tsx` | delete |
  | `src/routeTree.gen.ts` | generated |

- **Tests written first:** pengalihan sudah dites di T2 (`access-redirect.test.ts`). Exempt: `AppShell` dan Beranda (layout). AC6 (dashboard), AC8, AC10, AC12: manual check di QA, dan dicoba di dev sebelum PR.
- **Read first:** skill `build-task`, `add-route`, `add-ui-component`, `shadcn`; `docs/04-stack/tailwind-shadcn.md`, `tanstack-router.md`; `docs/03-standards/components.md`.
- **Migration · env · ADR:** no · no · none.
- **Public API or events added:** none.
- **Done when:** pengguna aktif berrole `user` melihat Beranda "Halo, {nama}" dengan sidebar yang bisa diciutkan ke ikon dan menu pengguna dengan Keluar; tanpa sesi `/` mengalihkan ke `/login`; pengguna `pending` dialihkan ke `/status`. Ini task yang membuat fitur terjangkau dari `/` (lihat Entry point visibility).

### T4: Daftar akun untuk superadmin
- **Feature Spec rows delivered:** Shared (`shared/lib/format.ts`); Shared UI primitives `table`, `badge`, `select`; Schemas (`listAccountsInputSchema`, `accountRowSchema`); Errors (`NOT_ACTIVE_SUPERADMIN`, `AUTH_REQUIRED`); Middleware (`requireActiveSuperadmin`); Repository (`listAccounts`); Service (`listAccountsForAdmin`); Server function (`listAccounts`); Query options (`accountsQueryOptions`); Components (`user-management-view.tsx`, `accounts-table.tsx`); Routes (`_app/users.tsx`); menu Manajemen pengguna di `_app.tsx`. Test strategy: AC13, AC14, NFR3, NFR6.
- **Files this task may change:**

  | File | Create / modify |
  |---|---|
  | `src/shared/lib/format.ts` | create |
  | `src/shared/ui/table.tsx`, `badge.tsx`, `select.tsx` | create (CLI) |
  | `shadcn-primitives.lock.json` | modify lewat `check-ui.mjs --accept <file>` (sama dengan T2) |
  | `src/features/auth/schemas.ts`, `errors.ts`, `queries.ts`, `index.ts`, `README.md` | modify |
  | `src/features/auth/server/session.functions.ts`, `session.service.ts`, `accounts.repository.ts`, `accounts.service.ts`, `accounts.functions.ts` | modify |
  | `src/features/auth/components/user-management-view.tsx`, `accounts-table.tsx` | create |
  | `src/routes/_app/users.tsx` | create |
  | `src/routes/_app.tsx` | modify |
  | `src/routeTree.gen.ts` | generated |

- **Tests written first:**
  - AC13, NFR3 → `accounts.functions.test.ts`: "listAccounts menolak pengguna aktif role user dan pengguna pending dengan NOT_ACTIVE_SUPERADMIN"; "tanpa sesi ditolak AUTH_REQUIRED".
  - AC14, NFR6 → `accounts.service.test.ts`: "listAccounts hanya mengembalikan kolom DTO", "saringan status", "urutan pending dulu dengan tie-breaker id", "saringan tanpa hasil mengembalikan items kosong".
  - Exempt: layout tabel. AC10 (`/users`), AC12 (menu superadmin): manual check di QA.
- **Read first:** skill `build-task`, `add-server-function`, `add-route`, `add-ui-component`; `docs/02-architecture/data-fetching.md`, `docs/04-stack/tanstack-table.md` (bila memakai Table), `docs/03-standards/api-conventions.md`, `security.md`.
- **Migration · env · ADR:** no · no · ADR 0041.
- **Public API or events added:** `UserManagementView` (`index.ts`).
- **Done when:** tes di atas lulus; menu Manajemen pengguna muncul hanya untuk superadmin; pengguna `user` yang membuka `/users` melihat "Anda tidak punya akses".

### T5: Perubahan status akun
- **Feature Spec rows delivered:** Shared (`shared/lib/query-scope.ts`); Shared UI primitive `alert-dialog`; Schemas (`changeAccountStatusSchema`); Errors (`ACCOUNT_STATUS_CHANGED`, `INVALID_STATUS_TRANSITION`, `CANNOT_CHANGE_SELF`, `ACCOUNT_NOT_FOUND`); Rules (`decideStatusChange`); Repository (`lockAccountsForChange`, `updateAccountStatus`, mengisi `status_changed_at`); Service (`changeAccountStatus`); Server function (`changeAccountStatus`); Hooks (`use-change-account-status.ts`); Components (`account-row-actions.tsx`, `confirm-account-action-dialog.tsx`). Test strategy: AC15, AC16, AC18 (status), AC20 (status), NFR4.
- **Files this task may change:**

  | File | Create / modify |
  |---|---|
  | `src/shared/lib/query-scope.ts` | create |
  | `src/shared/ui/alert-dialog.tsx` | create (CLI) |
  | `shadcn-primitives.lock.json` | modify lewat `check-ui.mjs --accept <file>` (sama dengan T2) |
  | `src/features/auth/schemas.ts`, `errors.ts`, `README.md` | modify |
  | `src/features/auth/server/accounts.rules.ts` | create |
  | `src/features/auth/server/accounts.repository.ts`, `accounts.service.ts`, `accounts.functions.ts` | modify |
  | `src/features/auth/hooks/use-change-account-status.ts` | create |
  | `src/features/auth/components/account-row-actions.tsx`, `confirm-account-action-dialog.tsx` | create |
  | `src/features/auth/components/user-management-view.tsx`, `accounts-table.tsx`, `auth-messages.ts` | modify |

- **Tests written first:**
  - AC15 → `accounts.rules.test.ts`: transisi sah (`pending`→`active`, `pending`→`rejected`, `active`→`inactive`, `rejected`→`active`, `inactive`→`active`) dan tidak sah; `accounts.service.test.ts`: "aktifkan, tolak, nonaktifkan, aktifkan kembali".
  - AC16 → `accounts.service.test.ts`: "getCurrentUserDto pengguna A melihat active, pengguna C melihat inactive tanpa login ulang".
  - AC18 (status) → `accounts.rules.test.ts`: "menonaktifkan diri sendiri ditolak CANNOT_CHANGE_SELF"; `accounts.service.test.ts`: "request langsung untuk diri sendiri tidak mengubah data".
  - AC20 (status), NFR4 → `accounts.concurrency.test.ts`: "aktifkan dan tolak bersamaan: satu ok, satu ACCOUNT_STATUS_CHANGED, status tersimpan sesuai yang menang".
  - Izin: AC13 diperluas → `accounts.functions.test.ts`: "changeAccountStatus menolak pengguna role user".
  - M1 → `accounts.service.test.ts`: "status_changed_at terisi saat keputusan".
  - Exempt: layout dialog dan dropdown.
- **Read first:** skill `build-task`, `add-server-function`; `docs/04-stack/drizzle-concurrency.md`, `drizzle-postgres.md` (Transactions); `docs/03-standards/error-handling.md`, `logging.md`; ADR 0013, 0032, 0038.
- **Migration · env · ADR:** no · no · ADR 0038.
- **Public API or events added:** none.
- **Done when:** tes di atas lulus, termasuk tes konkuren terhadap database test; log `auth.account_status_changed` berisi id aktor dan target tanpa email; komentar `Race:` di titik penguncian (`drizzle-concurrency.md` rule 6).

### T6: Angkat dan cabut superadmin
- **Feature Spec rows delivered:** Schemas (`changeAccountRoleSchema`); Errors (`ACCOUNT_ROLE_CHANGED`, `TARGET_NOT_ACTIVE`); Rules (`decideRoleChange`); Repository (`updateAccountRole`); Service (`changeAccountRole`); Server function (`changeAccountRole`); Hooks (`use-change-account-role.ts`); aksi role di `account-row-actions.tsx`. Test strategy: AC17, AC18 (role), AC19, AC20 (saling cabut), NFR4.
- **Files this task may change:**

  | File | Create / modify |
  |---|---|
  | `src/features/auth/schemas.ts`, `errors.ts`, `README.md` | modify |
  | `src/features/auth/server/accounts.rules.ts`, `accounts.repository.ts`, `accounts.service.ts`, `accounts.functions.ts` | modify |
  | `src/features/auth/hooks/use-change-account-role.ts` | create |
  | `src/features/auth/components/account-row-actions.tsx`, `confirm-account-action-dialog.tsx`, `auth-messages.ts` | modify |

- **Tests written first:**
  - AC17 → `accounts.service.test.ts`: "angkat pengguna aktif; mengangkat pengguna pending ditolak TARGET_NOT_ACTIVE".
  - AC18 (role) → `accounts.rules.test.ts`: "mencabut role diri sendiri ditolak CANNOT_CHANGE_SELF".
  - AC19 → `accounts.service.test.ts`: "superadmin yang dicabut tidak bisa mengaktifkan akun (NOT_ACTIVE_SUPERADMIN)".
  - AC20 (saling cabut), NFR4 → `accounts.concurrency.test.ts`: "dua superadmin saling mencabut role bersamaan: satu ok, satu NOT_ACTIVE_SUPERADMIN, tepat satu superadmin aktif".
  - Izin → `accounts.functions.test.ts`: "changeAccountRole menolak pengguna role user".
- **Read first:** skill `build-task`, `add-server-function`; `docs/04-stack/drizzle-concurrency.md`; ADR 0038.
- **Migration · env · ADR:** no · no · ADR 0038.
- **Public API or events added:** none.
- **Done when:** tes di atas lulus; log `auth.account_role_changed` tanpa email; baris superadmin yang sedang login tidak menampilkan Nonaktifkan dan Cabut superadmin.

### T7: Seed database dev
- **Feature Spec rows delivered:** Config (`package.json` script `db:seed`, dependency `tsx`; `.env.example` `SEED_*`); Service (`seed.service.ts`); `scripts/seed.ts`; Public API (`seedAccounts` di `index.server.ts`); Docs (`versions.md`, `environment.md`, `database.md` "Seeds"). Test strategy: AC22, AC23.
- **Files this task may change:**

  | File | Create / modify |
  |---|---|
  | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` (`allowBuilds` bila `tsx` punya install script) | modify |
  | `.env.example` | modify |
  | `scripts/seed.ts` | create |
  | `src/features/auth/server/seed.service.ts` | create |
  | `src/features/auth/index.server.ts`, `README.md` | modify |
  | `docs/04-stack/versions.md`, `docs/03-standards/environment.md`, `docs/03-standards/database.md` | modify |

- **Tests written first:**
  - AC22 → `seed.service.test.ts`: "seed dua kali: satu superadmin aktif dari konfigurasi, satu akun per status, tanpa duplikat; superadmin bisa login".
  - AC23 → `seed-guard.test.ts`: "seed menolak NODE_ENV=production dan SEED_ALLOW bukan true sebelum menulis".
- **Read first:** skill `build-task`, `change-dependency`; `docs/03-standards/database.md` "Seeds", `environment.md`; ADR 0042.
- **Migration · env · ADR:** no · `SEED_ALLOW`, `SEED_SUPERADMIN_NAME`, `SEED_SUPERADMIN_USERNAME`, `SEED_SUPERADMIN_EMAIL`, `SEED_SUPERADMIN_PASSWORD` · ADR 0042.
- **Public API or events added:** `seedAccounts` (`index.server.ts`).
- **Done when:** tes di atas lulus; `pnpm db:seed` di dev membuat akun dan superadmin bisa login; review memastikan `scripts/seed.ts` hanya mengimpor `@/features/auth/index.server` (lint boundary tidak memeriksa `scripts/`).

## Entry point visibility
T2 membuat `/login` dan `/register` bisa dibuka lewat URL, tanpa tautan. T3 mengganti `/` scaffold dengan dashboard, sehingga siapa pun yang membuka `/` diarahkan ke `/login`: di sinilah fitur terlihat. T4 menambah menu Manajemen pengguna untuk superadmin. Semua ini hanya sampai ke staging sampai Release gate.

## Risks and unknowns
- `TODO(verify)` dari spec yang dibuktikan di T1: kolom enum, `uuid` dengan `usePlural`, `timestamptz`, bentuk `hooks.before`, `test.env` Vitest, koneksi Prisma Postgres. Owner: AI agent di T1, dilaporkan ke Dana Harliansyah (Tech Lead) di PR.
- `TODO(verify)` kode error pada register bersamaan: T2.
- `tsx` me-resolve alias `@/` dengan Drizzle RC dan Better Auth (ADR 0042, Not verified): T7.
- T1 kemungkinan melebihi target 400 baris di luar migration dan file generated, karena memasang infrastruktur bersama (`shared/config`, `shared/db`, `shared/errors`, `shared/server`) untuk pertama kali. Dipisah bila review menilainya terlalu besar.
- `advanced.ipAddress` dan langkah platform: sebelum Release gate (PRD Q4).
- `.env` diisi owner sebelum T1: `DATABASE_URL` (dev), `TEST_DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.

## Change log

| Date | Change | Reason |
|---|---|---|
| 2026-11-08 | T1: `.gitignore` masuk file list (`!.env.example`) | Catatan Gate review round 1: `.gitignore` baris 6 (`.env*`) mengabaikan `.env.example` (`git check-ignore`) |
| 2026-11-08 | T2–T5: baris lock primitive dengan mekanisme `check-ui.mjs --accept <file>` | Catatan Gate review round 1: T3–T5 juga menambah primitive (`tailwind-shadcn.md`) |
| 2026-11-08 | T1, T2, T4: `src/routeTree.gen.ts` sebagai file generated | Catatan Gate review round 1: ketiga task menambah route |
| 2026-11-08 | T1: `src/routes/__root.tsx` masuk file list (modify: `createRootRouteWithContext` dengan `queryClient`) | Router context untuk `queryClient` (`tanstack-query.md`) didaftarkan di root route; tidak tercantum di layer breakdown spec |
| 2026-11-08 | T1: `src/shared/errors/index.ts` dan `src/shared/db/errors.ts` pindah ke task yang pertama memakainya (T2 untuk `readPgError`, T4 untuk `Result`) | T1 tidak punya kegagalan yang diharapkan; membuatnya sekarang berarti kode tanpa pemakai |
| 2026-11-08 | T1 dan T4: `auth.ts`, `auth.middleware.ts`, `auth-handler.ts` menjadi `auth.repository.ts`, `session.functions.ts`, `session.service.ts` | Perubahan section 3 spec, disetujui di Spec gate round 2 (`check:gates`) |
| 2026-11-08 | T1: `@tanstack/react-query` dipasang `^5.106.1`, bukan 5.107.1 (spec section 2) | 5.107.1 masih di dalam `minimumReleaseAge` pnpm; pnpm menambah pengecualian sendiri di `pnpm-workspace.yaml`, dan pengecualian itu dibatalkan |
| 2026-11-08 | T1: `docs/decisions/0041-auth-middleware-in-the-auth-feature.md` diubah (point 4 dan baris Amended) | Spec gate round 2 menyetujui nama file; review T1 R1-8 |
| 2026-11-08 | T1: `src/shared/db/columns.ts` dihapus; dibuat oleh task pertama yang punya tabel non-auth | Review T1 R1-9: tanpa pemakai (YAGNI), sama dengan `shared/errors` |
| 2026-11-08 | T1: tes baru `__tests__/session.service.test.ts` (jalur sesi, `/update-user`, `statusChangedAt`); tes AC16 di `accounts.service.test.ts` diganti nama; tes "akun baru berstatus pending dan berrole user" tergabung di tes AC1 | Review T1 R1-1, R1-6, R1-11 |
| 2026-11-08 | T1: `vitest.config.ts` menyetel `TZ=Asia/Jakarta` untuk tes | Review T1 R1-14: bug timestamp tanpa zona hanya terlihat di luar UTC |
| 2026-11-08 | T1: pemeriksaan Origin `/api/auth` (`better-auth.md` rule 9) dibuktikan dengan `curl` di dev server, bukan Vitest | Better Auth 1.7.18 melewati origin check saat `NODE_ENV=test`; review T1 R1-7 |
| 2026-11-08 | T2: `advanced.disableOriginCheck: false` di `server/auth.repository.ts` (masuk file list T2) dan ADR 0046 yang meluruskan `better-auth.md` rule 9; tes otomatis tabel rule 9 (sign-up, sign-in, sign-out: Origin asing, `Origin: null`, cross-site navigation, same origin) di `sign-in.test.ts` | Catatan PR gate T1: Better Auth melewati origin check saat `NODE_ENV=test`, jadi tes Vitest tidak membuktikan rule 9 |
| 2026-11-08 | T2: cek `Cache-Control: private, no-store` pada panggilan RPC server function dari client | Catatan PR gate T1: di T1 hanya respons SSR yang dicek (Inferred untuk RPC) |
| 2026-11-08 | T1: kode `USERNAME_REQUIRED` menjadi `AUTH_USERNAME_REQUIRED` | Catatan PR gate T1 (R1-15) |
| 2026-11-08 | T2: `src/shared/ui/app-form-context.ts`, `app-form.ts`, `app-text-field.tsx`, `app-submit-button.tsx` (create) | `tanstack-form.md` rule 6 dan "The shared hook (once per app)": field dan tombol didaftarkan sekali lewat `createFormHook`; nama `app-*` tidak butuh entri lock (`tailwind-shadcn.md`) |
| 2026-11-08 | T2: `src/features/auth/components/sign-in-method.ts` (create): fungsi murni yang memilih endpoint email atau username | Bisa dites tanpa React; sama dengan pola mapper di `components/` (`folder-structure.md`) |
| 2026-11-08 | T2: `src/features/auth/server/auth.repository.ts` (modify): `advanced.disableOriginCheck: false` dan ekspor `authOptions` untuk instance tes rate limit | Catatan PR gate T1 (ADR 0046); rate limit hanya aktif di production, jadi AC21 dites dengan instance dari opsi yang sama ditambah `rateLimit.enabled` |
| 2026-11-08 | T2: `src/features/auth/components/form-banner.tsx` (create): banner error form untuk login dan register | Dipakai dua form; komponen kecil terpisah (`components.md`) |
| 2026-11-08 | T2: `formCsrfMiddleware` pada `/sign-in/username` dan logger Better Auth ke pino tanpa argumen tambahan (ADR 0046 point 2 dan 3) | Ditemukan saat membangun T2: endpoint username tanpa CSRF, dan email masuk log saat race |
| 2026-11-08 | T2: `public/bdh.avif` (create) dan `src/routes/_status/status.tsx` (modify: tanpa loader, `onSignedOut` dari route) | Gambar R23 masuk bersama form yang memakainya; review T2 S10 dan S6 |
| 2026-11-08 | T2: `src/shared/db/errors.ts` (`readPgError`) tidak dibuat di T2; dibuat oleh task pertama yang menangkap error constraint sendiri | Register bersamaan ditangani Better Auth (kode `FAILED_TO_CREATE_USER` atau `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`), jadi T2 tidak membaca `23505`; review T2 S9 |
| 2026-11-08 | T2: server error ke kolom, banner form, dan fokus ke error pertama diperiksa manual di QA (bersama AC25, AC26, NFR5), bukan tes DOM | Repo belum punya Testing Library atau lingkungan DOM; menambahkannya butuh ADR (`versions.md` action item 4); review T2 S7. Pemetaan kode ke kolom dites di `auth-messages.test.ts` |
| 2026-11-08 | T3: `src/shared/ui/css-custom-properties.d.ts` (create) dan perbaikan lint `sidebar.tsx` | Perbaikan yang tercantum di `tailwind-shadcn.md` ("Generated primitives that fail lint"); file `.d.ts` diklasifikasikan oleh person dengan `check-ui --own` |
| 2026-11-08 | T3: `separator.tsx` tidak ditimpa CLI (diff hanya baris `"use client"`); file yang tercatat dipulihkan dari git setelah `add --overwrite` | Primitive yang tercatat tidak berubah untuk satu fitur (`tailwind-shadcn.md`, rule 3) |
| 2026-11-08 | T3: cek manual tampilan pengguna aktif (AC6 dari dashboard, AC12) dipindah ke QA fase 9, dengan akun aktif dari seed T7 | Keputusan owner, Dana Harliansyah, 2026-11-08, via chat: "(b) Tunda ke QA, setelah seed di T7 menyediakan akun aktif." Database dev belum punya akun aktif sebelum T5 atau T7 |
| 2026-11-08 | T3: `src/routes/__root.tsx` (modify: `lang="id"`, judul "Simlog"); teks keluar di `features/auth/components/auth-messages.ts` (`SIGN_OUT_TEXT`, diekspor dari `index.ts`) | Review T3 nit 8 dan S2: UI berbahasa Indonesia; teks auth punya satu pemilik |
| 2026-11-08 | T4: judul header `AppShell` mengikuti halaman aktif (sekarang tetap "Beranda", `TODO(T4)` di `_app.tsx`) | Review T3 nit 5: baru salah setelah `/users` ada |
| 2026-11-08 | T3: `breadcrumb` dan `collapsible` ditambahkan sesuai spec section 8 tapi belum dipakai; status sidebar (cookie `sidebar_state`) tidak dibaca kembali setelah reload | Review T3 nit 10 dan 11: tidak ada AC yang memintanya; dipakai saat ada kebutuhan, atau dikeluarkan dari lock oleh person |
| 2026-11-08 | T4: `requireActiveSuperadmin` (di `session.functions.ts`) memanggil service `authorizeActiveSuperadmin` dan menaruh hasilnya (`Result`) di `context`; handler mengembalikan error itu atau memanggil service | Dokumen tidak punya contoh middleware yang gagal; middleware tidak bisa mengembalikan `Result` sendiri. Dikonfirmasi Dana Harliansyah (Tech Lead) di PR gate T4, 2026-11-08, via chat |
| 2026-11-08 | T4: kode error fitur diberi prefiks `AUTH_` (`AUTH_REQUIRED`, `AUTH_NOT_ACTIVE_SUPERADMIN`, dan seterusnya di T5, T6) | `error-handling.md`: kode unik dan berprefiks nama fitur; sama dengan keputusan R1-15 di T1. Dikonfirmasi Dana Harliansyah (Tech Lead) di PR gate T4, 2026-11-08, via chat |
| 2026-11-08 | T4: `src/shared/errors/index.ts` dibuat di sini (dipindah dari T1); tes otorisasi di `__tests__/accounts.authorization.test.ts` menguji `authorizeActiveSuperadmin`, bukan server function lewat RPC | Server function butuh runtime Start; middleware hanya meneruskan hasil service, jadi service yang dites |
| 2026-11-08 | T4: judul header mengikuti halaman lewat `staticData.title` per route (`src/router.tsx` mendeklarasikan tipenya) | Catatan T3 nit 5 |
| 2026-11-08 | T4: `src/features/auth/components/account-labels.ts` (create): label status dan role berbahasa Indonesia; tes daftar akun di `__tests__/accounts.list.test.ts` | Satu pemilik untuk label yang dipakai tabel dan saringan; tes daftar dipisah dari `accounts.service.test.ts` agar tiap file satu pokok |
| 2026-11-08 | T4: service superadmin menerima `ActiveSuperadmin` (brand Zod) yang hanya dibuat `authorizeActiveSuperadmin`; handler yang lupa memeriksa `context.superadmin` gagal typecheck | Review T4 S1: pola `Result` di `context` gagal-terbuka tanpa ini |
| 2026-11-08 | T4: loader `/users` tanpa `staleTime: 'static'` (pengecualian dari `tanstack-query.md` rule 4, seperti `/status` di T1) | Review T4 S5: superadmin yang dicabut tidak boleh melihat daftar dari cache (R21, R22, EC17) |
| 2026-11-08 | T4: EC21 (saringan tanpa hasil) diperiksa manual di QA; tes `accounts.list.test.ts` menguji halaman di luar data, bukan saringan kosong | Database test bersama selalu punya akun di setiap status; review T4 S6 |
| 2026-11-08 | T4: bukti RPC `listAccounts` dengan curl untuk tanpa sesi dan pengguna pending; kasus pengguna aktif dan superadmin aktif lewat RPC diperiksa di QA dengan akun seed (T7) | Review T4 B1 opsi (b); tes `server.fetch` pada hasil build butuh perubahan infrastruktur tes yang diputuskan person. Dikonfirmasi Dana Harliansyah (Tech Lead) di PR gate T4, 2026-11-08, via chat |
| 2026-11-08 | T4: tabel akun memakai primitive `Table` dengan paginasi di server, bukan `useTable` dari TanStack Table (deviasi dari `tanstack-table.md`, "Which table") | Keputusan reviewer di PR gate T4: daftar sederhana tanpa sorting kolom; `@tanstack/react-table` belum terpasang dan butuh ADR. Dikonfirmasi Dana Harliansyah (Tech Lead), 2026-11-08, via chat |
| 2026-11-08 | T5: tes status di `__tests__/accounts.status.test.ts` dengan helper `__tests__/accounts.helpers.ts` (create); tes izin "changeAccountStatus menolak pengguna role user" di `__tests__/accounts.authorization.test.ts` | Sama dengan T4: tiap file tes satu pokok, dan server function butuh runtime Start, jadi tes menjalankan langkah yang sama dengan handler (`authorizeActiveSuperadmin`, lalu service hanya bila ok) |
| 2026-11-08 | T5: teks aksi dan dialog di `components/account-labels.ts` (modify); `AccountsTable` menerima prop `actions` dan view yang memasang `AccountRowActions` | Satu pemilik untuk kata yang tampil di UI; tabel tidak tahu aksi apa yang ada (`components.md`: callback naik) |
| 2026-11-08 | T5: menu aksi memakai daftar pilihan sendiri per status (spec section 8, step 2); `accounts.rules.ts` tetap satu-satunya yang memutuskan | `*.rules.ts` hanya untuk server (`folder-structure.md`); daftar di UI hanya membentuk menu. Dikonfirmasi Dana Harliansyah (Tech Lead) di PR gate T5, 2026-11-08, via chat |
| 2026-11-08 | T5: setelah setiap hasil aksi (berhasil atau gagal), seluruh scope `auth` diinvalidasi lewat `invalidateFeature`, bukan hanya `authKeys.accounts()` | Spec section 8 step 4: setiap kegagalan diikuti daftar dimuat ulang; `currentUser` ikut segar untuk EC17. Dikonfirmasi Dana Harliansyah (Tech Lead) di PR gate T5, 2026-11-08, via chat |
| 2026-11-08 | T5: unit test `src/shared/lib/query-scope.test.ts` (create) | `tanstack-query.md` rule 12 meminta tes untuk `invalidateFeature`; diletakkan di sebelah kodenya seperti `env.server.test.ts`. Review T5 R1-S1 |
| 2026-11-08 | T5: `statusTargetSchema` di `schemas.ts`: `nextStatus` tidak menerima `pending`; tipe `StatusTarget` diturunkan dari schema | Review T5 R1-N4: tidak ada aksi yang kembali ke `pending` (spec section 8), jadi validator menolaknya sebelum service |
| 2026-11-08 | T5: penolakan yang diputuskan di baris terkunci dicatat sebagai `warn` `auth.account_status_refused` (id dan kode) | Review T5 R1-N5: setara dengan log `warn` di middleware; spec section 10 hanya mewajibkan log middleware |
| 2026-11-08 | T5: `AUTH_REQUIRED` saat aksi status tampil sebagai banner yang meminta muat ulang, lalu loader `/users` mengalihkan ke `/login` (deviasi dari spec section 6, sama dengan daftar di T4) | Review T5 R1-N3: konsisten dengan T4; pengalihan langsung ke `/login` untuk daftar dan aksi ditangani bersama bila dibutuhkan. Keputusan Dana Harliansyah (Tech Lead) di PR gate T5, 2026-11-08, via chat |
| 2026-11-08 | T6: `hooks/use-account-actions.ts` (create) menjalankan aksi yang dikonfirmasi dengan mutasi status atau role, dan memberi view satu banner dan satu baris yang sedang berjalan; `components/user-management-view.tsx` dan `account-labels.ts` (modify: teks aksi role) | View memegang dua mutasi; tanpa hook ini logika pemilihan mutasi dan banner berada di komponen (`components.md`: komponen tipis). Dikonfirmasi Dana Harliansyah (Tech Lead) di PR gate T6, 2026-11-08, via chat |
| 2026-11-08 | T6: tes role di `__tests__/accounts.role.test.ts` (create); tes izin "changeAccountRole menolak pengguna role user" di `accounts.authorization.test.ts`; tes saling cabut di `accounts.concurrency.test.ts` | Sama dengan T5: satu pokok per file; server function butuh runtime Start, jadi tes menjalankan langkah yang sama dengan handler |
| 2026-11-08 | T6: `changeAccountRoleSchema` menolak `nextRole` yang sama dengan `expectedRole`; mencabut superadmin yang nonaktif diizinkan di server (UI tidak menawarkannya, karena aksi role hanya di baris aktif) | Spec section 5 dan 6 tidak menyebut keduanya. Permintaan tanpa perubahan bukan aksi; mencabut hanya mengurangi hak, dan tidak menyentuh R20 karena superadmin nonaktif tidak dihitung. Dikonfirmasi Dana Harliansyah (Tech Lead) di PR gate T6, 2026-11-08, via chat |
| 2026-11-08 | T6: `components/account-actions.ts` (create): `AccountAction`, `actionText`, `actionKey`, `choicesFor` sebagai helper murni; tes `__tests__/account-actions.test.ts` (create) | Review T6 R1-S1 dan R1-S2: hook dan dialog tidak mengimpor dari komponen `.tsx`; perilaku baris sendiri (AC18, EC15) bisa dites tanpa React. Dikonfirmasi Dana Harliansyah (Tech Lead) di PR gate T6, 2026-11-08, via chat |
| 2026-11-08 | T6: tes "aktifkan, tolak, nonaktifkan, aktifkan kembali" di `accounts.status.test.ts` menjalankan setup dan perubahan secara paralel | Tes itu sempat melewati batas 5 detik Vitest (5004 ms) setelah tes T6 menambah beban; batas waktu tidak dinaikkan |
| 2026-11-08 | Tindak lanjut di luar T6: `registerSchema` (`schemas.ts:65`) masih memakai parameter `message` yang deprecated di zod 4.6.7; perbaikan tier S terpisah. Celah gate: `@typescript-eslint/no-deprecated` tidak menangkap properti deprecated di object literal di balik mapped type (dicatat untuk close-out; perubahan konfigurasi lint butuh person) | Review T6 R1-B1 |
| 2026-11-08 | Tindak lanjut di luar T6: dialog "Aktifkan" untuk baris superadmin yang nonaktif memperingatkan bahwa hak superadmin ikut kembali (opsi b) | Review T6, pertanyaan produk: mengaktifkan kembali superadmin nonaktif diam-diam mengembalikan haknya. Keputusan Dana Harliansyah (Tech Lead) di PR gate T6, 2026-11-08, via chat: perubahan terpisah |
| 2026-11-08 | T7: `accounts.repository.ts` (modify: `findAccountIdByEmail`); `__tests__/seed.helpers.ts` (create) | Seed membuat akun lewat `auth.api.signUpEmail`; bila email sudah ada, unique index yang menolak, lalu seed mencari akun itu (tidak ada baca yang memutuskan tulis, `drizzle-concurrency.md`) |
| 2026-11-08 | T7: superadmin baru dari seed diaktifkan dan diangkat langsung lewat `updateAccountStatus` dan `updateAccountRole` dalam satu transaksi; akun contoh berpindah status lewat `changeAccountStatus` (T5) dengan superadmin itu sebagai aktor | Superadmin pertama tidak punya aktor yang bisa mengaktifkannya; akun contoh memakai aturan transisi yang sama dengan UI |
| 2026-11-08 | T7: akun contoh memakai password superadmin dari `SEED_SUPERADMIN_PASSWORD`; tidak ada variabel `SEED_*` lain | R24: tidak ada password di kode; QA butuh login sebagai akun aktif (AC6, AC12). Menunggu konfirmasi di PR gate T7 |
| 2026-11-08 | T7: penolakan seed memakai tipe `SeedRefusal` (`production`, `not_allowed`, `invalid_config`, `superadmin_not_active`), bukan kode `AUTH_*` | Seed tidak punya UI; kode `AUTH_*` mewajibkan teks di `AUTH_ERROR_TEXT` yang tidak pernah tampil |
| 2026-11-08 | T1: tes env di `src/shared/config/env.server.test.ts` (bukan `__tests__/` fitur) | Tes itu menguji modul `shared`, jadi diletakkan di sebelah kodenya (`folder-structure.md`, Naming: tests) |

## Gate review

| Question | Answer and where |
|---|---|
| Does every in-scope PRD item, spec row, and AC land in a task? | Ya: kolom AC di Overview dan Coverage check |
| Is each task a vertical cut with a user-visible outcome, riskiest first? | Ya; T5 dan T6 menunggu T4 karena aksinya ada di tabel `/users` (alasan di bawah Overview). T1 tetap satu task |
| Does T1 name a test for each assumption no code has proven yet (Inferred research findings the spec relies on, untested section 5 hypotheses)? | Ya: 9 asumsi di T1 "Tests written first", termasuk Q6 dan hipotesis section 5 |
| Does each file list cover its task's description? | Ya setelah tiga catatan diterapkan lewat change log 2026-11-08 (`.gitignore`, lock primitive, `routeTree.gen.ts`) |
| Does each task with a permission rule name it in its tests and "Done when"? | Ya: T4 (AC13, NFR3), T5 dan T6 (`changeAccount*` menolak role `user`, `CANNOT_CHANGE_SELF`) |
| Is every public export promised upstream delivered by a named task? | Ya: Coverage check, export per task |

| Round | Date | Reviewer | Verdict | Findings, or notes and their owner |
|---|---|---|---|---|
| 1 | 2026-11-08 | Dana Harliansyah (Tech Lead) | approve with notes | Pesan reviewer: "06-feature-spec auth: approve, jawaban section 15 sesuai rekomendasi. 07-tasks auth: approve with notes, jawaban sesuai rekomendasi, terapkan 3 catatan, T1 tetap satu". Catatan: (1) `.gitignore` di T1; (2) lock primitive di T2–T5; (3) `routeTree.gen.ts` di T1, T2, T4. Owner: AI agent, diterapkan 2026-11-08 lewat change log |
