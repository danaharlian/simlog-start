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
- **Review passes:** separate-context pass (`code-review`): subagent general-purpose dengan konteks baru, read-only, tanpa berpindah branch, 2026-11-08 · human review: pending (Dana Harliansyah)
- **Verdict:** approve setelah should-fix 1 sampai 3 (subagent); tidak ada temuan blocking

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

**Outcome:** blocking findings resolved: yes (tidak ada) · PR gate passed: not yet (menunggu Dana Harliansyah)
