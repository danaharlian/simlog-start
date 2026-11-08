# Review Log: Auth (register, login, logout, aktivasi akun oleh superadmin)

- Slug: `auth` (file `08-review-log.md`)
- Task Breakdown: `07-tasks.md`
- Status: draft
- Decided by: pending
- Gate: PR gate
- Tier: L

## T1: Register tersimpan di PostgreSQL dan `/status` membaca status dari database

### Round 1: 2026-11-08
- **PR:** https://github.com/danaharlian/simlog-start/pull/2 (stacked on #1) · **Commit reviewed:** `b201d5f`
- **Review passes:** separate-context pass (`code-review`): subagent general-purpose dengan konteks baru, read-only, 2026-11-08 · human review: Dana Harliansyah (Tech Lead), 2026-11-08, via chat
- **Verdict:** request changes (subagent, on `b201d5f`); approve with notes (Dana Harliansyah, on `9ac1dc1`, with the rename applied in `f9368a9`)

| ID | File:line | Review pass | Severity | Finding | Resolution | Status |
|---|---|---|---|---|---|---|
| R1-1 | `__tests__/accounts.service.test.ts:29` | tests | Blocking | Tes "AC16/D10" hanya `SELECT` by id, tidak pernah lewat `getSession`, cookie, atau header; jalur sesi tanpa tes | Fixed in `bb9fcb9`: `__tests__/session.service.test.ts` menguji `readSessionUserId` dengan cookie sign-up, tanpa cookie, dan token yang diubah, serta status baru lewat sesi yang sama; tes lama diganti nama | resolved |
| R1-2 | PR description | evidence | Blocking | Bukti `build`, `db:generate`, `db:migrate:test`, `drizzle-kit check`, dan cek manual tidak terlihat oleh reviewer | Semua sudah dijalankan sebelum review dan ada di draf deskripsi PR (scratchpad), yang tidak dibaca reviewer. Diulang setelah `bb9fcb9`: build PASS, `drizzle-kit check` bersih, bundle client tanpa kode server | resolved |
| R1-3 | `server/accounts.functions.ts:7` | security | Non-blocking | GET yang bergantung pada identitas tanpa `Cache-Control` | Fixed in `bb9fcb9`: `withSession` menyetel `Cache-Control: private, no-store` dan `Vary: Cookie`; terlihat di respons SSR `/status` (curl) | resolved |
| R1-4 | `routes/_status/status.tsx:7` | data fetching | Non-blocking | `staleTime: 'static'` di loader melawan R21 | Fixed in `bb9fcb9`: loader tanpa override; dicatat di change log spec (section 7), menunggu konfirmasi reviewer | resolved |
| R1-5 | `routes/__root.tsx` | UI | Non-blocking | Tidak ada `errorComponent` | Fixed in `bb9fcb9`: `RootError` dengan pesan umum dan tombol coba lagi | resolved |
| R1-6 | `docs/04-stack/better-auth.md:22` | docs, security | Non-blocking | Fakta `input: false` hanya setengah benar; `/update-user` tidak dites | Fixed in `bb9fcb9`: kalimat dikoreksi; tes `/update-user` (status, role) ditolak 400 dan baris tetap; sign-up dengan `statusChangedAt` ditolak 400 | resolved |
| R1-7 | `/api/auth/*` | security | Non-blocking | Pemeriksaan Origin (rule 9) tidak ada di task mana pun | Tes Vitest menunjukkan 200: Better Auth 1.7.18 melewati origin check saat `NODE_ENV=test` (`context/create-context.mjs`). Dibuktikan di dev server dengan curl: Origin asing 403, cross-site navigation 403, same origin 200. Dicatat di `better-auth.md` rule 9. Keputusan terbuka: lihat "Decisions" | resolved; tes otomatis dan ADR 0046 dipindah ke T2 (keputusan reviewer) |
| R1-8 | `docs/decisions/0041-…md:21` | scope | Non-blocking | Perubahan ADR tanpa baris change log dan tanpa decider | Fixed in `bb9fcb9`: baris change log di `07-tasks.md` dan baris `Amended:` di ADR | resolved |
| R1-9 | `shared/db/columns.ts` | design | Non-blocking | `timestamps` tanpa pemakai | Fixed in `bb9fcb9`: dihapus, dicatat di change log | resolved |
| R1-10 | `docs/03-standards/testing.md:20` | docs | Non-blocking | Rule 1 bertentangan dengan ADR 0044 point 4 | Fixed in `bb9fcb9` | resolved |
| R1-11 | `07-tasks.md:64` | scope | Non-blocking | Nama tes berbeda dari rencana | Fixed in `bb9fcb9`: dicatat di change log | resolved |
| R1-12 | `06-feature-spec.md:168,174` | spec | Non-blocking | Spec memberi `updated_at` default `now()` di `sessions` dan `accounts`; migration tidak | Fixed in `bb9fcb9`: section 4 dikoreksi lewat change log, menunggu konfirmasi reviewer | resolved |
| R1-13 | `features/auth/README.md:36` | docs | Non-blocking | Kalimat tanda kutip terbalik | Fixed in `bb9fcb9` | resolved |
| R1-14 | `__tests__/sign-up.test.ts` | tests | Non-blocking | Tes `createdAt` tidak menangkap bug zona di UTC | Fixed in `bb9fcb9`: tes berjalan dengan `TZ=Asia/Jakarta` | resolved |
| R1-15 | `errors.ts:2` | spec | Non-blocking | `USERNAME_REQUIRED` tanpa prefiks fitur (`error-handling.md`) | Fixed in `f9368a9`: `AUTH_USERNAME_REQUIRED`, spec section 2 dan 6 lewat change log (Spec gate round 3) | resolved |
| R1-16 | `server/auth.repository.ts` | design | Non-blocking | `cookieCache` bergantung pada default | Fixed in `bb9fcb9`: `session.cookieCache.enabled: false` eksplisit | resolved |

