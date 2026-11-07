# Architecture Review: Auth (register, login, logout, aktivasi akun oleh superadmin)

- Slug: `auth` (file `05-architecture-review.md`)
- PRD: `04-prd.md` (approved at the PRD gate)
- Research: `02-research.md`
- Tier: L
- Status: approved
- Gate: Architecture gate
- Owner: Dana Harliansyah
- Author: AI agent
- Date: 2026-11-07
- Approved by: Dana Harliansyah (Software Architect), 2026-11-08, via chat

## 1. Ownership
1. Does it own data or rules with their own vocabulary that no other feature owns? **yes**: akun, sesi, status akun, dan role.
2. Does it change for different reasons or at a different pace than the nearest feature? **yes**: belum ada fitur lain, dan aturan akses berubah karena alasan keamanan, bukan alasan bisnis fitur lain.
3. Is it generic infrastructure rather than business? **no**: status dan aktivasi adalah aturan bisnis simlog. Koneksi database, env, dan shell layout tetap di `shared`.

Decision: **new feature `auth`**. Reason: ini memiliki tabel dan aturannya sendiri, sesuai `docs/04-stack/better-auth.md` rule 1.

**Belongs here:** register, login, logout, sesi, status akun, role, halaman status, manajemen pengguna (daftar, ubah status, ubah role), server route handler Better Auth, middleware auth, dan seed akun.
**Stays out:**
- Shell dashboard (sidebar `sidebar-07`): komponen generik di `shared/ui`, yang dirakit oleh layout route bersama data pengguna dari `auth` (D6).
- Halaman Beranda: route tipis yang memakai data pengguna dari public API `auth`, tanpa fitur baru.
- Koneksi database, env module, dan logger: `shared/db`, `shared/config`, dan `shared/server`.

## 2. Decisions

| ID | Decision | Options (research reference) | Choice | Reason | ADR |
|---|---|---|---|---|---|
| D1 | Pemilik fitur | `auth` sendiri, atau `auth` + fitur `users` | `auth` sendiri, termasuk manajemen pengguna | Manajemen pengguna menulis tabel `user`, dan satu tabel hanya punya satu pemilik (`modular-monolith.md`, principle 3) | none |
| D2 | Status akun dan role superadmin | `02-research.md` 4a: A plugin `admin`, atau B `additionalFields` | B | Ban memblokir login, padahal pengguna menunggu harus bisa login. B tidak membuka endpoint `/admin/*` | [0038](../../docs/decisions/0038-auth-account-status-and-roles.md) |
| D3 | Login dengan username | plugin `username`, atau kolom sendiri | plugin `username`, `immutableUsername: true`, `displayUsername: false` | Permintaan owner. Normalisasi huruf kecil sudah ada di plugin. Username wajib ditegakkan di server | [0039](../../docs/decisions/0039-better-auth-username-plugin.md) |
| D4 | Output `auth generate` di Drizzle 1.0 RC | `03-prototype.md`: buang relations, atau adapter relations-v2 | buang relations, tanpa `advanced.database.joins` | Tetap sesuai ADR 0007 R dan decision AA, tanpa paket baru | [0040](../../docs/decisions/0040-better-auth-schema-on-drizzle-v1.md) |
| D5 | Letak middleware auth | `shared/server/require-auth` (dokumen saat ini), factory di `shared`, atau di `features/auth` | `features/auth/server/`, diekspor lewat `index.server.ts` saat fitur kedua membutuhkannya | `shared` tidak boleh mengimpor instance `auth` milik fitur | [0041](../../docs/decisions/0041-auth-middleware-in-the-auth-feature.md) |
| D6 | Letak shell dashboard | `02-research.md` 4c: A di `auth`, atau B di `shared` / fitur sendiri | B: komponen `AppShell` generik di `shared/ui` (menerima menu dan data pengguna lewat props), dirakit di layout route | Tidak ada dependency lintas fitur, dan shell bisa dipakai fitur lain | none (mengikuti `folder-structure.md`: `shared/ui` untuk komponen aplikasi yang dirakit) |
| D7 | Cara seed membuat akun | `02-research.md` 4b: A `auth.api.signUpEmail`, atau B insert langsung | A, lewat service di `auth` yang diekspor dari `index.server.ts` | Hashing dan normalisasi username sama dengan register | none |
| D8 | Runner seed (decision AB) | `tsx`, type stripping Node 24, atau seed lewat endpoint dev | `tsx` sebagai dev dependency (keputusan reviewer, 2026-11-08) | Me-resolve alias `@/`; type stripping Node tidak, dan endpoint dev menaruh penulis data di aplikasi | [0042](../../docs/decisions/0042-seed-runner.md) |
| D9 | Perubahan status dan role bersamaan (NFR4, R20) | kondisi pada write, kolom `version`, atau row lock | Satu transaksi yang mengunci baris aktor dan target, dan memeriksa ulang bahwa aktor masih superadmin aktif | Kondisi pada write saja tidak mencegah dua superadmin saling mencabut role (EC16) | 0038, point 3 |
| D10 | Kesegaran status di sesi aktif (R21) | baca status per request, atau cookie cache | Baca status dan role dari baris pengguna setiap request; cookie cache sesi tidak dipakai | Perubahan harus berlaku pada navigasi berikutnya | 0038, point 4 |
| D11 | Penyimpanan rate limit (NFR1) | memori (bawaan), database, atau secondary storage | Memori selama production berjalan di satu instance; berpindah ke database jika lebih dari satu | Hosting belum ditulis (ADR 0007, 0017) | none; dicatat sebagai risiko |
| D12 | Pengguna ditolak dan nonaktif | blokir login, atau login lalu halaman status | Login diizinkan; middleware mengarahkan ke halaman status | Asumsi PRD section 10 | 0038 |
| D13 | Waktu keputusan untuk metric M1 | kolom di `user`, atau tabel riwayat | Satu kolom waktu keputusan terakhir di `user`. Tabel riwayat tidak dibuat | M1 hanya butuh waktu keputusan; riwayat lengkap tidak diminta PRD | none |

