# Feature Spec: Auth (register, login, logout, aktivasi akun oleh superadmin)

- Slug: `auth` (file `06-feature-spec.md`)
- PRD: `04-prd.md` (approved at the PRD gate)
- Research: `02-research.md` (decisions it left open are answered in section 2)
- Architecture review: `05-architecture-review.md` (every decision and export is carried here)
- Tier: L
- Status: approved
- Gate: Spec gate
- Owner: Dana Harliansyah
- Author: AI agent
- Date: 2026-11-08
- Approved by: Dana Harliansyah (Product Owner, Tech Lead), 2026-11-08, via chat
- Tasks gate: merged with this gate
- Owning feature module: `src/features/auth`

Spec ini hanya dokumentasi. API library diverifikasi dari docs Better Auth 1.7 dan dari paket npm `better-auth@1.7.18` / `@better-auth/core@1.7.18` yang diunduh ke scratchpad (tidak dipasang ke proyek). Hal yang hanya bisa dibuktikan dengan menjalankan kode ditandai `TODO(verify)` dan dibuktikan di T1 (ADR 0037, point 5).

## 1. Behavior

**Register (US1).**
1. Pengunjung membuka `/register`. Form: nama, username, email, password, konfirmasi password. Gambar `bdh.avif` di sisi kanan pada layar `md` ke atas (R23).
2. Validasi di client memakai schema yang sama dengan server (section 5). Kesalahan tampil di bawah kolomnya (EC3, EC4). Tombol kirim nonaktif dan berlabel "Mendaftarkan…" selama request berjalan.
3. Berhasil: sesi dibuat (R6), cache `currentUser` diinvalidasi, navigasi ke `/`, lalu guard mengarahkan ke `/status` karena status `pending` (AC1).
4. Gagal: email atau username sudah dipakai tampil di kolomnya (EC1, EC2). Rate limit tampil sebagai banner "Terlalu banyak percobaan, coba lagi nanti" (EC7). Kegagalan lain tampil sebagai banner umum.

**Login (US2).**
1. `/login`. Form: satu kolom "Username atau email", password. Nilai yang mengandung `@` dikirim ke endpoint email, selain itu ke endpoint username (ADR 0039).
2. Berhasil: cache `currentUser` diinvalidasi, navigasi ke `/` (R9); guard meneruskan ke `/status` bila belum aktif.
3. Gagal: satu pesan "Username/email atau password salah" untuk kode `INVALID_EMAIL_OR_PASSWORD` dan `INVALID_USERNAME_OR_PASSWORD` (R8, EC6). Rate limit: banner yang sama dengan register (EC7).

**Pengalihan (R11 to R14).** Setiap route ada di salah satu dari tiga layout tanpa segmen URL. Keputusan pengalihan ada di satu fungsi murni `resolveAccessRedirect` (section 3):

| Layout | Route | Tanpa sesi | Sesi, status bukan `active` | Sesi, `active` |
|---|---|---|---|---|
| `_guest` | `/login`, `/register` | tampil | ke `/` (lalu `/status`) | ke `/` |
| `_status` | `/status` | ke `/login` | tampil | ke `/` |
| `_app` | `/`, `/users` | ke `/login` (EC9, EC19) | ke `/status` (EC10) | tampil |

`/users` juga menolak role `user`: halaman menampilkan "Anda tidak punya akses" (EC11). Pengalihan hanya untuk UX; proteksi data ada di middleware (section 9).

**Halaman status (US3).** Menyebut status dan artinya: `pending` "Akun Anda menunggu persetujuan superadmin", `rejected` "Pendaftaran Anda ditolak", `inactive` "Akun Anda dinonaktifkan". Tombol "Periksa lagi" memuat ulang `currentUser` (EC12), dan tombol "Keluar".

**Dashboard (US4).** `_app` merender `AppShell` (sidebar `sidebar-07`): menu Beranda (`/`), Manajemen pengguna (`/users`, hanya bila role `superadmin`), dan menu pengguna di kaki sidebar (nama, username, Keluar). Sidebar bisa diciutkan menjadi ikon (AC12). Beranda menampilkan "Halo, {nama}".

**Manajemen pengguna (US5 to US7).**
1. Tabel akun: nama, username, email, status, role, waktu register (R16, NFR6). Saringan status di search param `status` (semua, `pending`, `active`, `rejected`, `inactive`); urutan bawaan `pending` dulu, lalu waktu register terbaru. Paginasi 20 per halaman.
2. Aksi per baris sesuai status: `pending` (Aktifkan, Tolak), `active` (Nonaktifkan, Jadikan superadmin, atau Cabut superadmin), `rejected` dan `inactive` (Aktifkan). Baris milik superadmin yang sedang login tidak menampilkan Nonaktifkan dan Cabut superadmin (EC15).
3. Setiap aksi meminta konfirmasi dalam dialog, lalu mengirim status atau role yang diharapkan saat ini. Selama request berjalan, tombol aksi baris itu nonaktif.
4. Berhasil: daftar diinvalidasi. Gagal: pesan sesuai kode di section 6 tampil dalam banner, lalu daftar dimuat ulang (EC14, EC17, EC18).
5. Kosong: "Tidak ada akun dengan status ini" (EC21). Loading: skeleton baris tabel. Error tak terduga: `errorComponent` route.

**Logout (R10).** Dari menu pengguna dan dari `/status`. Setelah berhasil, cache Query dikosongkan dan navigasi ke `/login`.

**Seed (US8).** `pnpm db:seed` membuat superadmin dari env `SEED_SUPERADMIN_*` dan empat akun contoh (satu per status). Akun yang sudah ada (email sama) dilewati. Seed berhenti sebelum menulis apa pun bila `NODE_ENV` adalah `production` atau `SEED_ALLOW` bukan `true` (R25, EC20).

EC1 to EC21 ditangani di sini atau di section 6.

## 2. Architecture and boundaries
Ownership, D1 to D13, public API, events, dan security sudah diputuskan di `05-architecture-review.md`. Di bawah ini hanya hal baru.

**Feature module qualification:** lihat `05-architecture-review.md` section 1. Decision: **new feature `auth`**.

**Decisions.**