**Unverified:**
- Header `Cache-Control` pada panggilan RPC server function dari client: hanya respons SSR yang dicek; middleware yang sama berlaku untuk keduanya (**Inferred**). Dicek saat T2 memakai navigasi client.
- Bahwa persetujuan Spec gate round 2 benar-benar diberikan: tercatat dengan kutipan di `06-feature-spec.md`. Hanya reviewer manusia yang bisa mengonfirmasinya.

**Decisions made in review:**
- Pemeriksaan Origin dibuat otomatis di T2 dengan `advanced.disableOriginCheck: false` dan ADR 0046 yang meluruskan `better-auth.md` rule 9 (change log `07-tasks.md`).
- Header `Cache-Control` pada panggilan RPC dari client dicek di T2 (change log `07-tasks.md`).
- Koreksi spec section 4 dan 7, dan kode `AUTH_USERNAME_REQUIRED`: disetujui di Spec gate round 3 (`06-feature-spec.md`).

**Outcome:** blocking findings resolved: yes · PR gate passed by Dana Harliansyah (Tech Lead), 2026-11-08, via chat: "PR #1 approve. PR #2 approve with notes: rename ke AUTH_USERNAME_REQUIRED sebelum merge, tes Origin otomatis + ADR 0046 di T2, cek Cache-Control RPC di T2. Setujui koreksi spec section 4 dan 7." Catatan "rename sebelum merge" diterapkan di `f9368a9`.

## T2: Register, login, logout, dan pengalihan tamu

### Round 1: 2026-11-08
- **PR:** https://github.com/danaharlian/simlog-start/pull/3 · **Commit reviewed:** `f5ce237`
- **Review passes:** separate-context pass (`code-review`): subagent general-purpose dengan konteks baru, read-only, 2026-11-08 · human review: Dana Harliansyah (Tech Lead), 2026-11-08, via chat
- **Verdict:** request changes (subagent, on `f5ce237`); approve (Dana Harliansyah, on `0dd48b6`)