## 3. Public API and cross-feature use

| Export | Entry | Kind | Consumer | Needed by which PRD id |
|---|---|---|---|---|
| `LoginForm`, `RegisterForm` | `index.ts` | component | route `/login`, `/register` | R1, R7, R23 |
| `AccountStatusView` | `index.ts` | component | route halaman status | R13, R14 |
| `UserManagementView` | `index.ts` | component | route manajemen pengguna | R16 to R20 |
| `currentUserQueryOptions` | `index.ts` | query options | layout route (guard `beforeLoad` dan data `AppShell`), route Beranda | R11 to R15 |
| `useSignOut` | `index.ts` | hook | layout route (menu pengguna di `AppShell`), route halaman status | R10 |
| `CurrentUser`, `AccountStatus`, `Role` | `index.ts` | type | route dan layout route | R13, R15 |
| `authScope` | `index.ts` | constant (scope Query) | `invalidateFeature` di hooks mutasi; segmen pertama key (`tanstack-query.md` rule 3) | R16 to R21 |
| `resolveAccessRedirect` | `index.ts` | function | `beforeLoad` di layout `_guest`, `_status`, `_app` | R11 to R14 |
| `authHandler` | `index.server.ts` | handler untuk server route (`Request` ke `Response`) | `src/routes/api/auth/$.ts` (ADR 0012) | R1, R7, R10 |
| `seedAccounts` | `index.server.ts` | service | script seed dengan `tsx` (ADR 0042). Script berada di luar `src/`, jadi aturan boundary lint tidak memeriksa import-nya; review yang memeriksanya | R24, R25 |

| Feature consumed | Symbol and entry | Mechanism | Reason |
|---|---|---|---|
| none | | | Belum ada fitur lain. `AppShell` di `shared/ui` tidak mengimpor fitur; data masuk lewat props dari route |

**Events:** none. Tidak ada pihak yang perlu bereaksi terhadap aktivasi pada cut ini.

## 4. Data impact

| Table (owner) | New or changed | Why | References another feature? |
|---|---|---|---|
| `user` (auth) | new | Akun, plus `username` (0039), `status`, `role` (0038), dan waktu keputusan terakhir (D13) | no |
| `session` (auth) | new | Sesi Better Auth | no (FK ke `user` milik fitur yang sama) |
| `account` (auth) | new | Credential (hash password) | no |
| `verification` (auth) | new | Tabel bawaan Better Auth; tidak dipakai oleh flow cut ini, tetapi dihasilkan CLI | no |

**Migration class:** additive (migration pertama). **Reversible:** ya sebelum rilis production. Setelah rilis, rollback cukup di kode; tabel tetap ada karena menghapusnya menghapus akun. **Seed or reference data:** seed dev saja (R24, R25), tanpa reference data.

## 5. Security