| Decision | Options considered | Choice | Reason | ADR |
|---|---|---|---|---|
| S1 Nama tabel dan id | Output CLI apa adanya (tunggal, `text` id) atau opsi Better Auth | `usePlural: true` (tabel `users`, `sessions`, `accounts`, `verifications`) dan `advanced.database.generateId: "uuid"` | Mengikuti `database.md` (plural, uuid) lewat opsi yang ada di types, bukan lewat edit | [0043](../../docs/decisions/0043-better-auth-tables-follow-database-conventions.md) |
| S2 Edit tabel hasil CLI | Hanya edit yang diizinkan ADR 0040, atau ditambah tipe dan nama | Ditambah: timestamp `withTimezone: true`, nama index dan unique sesuai `database.md`, enum `account_status` dan `user_role`, `NOT NULL` pada `username`, `status`, `role` | Timestamp tanpa zona dibaca `pg` sebagai waktu lokal server; `database.md` melarangnya | 0043 (memperluas ADR 0040 point 3) |
| S3 Username wajib di server | `hooks.before` pada `/sign-up/email`, `databaseHooks.user.create.before`, atau hanya `NOT NULL` | `hooks.before` pada path `/sign-up/email` menolak body tanpa `username` dengan `APIError` kode `AUTH_USERNAME_REQUIRED`; `NOT NULL` sebagai lapisan terakhir | Pesan yang jelas untuk client; `NOT NULL` menangkap jalur lain | 0039 |
| S4 Rate limit | Aturan bawaan atau `customRules` | Aturan bawaan: semua path `/sign-in*` dan `/sign-up*` 3 request per 10 detik, aktif di production; penyimpanan memori (D11) | Sudah memenuhi NFR1 tanpa konfigurasi (section 13) | none |
| S5 `/is-username-available` | Biarkan atau `disabledPaths` | Dimatikan lewat `disabledPaths` | UI tidak memakainya; mengurangi permukaan enumerasi (PRD Q6) | none |
| S6 Letak `authClient` | `features/auth/client.ts` (`better-auth.md` rule 2) atau di folder standar | `features/auth/hooks/auth-client.ts` | `check:gates` menolak file fitur di luar folder standar (`folder-structure.md`); `better-auth.md` rule 2 diperbarui di T2 | none (koreksi lokasi file, dicatat di change log `better-auth.md`) |
| S7 Fungsi keputusan pengalihan | Di setiap route, di `server/*.rules.ts`, atau di `components/` | `features/auth/components/access-redirect.ts`, fungsi murni, diekspor dari `index.ts` | Dipakai `beforeLoad` di client dan server; `*.rules.ts` hanya server; pola sama dengan mapper di `components/` (`folder-structure.md`) | none |
| S8 Cara tes integrasi mencapai database test | Decision AH: env Vitest dari `TEST_DATABASE_URL`, modul env khusus tes, atau script tes yang menyetel `DATABASE_URL` | `vitest.config.ts` menyetel `test.env.DATABASE_URL` dari `TEST_DATABASE_URL` dan menolak bila kosong atau sama dengan `DATABASE_URL` | Satu modul env untuk app dan tes; tidak ada cabang khusus tes di `src/` | [0044](../../docs/decisions/0044-integration-tests-reach-the-test-database.md) |

**Public API added or changed** (sama dengan `05-architecture-review.md` section 3, ditambah S7):

| Export | Entry | Kind | Consumers |
|---|---|---|---|
| `LoginForm`, `RegisterForm`, `AccountStatusView`, `UserManagementView` | `index.ts` | component | routes `_guest/login`, `_guest/register`, `_status/status`, `_app/users` |
| `currentUserQueryOptions`, `authScope` | `index.ts` | query options, constant | layout routes, route Beranda |
| `useSignOut` | `index.ts` | hook | `_app` (menu pengguna), `AccountStatusView` |
| `resolveAccessRedirect` | `index.ts` | function | `beforeLoad` di `_guest`, `_status`, `_app` |
| `CurrentUser`, `AccountStatus`, `Role` | `index.ts` | type | routes |
| `authHandler` | `index.server.ts` | handler untuk server route | `src/routes/api/auth/$.ts` |
| `seedAccounts` | `index.server.ts` | service | `scripts/seed.ts` |

**Cross-feature consumption:** none. **Events:** none.

**New dependencies** (semua lewat skill `change-dependency`, exact pin):

| Package | Version | Where decided |
|---|---|---|
| `better-auth` | 1.7.18 | ADR 0007 R, plugin `username` ADR 0039 |
| `drizzle-orm`, `drizzle-kit` | 1.0.0-rc.5 | ADR 0008 |
| `pg`, `@types/pg` | 8.23.1 | ADR 0007 F, G |
| `zod` | 4.6.7 | `versions.md` |
| `pino` | 10.4.0 | `versions.md` |
| `@tanstack/react-query`, `@tanstack/react-form` | 5.107.1, 1.33.5 (npm `latest`, 2026-11-08; dipin saat dipasang) | `versions.md` |
| `@tanstack/react-router-ssr-query` | 1.167.3 (npm `latest`, 2026-11-08) | [ADR 0045](../../docs/decisions/0045-router-ssr-query-integration.md) |
| `tsx` | 4.23.15 (npm `latest`, 2026-11-08) | ADR 0042 |

**Deviations from `docs/03-standards/*`:** S1 dan S2 (ADR 0043); `better-auth.md` rule 2, 4, dan 5 (ADR 0040, 0041, S6).

## 3. Layer breakdown