| ID | File:line | Review pass | Severity | Finding | Resolution | Status |
|---|---|---|---|---|---|---|
| R1-B1 | `__tests__/sign-in.test.ts:145`, `sign-up.test.ts:167` | tests, security | Blocking | Tes log menyadap `console` dan `process.stdout.write`, padahal pino menulis langsung ke fd 1; tes bisa hijau walau email bocor | Fixed in `831dfaa`: tes menyadap `logger` pino bersama, dengan positive control; mutasi yang meneruskan argumen tambahan membuat tes gagal (dicek 2026-11-08) | resolved |
| R1-B2 | `docs/decisions/0046-…md:3` | governance | Blocking | ADR 0046 `accepted` untuk poin yang belum diputuskan manusia | Fixed in `831dfaa`: `Status: proposed`, dipindah ke bagian Proposed; diputuskan di PR gate T2 | resolved (keputusan reviewer) |
| R1-S1 | `server/auth.repository.ts:52` | security | Non-blocking | Pesan `info` Better Auth memuat email; aman hanya karena level bawaan `warn` | Fixed in `831dfaa`: `level: "warn"` eksplisit, komentar merujuk `sign-up.mjs`; teks ADR dikoreksi | resolved |
| R1-S2 | `__tests__/sign-in.test.ts:231` | security, tests | Non-blocking | Tabel rule 9 untuk sign-in tidak lengkap; `/sign-in/email` tanpa tes | Fixed in `831dfaa`: empat kasus untuk `/sign-in/username` dan `/sign-in/email` | resolved |
| R1-S3 | ADR 0046 | docs | Non-blocking | Pemicu penghapusan workaround tidak bisa terpicu | Fixed in `831dfaa`: cek `plugins/username/index.mjs` pada upgrade | resolved |
| R1-S4 | `hooks/use-sign-*.ts` | UI errors | Non-blocking | Kegagalan jaringan tidak menampilkan apa pun | Fixed in `831dfaa`: `runAuthCall` (tes ditulis dulu, gagal pada stub) | resolved |
| R1-S5 | `components/account-status-view.tsx` | UI errors | Non-blocking | Gagal keluar dan gagal "Periksa lagi" diam | Fixed in `831dfaa`: banner pesan | resolved |
| R1-S6 | `login-form.tsx`, `register-form.tsx`, `use-sign-out.ts` | components | Non-blocking | Komponen fitur memilih tujuan navigasi | Fixed in `831dfaa`: `onSignedIn`, `onRegistered`, `onSignedOut` dari route | resolved |
| R1-S7 | form login dan register | tests | Non-blocking | Tidak ada tes server error ke kolom, banner, dan fokus | Declined untuk otomatis: belum ada lingkungan DOM (butuh ADR). Dicatat sebagai manual check QA di change log `07-tasks.md` | resolved (pengecualian dicatat) |
| R1-S8 | `07-tasks.md`, `08-review-log.md` | evidence | Non-blocking | Tidak ada bukti `Cache-Control` pada RPC | Bukti sudah ada di deskripsi PR #3 (tidak dibaca reviewer). Diulang setelah `831dfaa` dengan curl ke `/_serverFn/…`: `cache-control: private, no-store`, `vary: Cookie` | resolved |
| R1-S9 | `07-tasks.md:248`, spec section 4 | scope, spec | Non-blocking | `readPgError` dipindah ke T2 tanpa dibuat; perubahan spec section 4 butuh persetujuan | Fixed in `831dfaa`: baris change log; spec section 4 menunggu konfirmasi reviewer | resolved (keputusan reviewer) |
| R1-S10 | `routes/_status/status.tsx:8` | data fetching | Non-blocking | `getCurrentUser` dipanggil dua kali per navigasi | Fixed in `831dfaa`: loader dihapus; guard mengisi cache | resolved |
| R1-N | beberapa file | nits | Non-blocking | Pesan `max` Inggris, email tanpa trim, default tak bertipe, validasi per ketikan, `aria-required`, nama tipe props, `role="alert"` ganda, `h1` hilang, `USERNAME_TOO_LONG`, identitas tidak sah di login, AC3 tanpa cek baris kedua, file di luar daftar | Fixed in `831dfaa`. Tidak dikerjakan: `className` di wrapper (belum ada pemakai, YAGNI) dan letak `sign-in-method.ts` (lolos lint, pola mapper di `components/`) | resolved |

**Unverified:** fokus ke error pertama, pembaca layar, dan layout gambar (AC25, AC26, NFR5) diperiksa manual di QA. Perilaku `createAuthClient()` tanpa `baseURL` saat SSR: hook hanya dipanggil dari event handler di client (**Inferred**).