| Capability | Who may do it | Enforced where | Data scope |
|---|---|---|---|
| Register, login, logout | Pengunjung (register, login); pengguna yang login (logout) | Server route Better Auth: validasi, hashing, origin check (`better-auth.md` rule 9). Username wajib ditegakkan di server (0039) | Akunnya sendiri |
| Membaca pengguna saat ini | Pengguna yang login | Middleware auth di server function (0041) | Barisnya sendiri; kolom yang dibutuhkan saja |
| Membuka dashboard dan Beranda | Pengguna aktif | Middleware "active user" di setiap server function yang dipanggil halaman itu; `beforeLoad` hanya untuk UX | Datanya sendiri |
| Melihat daftar akun | Superadmin aktif | Middleware "active superadmin" di server function | Kolom R16 untuk semua akun (NFR6) |
| Mengubah status atau role | Superadmin aktif, bukan untuk dirinya sendiri | Middleware "active superadmin" + service (aturan R20, transaksi D9) | Satu akun target |
| Menjalankan seed | Pengembang | Script seed menolak berjalan dengan konfigurasi production (R25) | Database dev |

Sensitive data, retention, and deletion: password hanya dalam bentuk hash di `account` (Better Auth, scrypt). Email dan nama adalah data private (`security.md`): tidak ditulis ke log, dan hanya ada di DTO yang membutuhkannya. Perubahan status dan role dicatat ke log server dengan id aktor dan id target, tanpa email (`security.md` rule 13). Retensi dan jalur hapus akun belum diputuskan (`04-prd.md` Q2; owner Dana Harliansyah).

Server routes, and how each authenticates: `src/routes/api/auth/$.ts`, ditangani Better Auth, yang memeriksa sesi, origin, dan Fetch Metadata sendiri (`better-auth.md` rule 9). Rate limit memakai `advanced.ipAddress` sesuai hosting (D11).

## 6. Risks and dependencies
**New dependencies:**
- `better-auth`, `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg`, `zod`, `pino`, `@tanstack/react-form`, `@tanstack/react-query`: sudah dipilih di ADR 0007 dan 0008 serta registry `versions.md`, dan dipasang lewat skill `change-dependency` di task.
- Plugin `username`: ADR 0039.
- Runner seed `tsx`: ADR 0042.

**Deviations from `docs/03-standards/*` and `docs/04-stack/*`:**
- `better-auth.md` rule 5 (generated schema dengan edit terbatas): ADR 0040.
- `better-auth.md` rule 4 dan `skills.md` (letak middleware): ADR 0041.

Kedua dokumen itu diperbarui di task yang menerapkannya.

| Risk | Impact | Mitigation | Owner |
|---|---|---|---|
| Integrasi Better Auth + Drizzle RC + `pg` + Start + Prisma Postgres belum terbukti | high | T1 membuktikannya (ADR 0037, point 5); jika gagal, build berhenti dan dokumen ini berubah | Dana Harliansyah (Tech Lead) |
| Pengguna menyetel `status` atau `role` saat register | high | `input: false` (0038) dan tes AC4 | Dana Harliansyah |
| Dua superadmin saling mencabut role sehingga tidak ada superadmin tersisa | high | Transaksi dengan row lock (D9) dan tes AC20 terhadap database sungguhan | Dana Harliansyah |
| Server function lain mengimpor `index.server.ts` dan kode server ikut ke bundle client | medium | Diuji saat fitur kedua memakai middleware (0041) | Dana Harliansyah |
| Rate limit di memori tidak berlaku lintas instance | medium | D11: pindah ke database bila hosting memakai lebih dari satu instance | Dana Harliansyah (Release Owner) |
| Regenerasi schema saat upgrade Better Auth menimpa edit | medium | Daftar edit di feature spec dan README fitur (0040) | Dana Harliansyah |
| Credential database tersimpan di riwayat chat | medium | Rotasi (`04-prd.md` Q5) | Dana Harliansyah |

## 7. PRD coverage