| Layer | File(s) | Create / change | Notes |
|---|---|---|---|
| Config | `package.json` | change | dependency di section 2; script `db:generate`, `db:migrate`, `db:migrate:test`, `db:seed` |
| Config | `drizzle.config.ts`, `.env.example` | create | isi `drizzle.config.ts` dari `environment.md`; `.env.example` menambah `SEED_ALLOW`, `SEED_SUPERADMIN_NAME`, `SEED_SUPERADMIN_USERNAME`, `SEED_SUPERADMIN_EMAIL`, `SEED_SUPERADMIN_PASSWORD` |
| Config | `src/router.tsx` | change | `QueryClient` per request di `getRouter()`, `setupRouterSsrQueryIntegration`, router `context.queryClient` (`tanstack-query.md`) |
| Shared | `shared/config/env.server.ts` | create | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `LOG_LEVEL` (`environment.md`) |
| Shared | `shared/db/client.ts`, `shared/db/columns.ts`, `shared/db/errors.ts` | create | pool dengan opsi eksplisit, `timestamps`, `readPgError` (`drizzle-postgres.md`) |
| Shared | `shared/errors/index.ts` | create | `appError`, `ok`, `err`, `Result`, `toFormErrors` (`error-handling.md`) |
| Shared | `shared/server/logger.server.ts`, `shared/server/with-error-boundary.ts` | create | pino, redaksi `email`, `password`; boundary untuk server function |
| Shared | `shared/lib/format.ts`, `shared/lib/query-scope.ts` | create | format waktu register (`id-ID`, `Asia/Jakarta`); `invalidateFeature` |
| Shared UI | `shared/ui/*` primitives | create (CLI) | section 8 |
| Shared UI | `shared/ui/app-shell.tsx` | create | shell dari `sidebar-07` tanpa team switcher dan projects; props `navItems`, `user`, `onSignOut`, `children` |
| Table | `features/auth/db/schema.ts` | create | `users`, `sessions`, `accounts`, `verifications`, enum `account_status`, `user_role` (section 4) |
| Schemas | `features/auth/schemas.ts` | create | section 5; `accountStatuses`, `roles` |
| Errors | `features/auth/errors.ts` | create | kode di section 6 |
| Auth config (repository) | `features/auth/server/auth.repository.ts` | create | instance `betterAuth` (section 13): adapter, `usePlural`, `generateId`, `emailAndPassword`, `user.additionalFields`, `hooks.before`, `disabledPaths`, plugin `username`, `tanstackStartCookies` terakhir |
| Middleware (function) | `features/auth/server/session.functions.ts` | create | `withSession`, `requireActiveSuperadmin` (ADR 0041), memanggil `session.service.ts`. Middleware untuk pengguna aktif biasa ditambahkan saat ada server function yang membutuhkannya |
| Repository | `features/auth/server/accounts.repository.ts` | create | `findCurrentUser`, `listAccounts`, `lockAccountsForChange`, `updateAccountStatus`, `updateAccountRole`, `findUserIdByEmail` |
| Rules | `features/auth/server/accounts.rules.ts` | create | `decideStatusChange`, `decideRoleChange`: transisi yang sah, larangan diri sendiri, syarat target aktif untuk diangkat |
| Service | `features/auth/server/accounts.service.ts` | create | `getCurrentUserDto`, `listAccountsForAdmin`, `changeAccountStatus`, `changeAccountRole` (transaksi, section 4) |
| Service | `features/auth/server/seed.service.ts` | create | `seedAccounts` lewat `auth.api.signUpEmail`, lalu update status dan role |
| Server function | `features/auth/server/accounts.functions.ts` | create | section 6 |
| Session service | `features/auth/server/session.service.ts` | create | `handleAuthRequest(request)` (diekspor sebagai `authHandler`) meneruskan ke `auth.handler`; `readSessionUserId(headers)` memanggil `auth.api.getSession` |
| Query options and keys | `features/auth/queries.ts` | create | `authScope`, `authKeys`, `currentUserQueryOptions`, `accountsQueryOptions` |
| Hooks | `features/auth/hooks/auth-client.ts` | create | `createAuthClient` dari `better-auth/react`, `usernameClient`, `inferAdditionalFields` (S6) |
| Hooks | `features/auth/hooks/use-sign-in.ts`, `use-sign-up.ts`, `use-sign-out.ts`, `use-change-account-status.ts`, `use-change-account-role.ts` | create | `useMutation`; invalidasi saat sukses |
| Components | `features/auth/components/login-form.tsx`, `register-form.tsx`, `auth-split-layout.tsx` | create | dari `login-04` tanpa OAuth, forgot password, Terms; gambar `/bdh.avif` |
| Components | `features/auth/components/account-status-view.tsx` | create | halaman status |
| Components | `features/auth/components/user-management-view.tsx`, `accounts-table.tsx`, `account-row-actions.tsx`, `confirm-account-action-dialog.tsx` | create | manajemen pengguna |
| Components | `features/auth/components/access-redirect.ts` | create | `resolveAccessRedirect` (S7) |
| Components | `features/auth/components/auth-messages.ts` | create | peta kode error ke teks Indonesia |
| Routes | `src/routes/_guest.tsx`, `_guest/login.tsx`, `_guest/register.tsx` | create | guard tamu |
| Routes | `src/routes/_status.tsx`, `_status/status.tsx` | create | guard halaman status |
| Routes | `src/routes/_app.tsx`, `_app/index.tsx`, `_app/users.tsx` | create | `_app` merakit `AppShell`; `src/routes/index.tsx` scaffold dihapus |
| Routes | `src/routes/api/auth/$.ts` | create | GET dan POST ke `authHandler` |
| Seed | `scripts/seed.ts` | create | memanggil `seedAccounts` lewat `@/features/auth/index.server` (ADR 0042) |
| Migration | `drizzle/<timestamp>_add-auth-tables/` | create (generated) | dari `pnpm db:generate` |
| Public API and README | `features/auth/index.ts`, `index.server.ts`, `README.md` | create | README: public API, tabel, daftar edit terhadap output CLI (ADR 0040, 0043) |
| Docs | `docs/04-stack/better-auth.md`, `docs/05-agent-tooling/skills.md`, `docs/04-stack/versions.md`, `docs/03-standards/environment.md`, `docs/03-standards/database.md` | change | rule 2, 4, 5 (S6, ADR 0041, 0040); versi; variabel seed; runner seed |
| Events and listeners | none | | |

## 4. Data model

| Table | Column | Type | Null | Default | Constraint or FK |
|---|---|---|---|---|---|
| `users` | `id` | `uuid` | no | `gen_random_uuid()` | PK |
| `users` | `name` | `text` | no | | |
| `users` | `email` | `text` | no | | unique `users_email_key` (Better Auth menyimpan huruf kecil) |
| `users` | `email_verified` | `boolean` | no | `false` | |
| `users` | `image` | `text` | yes (bawaan Better Auth, tidak dipakai) | | |
| `users` | `username` | `text` | no | | unique `users_username_key` (plugin menyimpan huruf kecil) |
| `users` | `status` | `account_status` | no | `'pending'` | enum `pending`, `active`, `rejected`, `inactive` |
| `users` | `role` | `user_role` | no | `'user'` | enum `user`, `superadmin` |
| `users` | `status_changed_at` | `timestamptz` | yes (null sampai keputusan pertama) | | |
| `users` | `created_at`, `updated_at` | `timestamptz` | no | `now()` | |
| `sessions` | `id` | `uuid` | no | `gen_random_uuid()` | PK |
| `sessions` | `user_id` | `uuid` | no | | FK `users.id` `ON DELETE CASCADE` (fitur yang sama; bawaan Better Auth) |
| `sessions` | `token` | `text` | no | | unique `sessions_token_key` |
| `sessions` | `expires_at` | `timestamptz` | no | | |
| `sessions` | `ip_address`, `user_agent` | `text` | yes (bawaan) | | |
| `sessions` | `created_at` | `timestamptz` | no | `now()` | |
| `sessions` | `updated_at` | `timestamptz` | no | none (Better Auth sets it, as the CLI output has it) | |
| `accounts` | `id` | `uuid` | no | `gen_random_uuid()` | PK |
| `accounts` | `user_id` | `uuid` | no | | FK `users.id` `ON DELETE CASCADE` |
| `accounts` | `account_id`, `provider_id` | `text` | no | | |
| `accounts` | `password` | `text` | yes (bawaan; terisi untuk `credential`) | | hash scrypt |
| `accounts` | kolom token OAuth bawaan | `text`, `timestamptz` | yes | | tidak dipakai (tanpa OAuth) |
| `accounts` | `created_at` | `timestamptz` | no | `now()` | |
| `accounts` | `updated_at` | `timestamptz` | no | none (Better Auth sets it, as the CLI output has it) | |
| `verifications` | `id`, `identifier`, `value`, `expires_at`, `created_at`, `updated_at` | sesuai output CLI, timestamp `timestamptz` | no | | tabel bawaan; tidak dipakai flow cut ini |

`status`, `role`, dan `status_changed_at` didaftarkan sebagai `user.additionalFields` dengan `input: false` (ADR 0038). Tipe Better Auth untuk `status` dan `role` adalah `string`, dan kolomnya enum PostgreSQL. `TODO(verify)` di T1: Better Auth menulis string itu ke kolom enum tanpa error, dan `generateId: "uuid"` dengan `usePlural: true` menghasilkan kolom `uuid` dari CLI (kalau tidak, diubah lewat edit S2).