**Decisions made in review:** ADR 0046 (ketiga poin) accepted; koreksi spec section 4 (hasil register bersamaan) disetujui di Spec gate round 4.

**Outcome:** blocking findings resolved: yes · PR gate passed by Dana Harliansyah (Tech Lead), 2026-11-08, via chat: "PR #3 approve. ADR 0046 accepted. Konfirmasi koreksi spec section 4."

## T3: Dashboard dan shell `sidebar-07`

### Round 1: 2026-11-08
- **PR:** https://github.com/danaharlian/simlog-start/pull/4 · **Commit reviewed:** `6be8076`
- **Review passes:** separate-context pass (`code-review`): subagent general-purpose dengan konteks baru, read-only, tanpa berpindah branch, 2026-11-08 · human review: Dana Harliansyah (Tech Lead), 2026-11-08, via chat
- **Verdict:** approve setelah should-fix 1 sampai 3 (subagent, on `6be8076`); approve (Dana Harliansyah, on `17fcbac`)

| ID | File:line | Review pass | Severity | Finding | Resolution | Status |
|---|---|---|---|---|---|---|
| R1-S1 | PR #4 | evidence | Non-blocking | Tidak ada catatan cek dev untuk AC T3 | Dicatat di deskripsi PR: AC8 dan AC10 (pending) dicek di dev dengan curl; AC6 dan AC12 dipindah ke QA atas keputusan owner (change log `07-tasks.md`) | resolved |
| R1-S2 | `shared/ui/app-shell.tsx:195` | design | Non-blocking | `shared/ui` menyalin teks fitur auth | Fixed in `87066cb`: semua label lewat props; `SIGN_OUT_TEXT` milik auth | resolved |
| R1-S3 | `shared/ui/app-shell.tsx:155` | accessibility | Non-blocking | Navigasi tanpa landmark | Fixed in `87066cb`: `<nav aria-label>` | resolved |
| R1-N4 | `app-shell.tsx:55` | conventions | Non-blocking | Nama prop boolean | Fixed in `87066cb`: `isSigningOut`, error sebagai teks | resolved |
| R1-N5 | `_app.tsx:52` | design | Non-blocking | Judul header tetap "Beranda" | Dipindah ke T4 lewat change log (`TODO(T4)` di kode) | resolved (T4) |
| R1-N6 | `_app.tsx:32` | design | Non-blocking | Menu aktif dihitung manual | Fixed in `87066cb`: `useMatchRoute` di `AppShell` | resolved |
| R1-N7 | `_app/index.tsx:12` | UI | Non-blocking | Penanganan null tidak konsisten | Fixed in `87066cb` | resolved |
| R1-N8 | `app-shell.tsx:184`, `__root.tsx:66` | accessibility | Non-blocking | Label toggle Inggris; `lang="en"`; judul root scaffold | Fixed in `87066cb` | resolved |
| R1-N9 | `app-shell.tsx:145` | design | Non-blocking | `AppShell` menulis `/` sendiri | Fixed in `87066cb`: prop `homeTo` | resolved |
| R1-N10 | `breadcrumb.tsx`, `collapsible.tsx` | scope | Non-blocking | Primitive belum dipakai | Dicatat di change log; dipakai saat dibutuhkan atau dikeluarkan dari lock oleh person | resolved |
| R1-N11 | `sidebar.tsx` (cookie) | design | Non-blocking | Status sidebar tidak bertahan setelah reload | Dicatat di change log; tidak ada AC | resolved |
| R1-N12 | `aac0afa` | git | Non-blocking | Commit primitive menghapus `routes/index.tsx` dan tanpa `Docs consulted` | PR di-merge squash, jadi riwayat menjadi satu commit; tidak diubah (force-push setelah review dilarang) | resolved |
| R1-N13 | Sheet mobile | UI | Non-blocking | Sheet tidak menutup saat klik item halaman yang sama | Perilaku bawaan block; dicatat, tidak diubah | resolved |