| PRD item | Where it is decided | Note |
|---|---|---|
| R1 to R4 (form register, username, email, password) | D3, section 5 | Aturan kolom ada di feature spec |
| R5 (status dan role tidak bisa dipilih) | D2 | `input: false` |
| R6, R9 (arah setelah register dan login) | section 3 (`LoginForm`, `RegisterForm`) | Tidak perlu keputusan arsitektur selain itu |
| R7, R8 (satu kolom login, pesan sama) | D3 | |
| R10 (logout) | section 3 (`useSignOut`) | |
| R11 to R14 (pengalihan dan halaman status) | D10, D12, section 5 | `beforeLoad` untuk UX, middleware untuk proteksi |
| R15 (dashboard, sidebar) | D6 | |
| R16 to R20 (manajemen pengguna) | D1, D2, D9, section 5 | |
| R21 (perubahan berlaku pada navigasi berikutnya) | D10 | |
| R22, NFR3 (hanya superadmin) | section 5 | |
| R23 (layout login dan register) | none needed | UI, di feature spec |
| R24, R25 (seed) | D7, D8 | |
| NFR1 (rate limit) | D11 | Aturan `/sign-in/username` diverifikasi di spec (0039) |
| NFR2 (password tidak tercatat) | section 5 | |
| NFR4 (bersamaan) | D9 | |
| NFR5 (aksesibilitas form) | none needed | UI, di feature spec |
| NFR6 (kolom daftar akun) | section 5 | |
| M1 (waktu keputusan) | D13 | Target M1 masih `04-prd.md` Q1 |
| M2 (akun menunggu terlalu lama) | D2, D13 | Dihitung dari status dan waktu register; target M2 masih `04-prd.md` Q1 |

## 8. Change log

| Date | Change | Reason | Re-approved by |
|---|---|---|---|
| 2026-11-08 | Section 7: tambah baris M2 | Catatan Gate review round 1 (pertanyaan 1) | Termasuk verdict round 1 (approve with notes) |
| 2026-11-08 | Section 3: Kind `authHandler` menjadi "handler untuk server route"; consumer `seedAccounts` menyebut bahwa lint boundary tidak memeriksa script di luar `src/` | Catatan Gate review round 1 (pertanyaan 2) | Termasuk verdict round 1 |
| 2026-11-08 | D8: `tsx` dipilih; section 6 dan 7 diperbarui | Keputusan reviewer di round 1 | Termasuk verdict round 1 |
| 2026-11-08 | Section 3: tambah export `authScope` dan `resolveAccessRedirect` | Ditemukan saat menulis `06-feature-spec.md` (section 2, S7; `tanstack-query.md` rule 3) | Dana Harliansyah (Software Architect), 2026-11-08, via chat (round 2) |

## 9. Gate review

| Question | Answer and where |
|---|---|
| Does each in-scope PRD item have a place in section 7? | Ya: R1–R25, NFR1–NFR6, M1, dan M2 (M2 ditambahkan lewat change log 2026-11-08) di section 7 |
| Is each new public export tied to a consumer that needs it now? | Ya: delapan export di section 3, masing-masing dengan consumer dan PRD id. Kind `authHandler` dan catatan lint untuk `seedAccounts` diperbaiki lewat change log |
| Is authorization enforced in a function or middleware for every capability? | Ya: section 5. Middleware di `features/auth/server` (ADR 0041), handler Better Auth untuk register dan login, pengecekan production di script seed; `beforeLoad` hanya UX |
| Does anything create a cross-feature cycle, or a query on another feature's table? | Tidak: belum ada fitur lain (section 3); `AppShell` menerima props (D6); seed memanggil service `auth`, bukan tabelnya (D7) |
| Can the migration be rolled back, or is the reason it cannot accepted by name? | Sebelum rilis production: ya (additive, migration pertama). Setelah rilis: hanya kode yang di-rollback, tabel tidak di-drop karena menghapus akun; diterima oleh Dana Harliansyah (Software Architect), 2026-11-08 |

| Round | Date | Reviewer | Verdict | Findings, or notes and their owner |
|---|---|---|---|---|
| 1 | 2026-11-08 | Dana Harliansyah (Software Architect) | approve with notes | Pesan reviewer: "05-architecture-review auth: approve with notes, jawaban section 9 sesuai rekomendasi, D8 pilih tsx, ADR 0038–0042 accepted". Catatan: (1) tambah M2 di section 7; (2) perbaiki Kind `authHandler` dan catat bahwa lint boundary tidak memeriksa script seed; (3) D8 = `tsx`. Owner: AI agent, diterapkan 2026-11-08 lewat change log section 8. ADR 0038–0042 accepted |
| 2 | 2026-11-08 | Dana Harliansyah (Software Architect) | approve | Pesan reviewer: "06-feature-spec auth: AH pakai vitest.config, ADR 0043 accepted, ssr-query pakai ADR, setujui 2 export tambahan di 05, section 8 sesuai; perbaiki 4 kelemahan lalu tulis 07-tasks". Menyetujui change log 2026-11-08: export `authScope` dan `resolveAccessRedirect` di section 3 |