**Indexes:**

| Table | Columns | Unique? | Serves |
|---|---|---|---|
| `users` | `email` | yes | sign-up dan sign-in email (Better Auth) |
| `users` | `username` | yes | sign-in username (plugin) |
| `users` | `status`, `created_at` | no | `listAccounts` dengan saringan status dan urutan waktu register |
| `sessions` | `user_id` | no | getSession (bawaan, nama diganti `sessions_user_id_idx`) |
| `accounts` | `user_id` | no | sign-in (bawaan, nama `accounts_user_id_idx`) |
| `verifications` | `identifier` | no | bawaan, nama `verifications_identifier_idx` |

**Migration notes:** additive, migration pertama, dibuat oleh `pnpm db:generate` dari `features/auth/db/schema.ts`. Reversible sebelum rilis production; setelahnya hanya kode yang di-rollback (`05-architecture-review.md`, Gate review pertanyaan 5). Tanpa reference data. Seed hanya untuk dev.

**Transactions and concurrency:**

| Collision point | Mechanism | Concurrent test expects |
|---|---|---|
| Dua superadmin mengubah status akun yang sama (EC14) | Transaksi: `lockAccountsForChange` mengunci baris aktor dan target dengan `.for('update')`, urut `id` (`drizzle-concurrency.md` rule 3); `decideStatusChange` membandingkan status terkunci dengan `expectedStatus` dari client | Satu `ok`; yang lain `conflict` `ACCOUNT_STATUS_CHANGED`; status tersimpan = hasil yang menang |
| Dua superadmin saling mencabut role (EC16) | Transaksi yang sama: baris aktor terkunci dan diperiksa masih `superadmin` dan `active` sebelum write; target tidak boleh aktor sendiri | Satu `ok`; yang lain `forbidden` `NOT_ACTIVE_SUPERADMIN`; tepat satu superadmin aktif tersisa |
| Superadmin yang baru dicabut mengirim aksi (EC17) | Pemeriksaan aktor di baris terkunci (bukan hanya di middleware) | `forbidden` `NOT_ACTIVE_SUPERADMIN`; data tidak berubah |
| Register bersamaan dengan email atau username yang sama | Unique `users_email_key`, `users_username_key` | Satu berhasil; yang lain ditolak Better Auth (`USER_ALREADY_EXISTS*` atau `USERNAME_IS_ALREADY_TAKEN`), atau `23505` yang diubah menjadi pesan yang sama. Terverifikasi di T2: yang kalah mendapat `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` (pre-check Better Auth) atau `FAILED_TO_CREATE_USER` (unique index); keduanya menjadi error register di UI |
| Seed dijalankan dua kali bersamaan | Unique email; seed melewati email yang ada | Tidak ada akun ganda |

Invariant R20 ("minimal satu superadmin aktif") dijaga oleh dua aturan: tidak ada yang bisa menonaktifkan atau mencabut dirinya sendiri, dan aktor harus superadmin aktif di baris yang terkunci. Dengan dua aturan itu, superadmin terakhir yang aktif tidak bisa dihapus oleh siapa pun.

## 5. Schemas (Zod)

| Schema | Input or output | Fields and rules | Used by |
|---|---|---|---|
| `usernameSchema` | input | `trim`, 3 to 30, `^[a-zA-Z0-9_.]+$` (sama dengan validator bawaan plugin) | `registerSchema` |
| `passwordSchema` | input | 8 to 128 | `registerSchema`, `loginSchema` (max saja) |
| `registerSchema` | input | `name` (trim, 1 to 100), `username`, `email` (`z.email()`, max 254), `password`, `confirmPassword`; refine: sama dengan `password`, error di `confirmPassword` | `RegisterForm` |
| `loginSchema` | input | `identifier` (trim, 1 to 254), `password` (1 to 128) | `LoginForm` |
| `accountStatusSchema`, `roleSchema` | both | `z.enum(accountStatuses)`, `z.enum(roles)` | tabel, DTO, input |
| `listAccountsInputSchema` | input | `status` (opsional, `accountStatusSchema`), `page` (int ≥ 1, `.catch(1)`), `pageSize` (20), `sort` (allow-list `pendingFirst`, `createdAtDesc`) | `listAccounts`, search params `/users` |
| `changeAccountStatusSchema` | input | `userId` (`z.uuid()`), `expectedStatus`, `nextStatus` | `changeAccountStatus` |
| `changeAccountRoleSchema` | input | `userId`, `expectedRole`, `nextRole` | `changeAccountRole` |
| `currentUserSchema` (DTO) | output | `id`, `name`, `username`, `status`, `role` | `getCurrentUser` |
| `accountRowSchema` (DTO) | output | `id`, `name`, `username`, `email`, `status`, `role`, `createdAt` (ISO string) | `listAccounts` |

Batas numerik diberi nama konstan (lint magic number).

## 6. Server functions and routes

| Name | Kind | Method | Purpose | Input schema | Output DTO | Auth / permission | Side effects |
|---|---|---|---|---|---|---|---|
| `getCurrentUser` | server function | GET | pengguna untuk guard dan shell | none | `CurrentUser \| null` | `withSession` (sesi opsional; hanya baris sendiri) | none |
| `listAccounts` | server function | GET | tabel manajemen pengguna | `listAccountsInputSchema` | `{ items: AccountRow[], page, pageSize, total }` | `requireActiveSuperadmin` | none |
| `changeAccountStatus` | server function | POST | aktifkan, tolak, nonaktifkan | `changeAccountStatusSchema` | `Result<AccountRow>` | `requireActiveSuperadmin` + pemeriksaan ulang di transaksi | log `info` `auth.account_status_changed` (actorId, targetId, from, to); invalidasi `authKeys.accounts()` |
| `changeAccountRole` | server function | POST | angkat dan cabut superadmin | `changeAccountRoleSchema` | `Result<AccountRow>` | sama | log `info` `auth.account_role_changed`; invalidasi `authKeys.accounts()` |
| `/api/auth/$` | server route (Better Auth) | GET, POST | sign-up, sign-in email dan username, sign-out, get-session | divalidasi Better Auth; `hooks.before` untuk username | respons Better Auth | Better Auth (origin dan Fetch Metadata, `better-auth.md` rule 9) | sesi dan cookie |

`listAccounts`: paginasi offset (tabel admin dengan total), `pageSize` tetap 20, sort hanya dari allow-list, dengan tie-breaker `id` (`drizzle-postgres.md` rule 16).

**Errors.**