**Unverified:** tampilan pengguna aktif di browser (sidebar ciut ke ikon, Sheet mobile, keyboard di menu pengguna, urutan logout dengan `queryClient.clear()`): manual check di QA dengan akun dari seed T7. `Tooltip.Root` tanpa `Tooltip.Provider`: **Inferred** berjalan.

**Decisions made in review:** cek manual AC6 dan AC12 ditunda ke QA (keputusan owner, 2026-11-08); judul header pindah ke T4.

**Outcome:** blocking findings resolved: yes (tidak ada) · PR gate passed by Dana Harliansyah (Tech Lead), 2026-11-08, via chat: "PR #4 approve."

## T4: Daftar akun untuk superadmin

### Round 1: 2026-11-08
- **PR:** https://github.com/danaharlian/simlog-start/pull/5 · **Commit reviewed:** `f93afc1`
- **Review passes:** separate-context pass (`code-review`): subagent general-purpose dengan konteks baru, read-only, tanpa berpindah branch, 2026-11-08 · human review: Dana Harliansyah (Tech Lead), 2026-11-08, via chat
- **Verdict:** request changes (subagent, on `f93afc1`); approve (Dana Harliansyah, on `6cc413c`)

| ID | File:line | Review pass | Severity | Finding | Resolution | Status |
|---|---|---|---|---|---|---|
| R1-B1 | `__tests__/accounts.authorization.test.ts:36` | security, tests | Blocking | Tidak ada bukti bahwa server function `listAccounts` menolak; tes hanya memanggil fungsi keputusan | Bukti RPC di dev (`5ef23f3`): tanpa sesi `unauthorized` / `AUTH_REQUIRED`; pending `forbidden` / `AUTH_NOT_ACTIVE_SUPERADMIN`; keduanya `cache-control: private, no-store`. Pengguna aktif dan superadmin aktif lewat RPC diperiksa di QA (akun seed T7). Ditambah S1: lupa memeriksa kini gagal typecheck | resolved (dikonfirmasi reviewer: dua kasus RPC cukup, sisanya QA) |
| R1-S1 | `accounts.service.ts:46` | security | Non-blocking | Pola gagal-terbuka bila handler lupa memeriksa | Fixed in `5ef23f3`: `ActiveSuperadmin` (brand Zod) wajib untuk service superadmin | resolved |
| R1-S2 | `session.functions.ts:27` | errors | Non-blocking | Baca DB di middleware di luar error boundary | Fixed in `5ef23f3` (juga `withSession`) | resolved |
| R1-S3 | `session.functions.ts:23` | logging | Non-blocking | Tidak ada log `warn` untuk penolakan | Fixed in `5ef23f3`. **Tidak terlihat** di output dev server; kemungkinan karena `LOG_LEVEL` di `.env` (tidak dibaca agent) | resolved (bukti log terbuka) |
| R1-S4 | `user-management-view.tsx:36` | errors, UI | Non-blocking | Teks error tidak bergantung kode; `AUTH_REQUIRED` tidak ke `/login` | Fixed in `5ef23f3`: `AuthError`, `AUTH_ERROR_TEXT`, loader mengalihkan `AUTH_REQUIRED` | resolved |
| R1-S5 | `routes/_app/users.tsx:19` | data fetching, security | Non-blocking | Cache `'static'` memperlihatkan daftar ke superadmin yang dicabut | Fixed in `5ef23f3` (change log) | resolved |
| R1-S6 | `__tests__/accounts.list.test.ts` | tests | Non-blocking | Tes tidak membuktikan klaimnya di database bersama | Fixed in `5ef23f3`: waktu unik per run, tes tie-breaker, cari berdasarkan id, tes schema; EC21 ke QA (change log) | resolved |
| R1-S7 | `accounts-table.tsx` | design | Non-blocking | Primitive `Table` vs data table `useTable` (`tanstack-table.md`) | Keputusan reviewer: pertahankan `Table`, deviasi dicatat di spec section 2 dan change log `07-tasks.md` | resolved |
| R1-S8 | `07-tasks.md:273` | governance | Non-blocking | Change log mengklaim persetujuan sebelum gate; spec tanpa baris prefiks | Fixed in `5ef23f3` | resolved |
| R1-N | beberapa file | nits | Non-blocking | Batas halaman, teks kosong, SQL mentah, komentar dua koneksi, `z.iso.datetime()`, nama kunci error | Fixed in `5ef23f3` | resolved |