| Case | PRD EC id | `kind` | Code | What the user sees |
|---|---|---|---|---|
| Email sudah dipakai | EC1 | dari Better Auth | `USER_ALREADY_EXISTS`, `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` | "Email sudah dipakai" di kolom email |
| Username sudah dipakai | EC2 | dari Better Auth | `USERNAME_IS_ALREADY_TAKEN` | "Username sudah dipakai" di kolom username |
| Username tidak sah atau kosong di server | EC3 | dari Better Auth / hook | `INVALID_USERNAME`, `USERNAME_TOO_SHORT`, `AUTH_USERNAME_REQUIRED` | pesan di kolom username |
| Login gagal | EC6 | dari Better Auth | `INVALID_EMAIL_OR_PASSWORD`, `INVALID_USERNAME_OR_PASSWORD` | satu teks yang sama (R8) |
| Terlalu banyak percobaan | EC7 | HTTP 429 | n/a | banner "Terlalu banyak percobaan, coba lagi nanti" |
| Tanpa sesi saat memanggil fungsi yang butuh sesi | EC9, EC19 | `unauthorized` | `AUTH_REQUIRED` | `beforeLoad` sudah mengalihkan; bila tetap terjadi, navigasi ke `/login` |
| Pengguna belum aktif membuka `/` atau `/users` | EC10 | n/a: pengalihan oleh `resolveAccessRedirect` di `beforeLoad`, bukan kegagalan server function | n/a | dialihkan ke `/status` |
| Pengguna aktif berrole `user`, atau superadmin yang dicabut atau dinonaktifkan, memanggil fungsi superadmin | EC11, EC17 | `forbidden` | `NOT_ACTIVE_SUPERADMIN` | "Anda tidak punya akses" |
| Status target sudah berubah | EC14 | `conflict` | `ACCOUNT_STATUS_CHANGED` | "Status akun sudah berubah. Daftar dimuat ulang" |
| Role target sudah berubah | EC14, EC16 | `conflict` | `ACCOUNT_ROLE_CHANGED` | "Role akun sudah berubah. Daftar dimuat ulang" |
| Aksi terhadap diri sendiri | EC15 | `forbidden` | `CANNOT_CHANGE_SELF` | "Anda tidak bisa mengubah akun sendiri" |
| Transisi status tidak sah | EC14 (sisi lain) | `conflict` | `INVALID_STATUS_TRANSITION` | "Aksi ini tidak berlaku untuk status akun saat ini" |
| Mengangkat pengguna yang tidak aktif | EC18 | `conflict` | `TARGET_NOT_ACTIVE` | "Hanya pengguna aktif yang bisa dijadikan superadmin" |
| Akun target tidak ada | n/a | `not_found` | `ACCOUNT_NOT_FOUND` | "Akun tidak ditemukan. Daftar dimuat ulang" |
| Seed dengan konfigurasi production | EC20 | n/a (script berhenti, exit 1) | n/a | pesan di terminal |

## 7. Queries, mutations, and cache

| Query options | Server function | Key | `staleTime` | Used by |
|---|---|---|---|---|
| `currentUserQueryOptions()` | `getCurrentUser` | `authKeys.currentUser()` = `['auth', 'current-user']` | 0, supaya perubahan status terlihat pada navigasi berikutnya (R21) | `beforeLoad` `_guest`, `_status`, `_app`; `AppShell` data; Beranda |
| `accountsQueryOptions(input)` | `listAccounts` | `authKeys.accounts(input)` = `['auth', 'accounts', input]` | default 30 s | loader `_app/users`, `UserManagementView` |

| Mutation (hook) | Server function | Invalidates or updates | Optimistic? |
|---|---|---|---|
| `useSignUp` | `authClient.signUp.email` | `authKeys.currentUser()` | no |
| `useSignIn` | `authClient.signIn.email` / `authClient.signIn.username` | `authKeys.currentUser()` | no |
| `useSignOut` | `authClient.signOut` | `queryClient.clear()` | no |
| `useChangeAccountStatus` | `changeAccountStatus` | `invalidateFeature(authScope)` saat `data.ok`; saat `conflict` atau `not_found` juga invalidasi | no |
| `useChangeAccountRole` | `changeAccountRole` | sama | no |

`dependsOn`: n/a, tidak ada data fitur lain.

## 8. Routes and UI
**Navigation:** `/login` dan `/register` saling bertautan di bawah form. Sidebar: Beranda (semua pengguna aktif), Manajemen pengguna (hanya `superadmin`; ditambahkan oleh task manajemen pengguna). Pengguna `user` tidak melihat menu itu, dan URL langsung menampilkan "Anda tidak punya akses".

**Pages and routes:**

| Route (URL) | Title | Description | Search params | Loader prefetch |
|---|---|---|---|---|
| `/login` | Masuk | form login | none | none (guard memakai `currentUserQueryOptions` di `beforeLoad`) |
| `/register` | Daftar | form register | none | none |
| `/status` | Status akun | halaman status | none | `currentUserQueryOptions` (blocking, lewat `beforeLoad`) |
| `/` | Beranda | sapaan | none | `currentUserQueryOptions` (blocking) |
| `/users` | Manajemen pengguna | tabel akun | `status` (enum, `.catch(undefined)`), `page` (`.catch(1)`), `sort` (`.catch('pendingFirst')`) | `accountsQueryOptions(search)` (blocking) |

**Components:**

| Component | Location | Description | Key props | Uses | States |
|---|---|---|---|---|---|
| `AuthSplitLayout` | `features/auth/components/` | dua kolom: form dan gambar `/bdh.avif` | `children`, `imageAlt` | `Card` | n/a |
| `LoginForm` | `features/auth/components/` | satu kolom identitas + password | none | TanStack Form, `loginSchema`, `useSignIn`, `Field`, `Input`, `Button` | idle, mengirim, error (banner, kolom) |
| `RegisterForm` | `features/auth/components/` | lima kolom | none | `registerSchema`, `useSignUp` | idle, mengirim, error |
| `AccountStatusView` | `features/auth/components/` | teks status, Periksa lagi, Keluar | `status` | `useSignOut`, `currentUserQueryOptions` | success |
| `UserManagementView` | `features/auth/components/` | saringan, tabel, paginasi | `search` | `accountsQueryOptions`, `AccountsTable` | loading (skeleton), empty, error (banner), success |
| `AccountsTable` | `features/auth/components/` | tabel baris akun | `rows`, `currentUserId` | `Table`, `Badge`, `formatDateTime` | empty |
| `AccountRowActions` | `features/auth/components/` | tombol aksi per status | `row`, `isSelf` | `DropdownMenu`, `ConfirmAccountActionDialog` | pending (nonaktif) |
| `ConfirmAccountActionDialog` | `features/auth/components/` | konfirmasi aksi | `action`, `row`, `onConfirm` | `AlertDialog`, hooks mutasi | mengirim, error |
| `AppShell` | `shared/ui/app-shell.tsx` | sidebar ciut ke ikon, menu, menu pengguna | `navItems`, `user`, `onSignOut`, `children` | `Sidebar*`, `DropdownMenu`, `Avatar` | n/a |

**Layout sketch** (`03-prototype.md` tidak punya sketsa):