**Unverified:** RPC untuk pengguna aktif dan superadmin aktif (QA); baris log `warn` di output server; perilaku `Select` dengan keyboard dan pembaca layar (QA).

**Decisions made in review:** pola otorisasi `Result` di `context` dengan brand `ActiveSuperadmin` disetujui; prefiks `AUTH_` disetujui; dua kasus RPC sisanya ke QA; S7: pertahankan `Table` (deviasi dicatat). Bukti log `warn` tetap terbuka (`LOG_LEVEL`).

**Outcome:** blocking findings resolved: yes · PR gate passed by Dana Harliansyah (Tech Lead), 2026-11-08, via chat: "T4: pola otorisasi setuju, prefiks AUTH_ setuju, B1 cukup + sisanya QA, S7 pertahankan Table dan catat deviasi. PR #5 approve"

## T5: Perubahan status akun

### Round 1: 2026-11-08
- **PR:** https://github.com/danaharlian/simlog-start/pull/6 · **Commit reviewed:** `e422f66`
- **Review passes:** separate-context pass (`code-review`): subagent general-purpose dengan konteks baru, read-only, tanpa berpindah branch, 2026-11-08 · human review: Dana Harliansyah (Tech Lead), 2026-11-08, via chat
- **Verdict:** approve (subagent, on `e422f66`); approve (Dana Harliansyah, on `173d784`)

| ID | File:line | Review pass | Severity | Finding | Resolution | Status |
|---|---|---|---|---|---|---|
| R1-S1 | `shared/lib/query-scope.ts:14` | tests | Non-blocking | `invalidateFeature` tanpa unit test (`tanstack-query.md` rule 12) | Fixed in `bc49d79`: `query-scope.test.ts` (key sendiri, query yang bergantung, query lain); baris change log | resolved |
| R1-N1 | `__tests__/accounts.authorization.test.ts:17`, `accounts.list.test.ts:36` | tests | Non-blocking | `createAccount` diduplikasi padahal ada `accounts.helpers.ts` | Fixed in `bc49d79`: kedua file memakai `createAccount` dan `superadminActor` dari helper | resolved |
| R1-N2 | `user-management-view.tsx:49` | UI | Non-blocking | Banner gagal tetap tampil setelah saringan atau halaman berubah | Fixed in `bc49d79`: `changeStatus.reset()` saat search berubah | resolved |
| R1-N3 | `user-management-view.tsx:49` | errors | Non-blocking | `AUTH_REQUIRED` saat aksi tampil sebagai banner, spec section 6 meminta ke `/login` | Tidak diubah: sama dengan penanganan daftar di T4 (teks meminta muat ulang, lalu loader mengalihkan ke `/login`); keputusan reviewer di PR gate: pertahankan seperti T4 | resolved (keputusan reviewer) |
| R1-N4 | `schemas.ts:120` | validation | Non-blocking | `nextStatus` menerima `pending` | Fixed in `bc49d79`: `statusTargetSchema`; `StatusTarget` diturunkan dari schema; tes schema | resolved |
| R1-N5 | `accounts.service.ts:106` | logging | Non-blocking | Penolakan di dalam transaksi tidak dicatat | Fixed in `bc49d79`: `warn` `auth.account_status_refused` (id dan kode) | resolved |
| R1-N6 | `__tests__/accounts.concurrency.test.ts` | tests | Non-blocking | Tumpang tindih transaksi tidak dipaksa (**Inferred** tetap menangkap lock yang hilang: 6 transaksi, pool 10) | Tidak diubah; bukti deterministik butuh kendali urutan transaksi di tes, dicatat untuk T6 bila tes saling cabut butuh pola yang sama | resolved (dicatat) |

**Unverified:** fokus setelah dialog tertutup (dialog dibuka dari menu, tidak dari Trigger-nya sendiri, dan unmount langsung); menu, dialog, dan banner di layar: manual check dengan keyboard dan pembaca layar di QA, dengan akun seed T7 (spec section 8, Accessibility notes; AC26 dan NFR5 hanya mencakup form login dan register).