```text
/login, /register (md ke atas)              /login, /register (kecil)
+-------------------+-------------------+   +-------------------+
| Judul             |                   |   | Judul             |
| [Username/email]  |   bdh.avif        |   | [Username/email]  |
| [Password]        |   (object-cover)  |   | [Password]        |
| banner error      |                   |   | banner error      |
| [Masuk]           |                   |   | [Masuk]           |
| Belum punya akun? |                   |   | Belum punya akun? |
+-------------------+-------------------+   +-------------------+

/  dan  /users
+--------+-------------------------------------------+
| logo   | [≡] Manajemen pengguna                    |
| Beranda+-------------------------------------------+
| Penggu-| Status: [Semua v]                         |
|  na    | banner error / "status sudah berubah"     |
|        | Nama | Username | Email | Status | Role | Daftar | [⋯] |
|        | ...  skeleton saat loading                |
|        | "Tidak ada akun dengan status ini"        |
|        | [< 1 2 >]                                 |
| [nama  |                                           |
|  user] |                                           |
+--------+-------------------------------------------+

/status
+-------------------------------+
| Status akun: Menunggu         |
| Akun Anda menunggu persetujuan|
| [Periksa lagi]   [Keluar]     |
+-------------------------------+
```

**Responsive behavior:**

| Region | Small screen | Larger screen |
|---|---|---|
| Gambar login dan register | disembunyikan | kolom kanan (`md` ke atas) |
| Sidebar | `Sheet` yang dibuka tombol (perilaku `sidebar-07`) | tetap, bisa diciutkan ke ikon |
| Tabel akun | geser horizontal di dalam kartu | penuh |

**State location:**

| State | Home | Why |
|---|---|---|
| Pengguna saat ini | Query `authKeys.currentUser()` | server state |
| Daftar akun | Query `authKeys.accounts(input)` | server state |
| Saringan, halaman, urutan | search param `/users` | bisa dibagikan, tahan reload |
| Isi form login dan register | TanStack Form | form |
| Aksi yang sedang dikonfirmasi | state lokal `UserManagementView` | UI sementara |
| Sidebar terbuka atau ciut | cookie dan state `SidebarProvider` (bawaan primitive) | dikelola primitive |

**Primitives from `shared/ui` needed:** sudah ada: `button`. Ditambahkan dengan CLI (skill `add-ui-component`): `card`, `input`, `label`, `field`, `separator` (dari `login-04`); `sidebar`, `sheet`, `tooltip`, `skeleton`, `breadcrumb`, `dropdown-menu`, `avatar`, `collapsible`, `shared/hooks/use-mobile.ts` (dari `sidebar-07`); `table`, `badge`, `alert`, `alert-dialog`, `select`. Komponen contoh block (`login-form`, `app-sidebar`, `nav-*`, `team-switcher`) tidak ditaruh di `shared/ui`; isinya ditulis ulang di `features/auth/components/` dan `shared/ui/app-shell.tsx` tanpa nilai arbitrary.

**Accessibility notes (NFR5):** setiap input punya `Label` terhubung; error kolom memakai `aria-invalid` dan `aria-describedby`; banner error memakai `role="alert"`; fokus pindah ke kolom error pertama saat submit gagal; dialog konfirmasi menjebak fokus (bawaan `AlertDialog`).

## 9. Security considerations
- **Authentication:** semua route kecuali `/login`, `/register`, dan `/api/auth/*` butuh sesi. `getCurrentUser` membaca sesi lewat `auth.api.getSession({ headers })` di `withSession`.
- **Authorization:** `listAccounts`, `changeAccountStatus`, `changeAccountRole`: `requireActiveSuperadmin` di middleware, lalu pemeriksaan ulang aktor di baris terkunci dalam transaksi (section 4). `beforeLoad` hanya UX.
- **Input validation:** section 5; `.validator()` di setiap server function; Better Auth memvalidasi endpoint-nya; `hooks.before` mewajibkan `username`.
- **Status dan role tidak bisa diisi pengguna:** `input: false` (ADR 0038), dites oleh AC4.
- **Cross-site requests:** server function memakai CSRF bawaan Start (tidak ada `src/start.ts`; bila nanti dibuat, `createCsrfMiddleware` ditambahkan). `/api/auth/$` dilindungi origin check Better Auth; `trustedOrigins` hanya `BETTER_AUTH_URL`. `advanced.disableCSRFCheck` dan `disableOriginCheck` tidak disetel (`better-auth.md` rule 9).
- **Data protection:** DTO di section 5; repository memilih kolom yang disebut saja; `accounts.password` tidak pernah dipilih repository kita. Logger meredaksi `email` dan `password` (NFR2).
- **Sesi:** `session.cookieCache` dibiarkan bawaan (`enabled: false`, section 13), sehingga `getSession` membaca baris pengguna setiap request (R21, D10).
- **Retention and deletion:** belum ada (PRD Q2, owner Dana Harliansyah). Sesi kedaluwarsa sesuai bawaan Better Auth.
- **Rate limits:** bawaan Better Auth (S4), aktif di production. `advanced.ipAddress` diatur setelah hosting diketahui (PRD Q4): `TODO(verify)` sebelum Release gate.

## 10. Non-functional requirements, observability, and risks
- **Volume:** jumlah pengguna **Unknown**; tabel akun berpaginasi 20.
- **Heavy client code:** tidak ada.
- **Logging and audit:** `info` untuk `auth.account_status_changed` dan `auth.account_role_changed` (actorId, targetId, from, to); `warn` untuk `forbidden` dari middleware; tidak ada email, nama, atau password di log (`logging.md`).
- **Instrumentation for the PRD metrics:** M1 dihitung dari `users.created_at` dan `users.status_changed_at` (query manual setelah rilis). M2 dihitung dari `status = 'pending'` dan `created_at`. Tidak ada dashboard metric di cut ini.

| Risk | Impact | Mitigation |
|---|---|---|
| T1 gagal membuktikan integrasi (Q3 PRD) | high | Build berhenti; spec dan ADR berubah lewat change log |
| Better Auth tidak menerima enum PostgreSQL atau `uuid` dengan `usePlural` | medium | T1 membuktikannya; cadangan: kolom `text` dengan check constraint |
| Regenerasi CLI menimpa edit S2 | medium | README fitur memuat daftar edit (ADR 0040, 0043) |
| `vitest.config.ts` tidak menerapkan `test.env` sebelum `env.server.ts` dibaca | medium | T1 membuktikannya (ADR 0044, Not verified) |

## 11. Test strategy

Ditulis lebih dulu (test-first): schema, rules, service, middleware, dan `resolveAccessRedirect`. Dikecualikan dari test-first: layout, `AppShell`, dan styling.