**Decisions made in review:** invalidasi seluruh scope `auth` setelah setiap hasil aksi disetujui; menu aksi dengan daftar pilihan sendiri per status disetujui (`*.rules.ts` tetap pemutus di server); N3: banner muat ulang saat sesi berakhir dipertahankan, sama dengan T4.

**Outcome:** blocking findings resolved: yes (tidak ada) · PR gate passed by Dana Harliansyah (Tech Lead), 2026-11-08, via chat: "PR #6 approve, keputusan 1–3 sesuai rekomendasi"

## T6: Angkat dan cabut superadmin

### Round 1: 2026-11-08
- **PR:** https://github.com/danaharlian/simlog-start/pull/7 · **Commit reviewed:** `552da2d`
- **Review passes:** separate-context pass (`code-review`): subagent general-purpose dengan konteks baru, read-only, tanpa berpindah branch, 2026-11-08 · human review: Dana Harliansyah (Tech Lead), 2026-11-08, via chat
- **Verdict:** request changes (subagent, on `552da2d`); approve (Dana Harliansyah, on `953e2be`)

| ID | File:line | Review pass | Severity | Finding | Resolution | Status |
|---|---|---|---|---|---|---|
| R1-B1 | `schemas.ts:136` | deprecated API | Blocking | `refine` di `changeAccountRoleSchema` memakai `message`, yang `@deprecated` di zod 4.6.7 (`core/api.d.ts:9`) | Fixed in `42af903`: `error`. `registerSchema` (`schemas.ts:65`) punya masalah yang sama: tindak lanjut tier S, dicatat di change log `07-tasks.md` | resolved |
| R1-S1 | `hooks/use-account-actions.ts:2`, `confirm-account-action-dialog.tsx:12` | layering | Non-blocking | Hook dan dialog mengimpor tipe dan helper dari komponen `.tsx` | Fixed in `42af903`: helper murni `components/account-actions.ts` | resolved |
| R1-S2 | `account-row-actions.tsx:48` | tests | Non-blocking | Sisi UI dari AC18 (baris sendiri tanpa Nonaktifkan dan Cabut) tidak dites | Fixed in `42af903`: `__tests__/account-actions.test.ts` | resolved |
| R1-S3 | `__tests__/accounts.concurrency.test.ts` | tests | Non-blocking | Tidak ada tes perubahan status dan role yang saling bertabrakan | Fixed in `42af903`: "menonaktifkan dan mencabut saling bersamaan" | resolved |
| R1-N1 | `accounts.service.ts:227` | logging | Non-blocking | Nama operasi dan pesan log dibangun dari template | Fixed in `42af903`: `CHANGE_LOG` dengan nama literal | resolved |
| R1-N2 | `accounts.service.ts:213` | types | Non-blocking | `from` dan `to` bertipe `string` | Fixed in `42af903`: `AccountStatus \| Role` | resolved |
| R1-N3 | `account-row-actions.tsx:93` | UI | Non-blocking | `key` memakai teks label | Fixed in `42af903`: `actionKey` | resolved |

**Unverified:** tes saling cabut tidak diuji dengan menghapus lock (mutation test); menu, dialog, dan banner di layar dengan keyboard dan pembaca layar (QA, akun seed T7); menu "Manajemen pengguna" muncul atau hilang setelah role berubah (AC17, AC19 sisi navigasi; QA).

**Decisions made in review:** (1) `changeAccountRoleSchema` menolak `nextRole` yang sama dengan `expectedRole`; (2) server mengizinkan mencabut superadmin nonaktif; (3) `hooks/use-account-actions.ts` dan `components/account-actions.ts` di luar file list disetujui; (4) peringatan di dialog "Aktifkan" untuk superadmin nonaktif (opsi b), sebagai perubahan terpisah.

**Outcome:** blocking findings resolved: yes · PR gate passed by Dana Harliansyah (Tech Lead), 2026-11-08, via chat: "PR #7 approve, keputusan 1–4 sesuai rekomendasi"

## T7: Seed database dev

### Round 1: 2026-11-08
- **PR:** https://github.com/danaharlian/simlog-start/pull/8 · **Commit reviewed:** `6790a72`
- **Review passes:** separate-context pass (`code-review`): subagent general-purpose dengan konteks baru, read-only, tanpa berpindah branch, 2026-11-08 · human review: Dana Harliansyah (Tech Lead), 2026-11-08, via chat
- **Verdict:** blocked, needs human decision (subagent, on `6790a72`); approve (Dana Harliansyah, on `50ed5ab`)

| ID | File:line | Review pass | Severity | Finding | Resolution | Status |
|---|---|---|---|---|---|---|
| R1-B1 | `seed.service.ts:79` | security | Blocking (human decision) | Guard hanya memeriksa `NODE_ENV` dan `SEED_ALLOW`, bukan database tujuan: URL production di shell + `SEED_ALLOW=true` di `.env` men-seed production (R25) | Keputusan Dana Harliansyah (Tech Lead), 2026-11-08, via chat: "Shell URL ditolak". Fixed in `3da8e32`: `DATABASE_URL` dari shell ditolak; `SEED_ALLOW` hanya dari command line | resolved |
| R1-S1 | `seed.service.test.ts:39` | tests | Non-blocking | Email contoh tetap: jalur pembuatan akun contoh hanya berjalan di database test yang baru | Fixed in `3da8e32`: `sampleTag` di tes; run pertama melaporkan semua contoh `created` | resolved |
| R1-S2 | `seed.service.ts:94` | concurrency | Non-blocking | Tidak ada tes dua seed bersamaan dan tidak ada komentar `Race:` | Fixed in `3da8e32` | resolved |
| R1-S3 | `seed.service.ts:142` | data | Non-blocking | Run yang terputus meninggalkan status salah yang dilaporkan `existing` | Fixed in `3da8e32`: status tersimpan ikut dilaporkan; catatan pemulihan di README | resolved |
| R1-S4 | `environment.md:30` | docs | Non-blocking | Rule 6 bertentangan dengan guard `NODE_ENV` | Fixed in `3da8e32`: pengecualian untuk tool code di luar app | resolved |
| R1-N1 | `seed.service.ts:97` | robustness | Non-blocking | `createOrFind` bergantung pada sign-up yang melempar error untuk email terpakai | Fixed in `3da8e32`: komentar menyebut syarat konfigurasinya | resolved |
| R1-N2 | `seed.service.ts:99` | data | Non-blocking | Setiap akun baru dari seed membuat satu sesi yang tidak dipakai | Tidak diubah: data dev, tidak berbahaya | resolved (dicatat) |
| R1-N3 | `seed.service.ts:103` | errors | Non-blocking | Username terpakai oleh email lain berakhir sebagai stack trace | Fixed in `3da8e32`: penolakan `sign_up_refused`; script hanya mencetak nama error | resolved |
| R1-N4 | `seed-guard.test.ts` | tests | Non-blocking | "Sebelum menulis" hanya dibuktikan lewat email superadmin | Fixed in `3da8e32`: spy `signUpEmail`; tes password tidak muncul di pesan | resolved |
| R1-N5 | `index.server.ts:3` | scope | Non-blocking | Export tipe yang tidak dipakai | Fixed in `3da8e32` | resolved |
| R1-N6 | dependency | process | Non-blocking | Dependency di commit fitur, bukan branch `chore/`; `postinstall` esbuild kini berjalan di bawah `allowBuilds` lama | Dicatat di PR dan di baris `tsx` di `versions.md` | resolved |
| R1-N7 | `versions.md` | docs | Non-blocking | "Observed" pada baris `tsx` belum mencakup jalur tulis | Fixed in `3da8e32`: jalur tulis di dev dijalankan owner, 2026-11-08 | resolved |

**Unverified:** pesan error tak terduga dari database (script kini hanya mencetak nama error).

**Decisions made in review:** (1) guard seed: `DATABASE_URL` dari shell ditolak, `SEED_ALLOW` hanya dari command line; (2) akun contoh memakai `SEED_SAMPLE_PASSWORD`. Keduanya oleh Dana Harliansyah (Tech Lead), 2026-11-08, via chat.

**Outcome:** blocking findings resolved: yes · PR gate passed by Dana Harliansyah (Tech Lead), 2026-11-08, via chat: "PR #8 approve"