| Acceptance criterion or NFR | Level | Test name or location |
|---|---|---|
| AC1 | integration with real DB | `features/auth/__tests__/sign-up.test.ts`: "register membuat akun pending role user dengan username huruf kecil dan sesi" (lewat `auth.api.signUpEmail` dan `auth.handler`) |
| AC2 | unit | `__tests__/schemas.test.ts`: "registerSchema menolak username 2 dan 31 karakter, karakter lain, password 7 karakter, konfirmasi berbeda" |
| AC3 | integration with real DB | `sign-up.test.ts`: "register dengan email atau username beda huruf ditolak, jumlah akun tetap" |
| AC4 | integration with real DB | `sign-up.test.ts`: "status dan role di body register diabaikan" |
| AC5 | integration with real DB | `sign-in.test.ts`: "login dengan username huruf besar dan email huruf besar berhasil" |
| AC6 | integration with real DB + manual check | `sign-in.test.ts`: "sign-out menghapus sesi"; QA: logout dari dashboard dan halaman status |
| AC7 | integration with real DB + unit | `sign-in.test.ts`: "password salah dan username tak dikenal tidak membuat sesi"; `__tests__/auth-messages.test.ts`: "dua kode login gagal memetakan ke teks yang sama" |
| AC8, AC9, AC10, AC11 | unit + manual check | `__tests__/access-redirect.test.ts`: tabel pengalihan section 1 untuk setiap layout dan status; QA: setiap baris di browser |
| AC12 | manual check | QA: menu per role, sidebar ciut ke ikon |
| AC13 | integration with real DB | `__tests__/accounts.functions.test.ts`: "listAccounts dan change* menolak pengguna aktif role user" |
| AC14 | integration with real DB | `__tests__/accounts.service.test.ts`: "listAccounts hanya mengembalikan kolom DTO, saringan, urutan pending dulu, kosong" |
| AC15 | unit + integration | `__tests__/accounts.rules.test.ts`: transisi sah dan tidak sah; `accounts.service.test.ts`: "aktifkan, tolak, nonaktifkan, aktifkan kembali" |
| AC16 | integration with real DB | `accounts.service.test.ts`: "getCurrentUserDto melihat status baru tanpa login ulang" |
| AC17 | integration with real DB | `accounts.service.test.ts`: "angkat pengguna aktif; tolak mengangkat pengguna pending (TARGET_NOT_ACTIVE)" |
| AC18 | unit + integration | `accounts.rules.test.ts`: "aksi terhadap diri sendiri ditolak"; `accounts.service.test.ts`: request langsung ditolak, data tetap |
| AC19 | integration with real DB | `accounts.service.test.ts`: "superadmin yang dicabut tidak bisa beraksi" |
| AC20, NFR4 | integration with real DB (concurrent) | `__tests__/accounts.concurrency.test.ts`: "aktifkan dan tolak bersamaan: satu ok, satu ACCOUNT_STATUS_CHANGED"; "saling cabut role bersamaan: tepat satu superadmin aktif" |
| AC21, NFR1 | integration (handler, rate limit diaktifkan di tes) | `sign-in.test.ts`: "permintaan keempat dalam 10 detik ke /sign-in/username mendapat 429" |
| AC22 | integration with real DB | `__tests__/seed.service.test.ts`: "seed dua kali: satu superadmin, satu akun per status, tanpa duplikat; superadmin bisa login" |
| AC23 | unit | `__tests__/seed-guard.test.ts`: "seed menolak NODE_ENV=production dan SEED_ALLOW bukan true" |
| AC24, NFR2 | integration + audit | `sign-in.test.ts`: "log yang ditangkap tidak memuat password"; query `accounts.password` bukan teks asli |
| AC25 | manual check | QA: layar lebar dan sempit |
| AC26, NFR5 | manual check | QA: keyboard dan screen reader (VoiceOver) |
| NFR3 | integration with real DB | sama dengan AC13 |
| NFR6 | integration with real DB | sama dengan AC14 |

## 12. Rollout and rollback
- Urutan: merge ke `main` → staging otomatis. Production: `pnpm db:migrate` dengan URL production, lalu deploy kode, setelah Release gate. Seed tidak pernah dijalankan di staging atau production.
- Rollback (trigger PRD section 11): deploy ulang versi sebelumnya; tabel auth tetap (diterima, `05-architecture-review.md` Gate review pertanyaan 5).
- Langkah platform: `TODO(verify)`, karena setup hosting belum ditulis (ADR 0007, 0017).

## 13. Library APIs to be used (verified)

| Library@version | API | Source URL | Verified on |
|---|---|---|---|
| better-auth@1.7.18 | `betterAuth`, `emailAndPassword.enabled`, `user.additionalFields` (`type`, `input: false`, `defaultValue`) | https://better-auth.com/docs/concepts/typescript#the-input-property | 2026-11-07 |
| better-auth@1.7.18 | `drizzleAdapter(db, { provider: 'pg', schema, usePlural })` dari `better-auth/adapters/drizzle` | `@better-auth/drizzle-adapter@1.7.18` `dist/index.d.mts` (`DrizzleAdapterConfig`); https://better-auth.com/docs/adapters/drizzle | 2026-11-07 |
| @better-auth/core@1.7.18 | `advanced.database.generateId: "uuid"` (PostgreSQL: `gen_random_uuid()`) | `dist/types/init-options.d.mts` line 369–384 (tarball npm) | 2026-11-08 |
| @better-auth/core@1.7.18 | `session.cookieCache.enabled` (`@default false`) | `dist/types/init-options.d.mts` line ~1014 | 2026-11-08 |
| @better-auth/core@1.7.18 | `hooks.before`, `disabledPaths`, `trustedOrigins`, `baseURL`, `secret`, `rateLimit` | `dist/types/init-options.d.mts` (opsi 495, 527, 1271, 1275, 1536, 1551) | 2026-11-08 |
| better-auth@1.7.18 | `createAuthMiddleware`, `APIError` dari `better-auth/api` | `dist/api/index.d.mts` (export); https://better-auth.com/docs/concepts/hooks | 2026-11-08 (bentuk `ctx.path` dan `ctx.body`: `TODO(verify)` di T1) |
| better-auth@1.7.18 | aturan rate limit bawaan: path `/sign-in*`, `/sign-up*` 10 detik, 3 request | `dist/api/rate-limiter/index.mjs` `getDefaultSpecialRules` | 2026-11-08 |
| better-auth@1.7.18 | email dinormalisasi huruf kecil saat sign-up dan sign-in | `dist/api/routes/sign-up.mjs` line 158, `sign-in.mjs` line 317 | 2026-11-08 |
| better-auth@1.7.18 | `username({ immutableUsername, displayUsername })`, `signIn.username`, kode `INVALID_USERNAME_OR_PASSWORD`, `USERNAME_IS_ALREADY_TAKEN`, `INVALID_USERNAME`, `USERNAME_TOO_SHORT` | https://better-auth.com/docs/plugins/username; `dist/plugins/username/error-codes.mjs` | 2026-11-08 |
| @better-auth/core@1.7.18 | kode `INVALID_EMAIL_OR_PASSWORD`, `USER_ALREADY_EXISTS`, `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` | `dist/error/codes.mjs` | 2026-11-08 |
| better-auth@1.7.18 | `tanstackStartCookies()` dari `better-auth/tanstack-start`, plugin terakhir | https://better-auth.com/docs/integrations/tanstack | 2026-11-07 |
| better-auth@1.7.18 | `auth.handler(request)`, `auth.api.getSession({ headers })`, `auth.api.signUpEmail({ body })` | https://better-auth.com/docs/integrations/tanstack; /docs/authentication/email-password | 2026-11-07 |
| better-auth@1.7.18 | `createAuthClient` dari `better-auth/react`; `usernameClient`, `inferAdditionalFields` dari `better-auth/client/plugins`; `signUp.email`, `signIn.email`, `signIn.username`, `signOut` | `dist/client/react/index.d.mts`, `dist/client/plugins/index.d.mts`; docs username dan email-password | 2026-11-08 |
| @tanstack/react-start@1.169.4 | `createServerFn({ method }).middleware().validator().handler()`; `getRequestHeaders` dari `@tanstack/react-start/server` | installed `start-client-core@1.170.39` `createServerFn.d.ts`; `docs/04-stack/tanstack-start.md` | 2026-11-07 |
| drizzle-orm@1.0.0-rc.5 | `pgTable`, `pgEnum`, `uuid`, `text`, `boolean`, `timestamp({ withTimezone: true })`, `index`, `uniqueIndex`, `.for('update')`, `db.transaction` | `docs/04-stack/drizzle-postgres.md`, `drizzle-concurrency.md` (diverifikasi pada versi ini, ADR 0014, 0032) | 2026-11-08 (dibaca ulang saat T1 memasang paket) |
| pg@8.23.1 | `Pool({ connectionString, max, idleTimeoutMillis, connectionTimeoutMillis })`; `sslmode=verify-full` → `ssl: true` | `drizzle-postgres.md` rule 4; README `pg-connection-string` | 2026-11-07 |

Belum diverifikasi, dan dibuktikan di T1 atau task terkait: `@tanstack/react-form`, `@tanstack/react-query`, `@tanstack/react-router-ssr-query`, `pino`, dan `tsx` dibaca dari docs saat dipasang (`verify-library-docs`), karena versinya belum terpasang.

## 14. Change log

| Date | Change | Reason | Re-approved by |
|---|---|---|---|
| 2026-11-08 | Section 4: hasil `TODO(verify)` register bersamaan diisi | Diverifikasi di T2 (`sign-up.test.ts`) | Dana Harliansyah (Product Owner, Tech Lead), 2026-11-08, via chat (round 4) |
| 2026-11-08 | Section 2 (S3) dan 6: kode `USERNAME_REQUIRED` menjadi `AUTH_USERNAME_REQUIRED` | Temuan review T1 R1-15: kode milik fitur diberi prefiks (`error-handling.md`); kode bawaan Better Auth tetap | Dana Harliansyah (Product Owner, Tech Lead), 2026-11-08, via chat (round 3) |
| 2026-11-08 | Section 4: `sessions.updated_at` dan `accounts.updated_at` tanpa default (koreksi teks agar sesuai output CLI dan migration T1) | Temuan review T1 R1-12 | Dana Harliansyah (Product Owner, Tech Lead), 2026-11-08, via chat (round 3) |
| 2026-11-08 | Section 7: loader `/status` memanggil `currentUserQueryOptions()` tanpa `staleTime: 'static'` (pengecualian dari `tanstack-query.md` rule 4 untuk query pengguna saat ini) | Temuan review T1 R1-4: `'static'` membuat status lama tampil dulu, melawan R21 | Dana Harliansyah (Product Owner, Tech Lead), 2026-11-08, via chat (round 3) |
| 2026-11-08 | Section 3: `server/auth.ts` → `server/auth.repository.ts`; `server/auth.middleware.ts` → `server/session.functions.ts`; `server/auth-handler.ts` → `server/session.service.ts` | `check:gates` di T1: file di `server/` harus cocok dengan kategori boundary (`*.functions.ts`, `*.service.ts`, `*.repository.ts`, `*.rules.ts`, `*.listeners.ts`); perilaku dan public API tetap | Dana Harliansyah (Product Owner, Tech Lead), 2026-11-08, via chat (round 2) |

## 15. Spec gate review

| Question | Answer and where |
|---|---|
| Is every in-scope PRD item placed in this spec, or removed through a change log? | Ya: R1–R25 di section 1, 3, 6; NFR1–NFR6 di section 9–11; M1 dan M2 di section 10; EC1–EC21 di section 1 dan 6 |
| Does every Architecture Review decision and public export reach this spec (tier L)? | Ya: D1–D13 di section 2–9; export `authScope` dan `resolveAccessRedirect` disetujui di `05-architecture-review.md` round 2 |
| Does the owning feature pass the qualification in section 2, with a stated boundary? | Ya: section 2 merujuk `05-architecture-review.md` section 1 |
| Is every new public export, cross-feature call, table, and dependency listed, each new dependency with an ADR? | Ya: section 2 (dependency dengan ADR 0007, 0008, 0039, 0042, 0045) dan section 4 (4 tabel, 2 enum) |
| Does every AC and NFR have a test in section 11? | Ya; AC12, AC25, AC26 manual check di QA (belum ada Testing Library atau Playwright), sesuai verifikasi NFR5 di PRD |
| For a feature with UI: has a product owner reviewed section 8? | Ya: Dana Harliansyah (Product Owner), 2026-11-08, via chat: "section 8 sesuai" |
| Is authorization stated per function, and enforced outside `beforeLoad`? | Ya: section 6 (kolom Auth) dan section 9; aktor diperiksa ulang di baris terkunci (section 4) |
| Can the migration and the release be rolled back, or is the reason it cannot accepted by name? | Ya sebelum rilis production; setelahnya hanya kode, diterima oleh Dana Harliansyah (Software Architect) di `05-architecture-review.md` |
| Is any sentence true of any feature (`docs/03-standards/writing.md`)? | Tidak ditemukan |

| Round | Date | Reviewer | Verdict | Findings, or notes and their owner |
|---|---|---|---|---|
| 1 | 2026-11-08 | Dana Harliansyah (Product Owner, Tech Lead) | approve | Pesan reviewer: "06-feature-spec auth: approve, jawaban section 15 sesuai rekomendasi. 07-tasks auth: approve with notes, jawaban sesuai rekomendasi, terapkan 3 catatan, T1 tetap satu" |
| 2 | 2026-11-08 | Dana Harliansyah (Product Owner, Tech Lead) | approve | Pesan reviewer: "06-feature-spec auth: setujui perubahan section 3 (auth.repository.ts, session.service.ts, session.functions.ts)". Menyetujui change log 2026-11-08 (nama file di section 3) |
| 3 | 2026-11-08 | Dana Harliansyah (Product Owner, Tech Lead) | approve | Pesan reviewer: "PR #1 approve. PR #2 approve with notes: rename ke AUTH_USERNAME_REQUIRED sebelum merge, tes Origin otomatis + ADR 0046 di T2, cek Cache-Control RPC di T2. Setujui koreksi spec section 4 dan 7.". Menyetujui change log 2026-11-08: section 4 (`updated_at`), section 7 (loader `/status`), dan kode `AUTH_USERNAME_REQUIRED` |
| 4 | 2026-11-08 | Dana Harliansyah (Product Owner, Tech Lead) | approve | Pesan reviewer: "PR #3 approve. ADR 0046 accepted. Konfirmasi koreksi spec section 4." Menyetujui change log 2026-11-08: hasil register bersamaan di section 4 |
