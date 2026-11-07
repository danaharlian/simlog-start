# Research: Auth (register, login, logout, aktivasi akun oleh superadmin)

- Slug: `auth` (folder `specs/auth/`, file `02-research.md`)
- Idea: `01-idea.md` (decision: proceed)
- Status: done
- Decided by: Dana Harliansyah (Product Manager), 2026-11-07, via chat
- Decision quote: "02-research auth: masalah tervalidasi, lanjut ke prototype"
- Gate: none
- Tier after research: L (changed from `01-idea.md`? no, see section 6)
- Author: AI agent
- Date: 2026-11-07

## 1. Summary (answer first)
Fitur ini bisa dibangun dengan stack yang direncanakan, tetapi belum ada satu pun library-nya yang terpasang. `better-auth`, `drizzle-orm`, `drizzle-kit`, `pg`, `zod`, dan `pino` tidak ada di `package.json` (**Verified**). Ada tiga temuan yang paling menentukan.

1. Plugin `username` memakai endpoint login terpisah (`/sign-in/username`) dari login email (`/sign-in/email`). Validator bawaannya hanya mengizinkan huruf, angka, `_`, dan `.`, jadi satu kolom "username atau email" bisa memilih endpoint dari ada tidaknya `@`.
2. Plugin `admin` tidak cocok untuk status "menunggu persetujuan". Pengguna yang di-ban tidak bisa login sama sekali, sedangkan pengguna yang belum aktif harus bisa login lalu melihat halaman menunggu. Opsinya dibandingkan di section 4.
3. Block `login-04` membawa tombol OAuth (Apple, Google, Meta), tautan "Forgot your password?", dan kelas Tailwind arbitrary (`dark:brightness-[0.2]`), sehingga harus diubah dan tidak bisa dipakai apa adanya.

Risiko terbesar: kombinasi Better Auth 1.7, Drizzle `1.0.0-rc.5`, dan `pg` di TanStack Start belum pernah dijalankan bersama terhadap database sungguhan, termasuk Prisma Postgres dengan `sslmode=verify-full`. Rekomendasi: lanjut ke prototype untuk satu hipotesis integrasi (section 5), lalu PRD.

## 2. Questions investigated

| # | Area | Question | Finding | Source | Label | Consequence for the design |
|---|---|---|---|---|---|---|
| Q1 | problem validation | Apakah masalahnya nyata? | Belum ada fitur, sesi, atau tabel. `src/routes/` hanya `__root.tsx` dan `index.tsx`. Owner meminta fitur ini dan akan memakainya | repo (level 1); Dana Harliansyah, 2026-11-07 | Verified | Ini fitur pertama yang memakai database. Jumlah pengguna tetap **Unknown** |
| Q2 | feasibility | Versi mana yang akan terpasang, dan apakah saling cocok? | npm `better-auth` `latest` = 1.7.18. Peer-nya: `drizzle-orm` `^0.45.2 \|\| >=1.0.0-rc.1 <2.0.0`, `drizzle-kit` `>=0.31.4 \|\| >=1.0.0-beta.1`, `pg` `^8.0.0`, `@tanstack/react-start` `^1.0.0`. Tag `rc` Drizzle = `1.0.0-rc.5`, jadi `drizzle-orm@rc` dari owner menghasilkan versi yang sama dengan ADR 0008. `pg` dan `@types/pg` `latest` = 8.23.1 | npm registry, 2026-11-07 (level 2) | Verified | Semua versi masuk rentang peer. Drizzle tetap dipin exact `1.0.0-rc.5` (ADR 0008), bukan `@rc` yang bisa bergeser |
| Q3 | feasibility | Bagaimana Better Auth dipasang di TanStack Start? | Handler di server route `src/routes/api/auth/$.ts` (GET dan POST ke `auth.handler`). Plugin `tanstackStartCookies()` dari `better-auth/tanstack-start` harus berada paling akhir. Sesi dibaca dengan `auth.api.getSession({ headers: getRequestHeaders() })` di server function | better-auth.com/docs/integrations/tanstack, versi `latest` = 1.7 (level 2) | Verified | Sama dengan `docs/04-stack/better-auth.md`. Contoh di halaman itu memakai `.inputValidator()`, sedangkan types Start yang terpasang (`@tanstack/start-client-core` 1.170.39) memakai `validator`. Pakai `validator` |
| Q4 | data | Apakah tabel Better Auth bisa dibuat lewat `drizzle-kit generate`? | `auth migrate` hanya untuk adapter Kysely bawaan. Untuk Drizzle, jalankan `auth generate`, lalu terapkan dengan migration Drizzle | better-auth.com/docs/concepts/rate-limit (callout "migrate"), docs/concepts/cli (level 2); `docs/04-stack/better-auth.md` rule 5 (level 4) | Verified | Alur: `auth generate` → `features/auth/db/schema.ts` → `pnpm db:generate` → review SQL. Script `db:*` dan `drizzle.config.ts` belum ada |
| Q5 | feasibility | Bagaimana plugin `username` bekerja? | Menambah kolom `username` dan `displayUsername` ke tabel `user`. `username` dinormalisasi ke huruf kecil, jadi `TestUser` sama dengan `testuser`. Panjang bawaan 3 sampai 30. Validator bawaan: huruf, angka, `_`, `.`. Saat register, `username` **opsional** di `signUp.email`. Login lewat `signIn.username` di `POST /sign-in/username`. Ada endpoint `POST /is-username-available`, yang bisa dimatikan lewat `disabledPaths`. Ada opsi `immutableUsername` | better-auth.com/docs/plugins/username (level 2); `better-auth@1.7.18` `dist/plugins/username/index.d.mts` di unpkg (level 1, belum terpasang) | Verified | Schema Zod kita harus mewajibkan `username`, karena plugin tidak mewajibkannya. Asumsi "unik, tidak membedakan huruf besar kecil" dipenuhi oleh normalisasi bawaan |
| Q6 | UI | Bisakah satu kolom menerima username atau email? | Tidak ada endpoint gabungan. Karena validator bawaan menolak `@` di username, ada `@` berarti email dan tidak ada `@` berarti username | Q5 sources | Inferred | Logika pemilihan endpoint ada di client, dan perlu tes untuk kedua cabang |
| Q7 | security | Apakah plugin `admin` cocok untuk role superadmin dan status "belum aktif"? | Plugin `admin` menambah `role`, `banned`, `banReason`, dan `banExpires` ke `user`, plus `impersonatedBy` ke `session`. Ban **mencegah login** dan mencabut semua sesi. Role bawaan hanya `admin` dan `user`; role `superadmin` butuh access control custom. Plugin ini juga membuka endpoint `/admin/*`: create, list, set-role, ban, impersonate, remove-user, set-user-password | better-auth.com/docs/plugins/admin (level 2) | Verified | Status "belum aktif" tidak bisa dipetakan ke ban. Lihat opsi di section 4 |
| Q8 | security | Bagaimana menambah kolom yang tidak boleh diisi pengguna (role, status)? | `user.additionalFields` dengan `input: false`. Field dengan `input: true` (bawaan) bisa dikirim pengguna saat register | better-auth.com/docs/concepts/typescript#the-input-property (level 2) | Verified | `role` dan status wajib `input: false`. Perlu tes bahwa register yang mengirim `role` atau status ditolak atau diabaikan |
| Q9 | security | Apa default password, rate limit, dan enumeration? | Password 8 sampai 128 karakter, di-hash dengan `scrypt`, disimpan di tabel `account` dengan `providerId` `credential`. Rate limit hanya aktif di production: 100 request per 10 detik, `/sign-in/email` 3 per 10 detik, disimpan di memori. `auth.api` dari server tidak kena rate limit. Dengan `autoSignIn` aktif (bawaan), register dengan email yang sudah ada mengembalikan `422`, jadi email bisa ditebak | better-auth.com/docs/authentication/email-password, docs/concepts/rate-limit (level 2) | Verified | PRD menetapkan panjang password. Apakah `/sign-in/username` punya aturan seketat `/sign-in/email` **Unknown**. IP klien dibaca dari `X-Forwarded-For` kecuali `advanced.ipAddress` diatur sesuai hosting |
| Q10 | data | Bagaimana seed membuat password dengan hashing yang sama? | `better-auth/crypto` mengekspor `hashPassword` dan `verifyPassword`. Cara lain: `auth.api.signUpEmail` di server, yang melewati validasi, normalisasi username, dan hashing yang sama | `better-auth@1.7.18` `dist/crypto/index.d.mts` di unpkg (level 1, belum terpasang); email-password docs (level 2) | Verified | Lihat opsi seed di section 4 |
| Q11 | architecture | Bagaimana seed dijalankan? | Runner seed adalah open decision AB: TypeScript butuh runner dengan dukungan alias `@/`, dan `tsx` butuh ADR. Node lokal 24.22.1 | ADR 0014, `docs/03-standards/database.md` (level 4); `node --version` | Verified | ADR untuk runner seed wajib sebelum task seed. Apakah type stripping bawaan Node 24 cukup tanpa dukungan alias **Unknown** |
| Q12 | integration | Apakah `pg` menerima `sslmode=verify-full` dari Prisma Postgres? | Tanpa `uselibpqcompat`, `verify-full` menjadi `ssl: true` (verifikasi sertifikat dengan CA bawaan Node). Dengan `uselibpqcompat=true`, menjadi `ssl: {}` | README `pg-connection-string` (dependency `pg@8.23.1`, `^2.14.1`) (level 2) | Verified | Koneksi ke `db.prisma.io` belum dicoba. Batas koneksi Prisma Postgres **Unknown** dan memengaruhi `max` pool |
| Q13 | UI | Apa isi block `login-04` di proyek ini (`base-nova`)? | `shadcn add login-04 --dry-run` membuat `card`, `input`, `label`, `separator`, `field`, dan `login-form.tsx` di `src/shared/ui/`; `button` sudah ada. `login-form.tsx` berisi judul "Acme Inc", tautan "Forgot your password?", tiga tombol OAuth, gambar `/placeholder.svg`, dan kelas `dark:brightness-[0.2]` serta `*:data-[slot=field-separator-content]:bg-card` | `pnpm exec shadcn add login-04 --dry-run` dan `--view`, shadcn 4.23.0, 2026-11-07 (level 1) | Verified | `login-form.tsx` adalah komponen fitur, bukan primitive. Tempatnya di `features/auth/ui/`, ditulis ulang tanpa OAuth dan tanpa nilai arbitrary (`check:ui`). Gambar diganti `public/bdh.avif` |
| Q14 | UI | Apa isi block `sidebar-07`? | Dry run membuat `skeleton`, `tooltip`, `breadcrumb`, `collapsible`, `dropdown-menu`, `avatar`, `sheet`, `sidebar`, `src/shared/hooks/use-mobile.ts`, ditambah komponen contoh `app-sidebar`, `nav-main`, `nav-projects`, `nav-user`, dan `team-switcher` di `src/shared/ui/` | `pnpm exec shadcn add sidebar-07 --dry-run`, shadcn 4.23.0, 2026-11-07 (level 1) | Verified | Komponen contoh (team switcher, projects) berisi data dummy dan diletakkan di luar `shared/ui`. Isi kode belum dibaca dengan `--view` |
| Q15 | security | Apakah perubahan status langsung berlaku pada sesi yang sedang aktif? | `session.cookieCache` adalah opsi untuk menyimpan sesi di cookie. Nilai bawaannya tidak dibaca di sesi ini | better-auth.com/docs/reference/options#session (snippet, level 2) | Unknown | Jika cookie cache aktif, pengguna yang baru diaktifkan bisa tetap melihat halaman menunggu sampai cache habis. Cek di feature spec |
| Q16 | data | Bagaimana dua superadmin yang mengaktifkan akun yang sama secara bersamaan ditangani? | Repo ini melarang check-then-write. Pakai kondisi pada write, `version` column, atau row lock | `docs/04-stack/drizzle-concurrency.md`, `AGENTS.md` (level 4) | Verified | Contoh: update status dengan kondisi status saat ini masih "belum aktif". Mekanismenya diputuskan di feature spec |

## 3. Libraries and tools

| Library or tool | Needed for | Installed version | Docs version consulted | Context7 ID | Source URL | `@deprecated`, alpha, beta, or RC? | ADR needed? |
|---|---|---|---|---|---|---|---|
| `better-auth` | auth server, client, adapter Drizzle, plugin `tanstackStartCookies` | not installed (npm latest 1.7.18) | 1.7 (`latest` di MCP `better-auth`) | not used | https://better-auth.com/docs/integrations/tanstack | stable. `allowImpersonatingAdmins` di plugin admin deprecated (tidak dipakai) | Pilihan library sudah di ADR 0007 R, dan instalasinya lewat skill `change-dependency`. Perlu ADR baru untuk plugin `username` |
| Plugin `username` (bagian dari `better-auth`) | login dengan username | not installed | 1.7 | not used | https://better-auth.com/docs/plugins/username | stable | **Ya**: ADR 0007 R dan `better-auth.md` rule 7 mewajibkan ADR untuk plugin |
| Plugin `admin` (bagian dari `better-auth`) | opsi untuk role (section 4) | not installed | 1.7 | not used | https://better-auth.com/docs/plugins/admin | stable | Ya, jika opsi ini dipilih |
| `drizzle-orm` / `drizzle-kit` | schema, query, migration | not installed (`rc` = `1.0.0-rc.5`) | v1 RC, lewat `docs/04-stack/drizzle-postgres.md` | not used | https://orm.drizzle.team/docs/get-started-postgresql (dikutip owner, belum dibuka) | **RC** | Diputuskan di ADR 0008 (exact pin `1.0.0-rc.5`); instalasi lewat `change-dependency` |
| `pg` / `@types/pg` | driver PostgreSQL | not installed (8.23.1 / 8.23.1) | README `pg-connection-string` | not used | https://www.npmjs.com/package/pg-connection-string | stable | Sudah di registry `versions.md` (ADR 0007 F dan G); instalasi lewat `change-dependency` |
| `zod` | schema form, env, server function | not installed (4.6.7) | not consulted in this phase | not used | n/a | stable | Sudah di registry `versions.md`; instalasi lewat `change-dependency` |
| `pino` | logger server (`shared/server/logger.server.ts`) | not installed (10.4.0) | not consulted in this phase | not used | n/a | stable | Sudah di registry `versions.md`; instalasi lewat `change-dependency` |
| `@tanstack/react-form` | form register dan login (`AGENTS.md`) | not installed (`versions.md`: ^1.33.5) | not consulted in this phase | not used | n/a | stable | Sudah di registry `versions.md`; instalasi lewat `change-dependency` |
| `@tanstack/react-query` | server state halaman aktivasi | not installed (`versions.md`: ^5.104.5) | not consulted in this phase | not used | n/a | stable | Sudah di registry `versions.md`; instalasi lewat `change-dependency` |
| `@tanstack/react-start` | server route, server function | 1.169.4 (`start-client-core` 1.170.39) | installed `createServerFn.d.ts` | not used | `node_modules/@tanstack/start-client-core/dist/esm/createServerFn.d.ts` | stable | Tidak |
| `shadcn` CLI | block `login-04`, `sidebar-07`, dan primitive-nya | 4.23.0 | CLI `--dry-run` dan `--view` | not used | n/a | stable | Tidak; primitive lewat skill `add-ui-component` |
| Runner seed (`tsx` atau lainnya) | menjalankan seed TypeScript | not installed | not consulted | not used | n/a | n/a | **Ya**: open decision AB (ADR 0014) |

## 4. Options

### 4a. Role superadmin dan status aktif

| Option | What it means | Evidence (source) | Pros | Cons | Fit with `docs/02-architecture/modular-monolith.md` |
|---|---|---|---|---|---|
| A. Plugin `admin` untuk role, plus `additionalFields` untuk status | Role `superadmin` lewat access control custom. Status aktif sebagai field tambahan `input: false` | Q7, Q8 | `setRole`, `listUsers`, dan cek permission sudah tersedia | Membuka endpoint `/admin/*` yang tidak dibutuhkan (impersonate, remove-user, set-user-password), jadi permukaan serangan lebih besar. Butuh ADR plugin kedua. Status tetap harus dibuat sendiri karena ban tidak cocok | Logika aktivasi terbagi antara plugin dan service kita |
| B. `additionalFields` saja (`role` dan status, keduanya `input: false`) | Aktivasi dan daftar pengguna pending lewat service dan repository fitur `auth` | Q8, Q16 | Tidak ada endpoint tambahan. Satu ADR plugin (`username`). Write bersyarat (Q16) ada di repository kita, dan otorisasi ada di middleware kita | Daftar pengguna, paginasi, dan cek role ditulis sendiri | Sesuai: `UI → function → service → repository → db` di dalam `auth` |

Leaning: **B**, karena status tetap butuh field sendiri dan B tidak membuka endpoint admin yang tidak dipakai. Keputusan ada di architecture review.

### 4b. Cara seed membuat akun

| Option | What it means | Evidence (source) | Pros | Cons | Fit with `docs/02-architecture/modular-monolith.md` |
|---|---|---|---|---|---|
| A. `auth.api.signUpEmail` di server, lalu update role dan status | Seed memanggil instance `auth` | Q9, Q10 | Hashing, normalisasi username, dan validasi sama persis dengan register | Seed bergantung pada konfigurasi auth dan env lengkap. Idempotensi: email yang sudah ada mengembalikan `422` dan harus ditangani | Seed memakai `index.server.ts` dari `auth` |
| B. `hashPassword` dari `better-auth/crypto`, lalu insert ke `user` dan `account` | Seed menulis baris langsung | Q10 | Bisa memakai `onConflictDoUpdate` (`database.md`) | Harus meniru normalisasi username dan format baris `account` sendiri | Seed menyentuh tabel `auth` langsung; perlu dicek terhadap aturan "fitur lain tidak query tabel auth" |

Leaning: **A**, karena B menduplikasi aturan Better Auth. Keputusan ada di feature spec. Runner tetap terikat ADR decision AB.

### 4c. Letak shell dashboard dan halaman aktivasi

| Option | What it means | Evidence (source) | Pros | Cons | Fit with `docs/02-architecture/modular-monolith.md` |
|---|---|---|---|---|---|
| A. Semua di fitur `auth` | Shell `sidebar-07`, halaman menunggu, dan halaman aktivasi di `features/auth` | Q14 | Satu fitur, tanpa dependency lintas fitur | Shell dashboard akan dipakai fitur lain; menaruhnya di `auth` mencampur tanggung jawab | Lemah: shell bukan urusan auth |
| B. `auth` untuk identitas dan aktivasi; shell di `shared` atau fitur sendiri | Shell layout memanggil public API `auth` untuk data pengguna (`nav-user`) | Q14, `AGENTS.md` (arah dependency) | Tanggung jawab terpisah | Jika shell adalah fitur, muncul dependency lintas fitur (tier sudah L) | Sesuai, lewat `index.ts` |

Leaning: no preference. Architecture review memutuskan.

## 5. Is a prototype needed?
**Hypothesis:** Better Auth 1.7.18 dengan adapter Drizzle `1.0.0-rc.5`, `pg` 8.23.1, plugin `username`, dan `tanstackStartCookies` bisa melakukan register, login dengan username, `getSession` di server function, dan logout di TanStack Start 1.169.4, dengan migration dari `auth generate` + `drizzle-kit generate` yang berhasil diterapkan ke database dev Prisma Postgres (`sslmode=verify-full`).
**Why docs do not settle it:** setiap bagian terdokumentasi sendiri-sendiri, tetapi kombinasinya belum pernah dijalankan. ADR 0008 mencatat bahwa `migrate` dan query sungguhan dengan Drizzle RC belum pernah dijalankan, `better-auth.md` mencatat bahwa adapter belum pernah dijalankan di aplikasi, dan koneksi ke `db.prisma.io` belum dicoba.
**Who must judge it:** Tech Lead (Dana Harliansyah).

Next phase: `03-prototype.md` di branch `spike/auth`. Kodenya dibuang dan tidak di-merge. Alternatifnya, task pertama di fase 8 bisa membuktikan hal yang sama (riskiest first), tetapi baru setelah semua gate.

## 6. Impact on tier and scope
- New risk or L triggers found: none. Tier tetap L.
- What the PRD must take into account:
  - Register mewajibkan username, email, dan password. Plugin tidak mewajibkan username (Q5).
  - Aturan username bawaan: 3 sampai 30 karakter, huruf, angka, `_`, `.`, tidak membedakan huruf besar kecil. PRD bisa menerima atau mengubahnya.
  - Password bawaan 8 sampai 128 karakter (Q9).
  - Dengan register yang langsung login, email dan username yang sudah dipakai bisa ditebak (Q9, Q5). PRD menerima risiko ini atau meminta mitigasi, misalnya mematikan `/is-username-available`.
  - Block `login-04` tidak dipakai apa adanya: tanpa OAuth, tanpa "Forgot your password?", dan tanpa tautan Terms atau Privacy kecuali PRD memintanya (Q13).
  - Rate limit bawaan hanya aktif di production dan disimpan di memori (Q9).
- Features that this work would touch: tidak ada; `src/features/` belum ada.

## 7. Risks

| Risk | Impact | Evidence or source | Suggested mitigation (for the spec to decide) |
|---|---|---|---|
| Integrasi Better Auth + Drizzle RC + `pg` + Start gagal atau berperilaku berbeda dari docs | high | Section 5; ADR 0008 "Not verified" | Prototype, atau task pertama yang membuktikan alur end-to-end |
| Pengguna mengirim `role` atau status saat register dan menjadi superadmin | high | Q8 | `input: false` dan tes yang mencobanya |
| Status baru tidak berlaku karena cookie cache sesi | medium | Q15 | Cek nilai bawaan `cookieCache`; matikan atau set `maxAge` pendek |
| Rate limit memakai IP yang salah di balik proxy hosting | medium | Q9, docs/concepts/rate-limit | Atur `advanced.ipAddress` sesuai hosting (ADR 0007 / 0017: hosting belum ditulis) |
| Batas koneksi Prisma Postgres lebih kecil dari pool `max` 10 | medium | Q12 | Cek batas plan Prisma Postgres sebelum menetapkan `max` |
| Seed tidak sengaja jalan ke database production | high | `database.md` "Never run in production" | Seed menolak berjalan tanpa penanda environment dev |
| Credential database ada di riwayat chat | medium | `01-idea.md` section 8 | Owner merotasi password database |
| Kelas arbitrary dari block gagal di `check:ui` | low | Q13 | Tulis ulang dengan token tema |

## 8. Remaining unknowns and stop-and-ask items

| Item | Why it is unresolved | Who decides | Blocks the PRD? |
|---|---|---|---|
| Plugin `username` dan (bila dipilih) `admin` | Plugin butuh ADR (ADR 0007 R) | Tech Lead / Software Architect | Tidak; blok architecture review |
| Runner seed (decision AB) | Dependency baru butuh ADR | Tech Lead | Tidak; blok task seed |
| Cara tes mencapai database test (decision AH) | Masih open | Tech Lead | Tidak; blok tes integrasi |
| Rate limit `/sign-in/username` | Docs hanya menyebut `/sign-in/email` | Agent, di feature spec dari types yang terpasang | Tidak |
| Nilai bawaan `session.cookieCache` | Halaman opsi belum dibaca penuh | Agent, di feature spec | Tidak |
| Batas koneksi Prisma Postgres dan versi PostgreSQL-nya | Belum dicek | Owner atau agent dari docs Prisma | Tidak |
| Hosting dan proxy (untuk `ipAddress`, `baseURL`, `trustedOrigins`) | ADR 0007 / 0017: setup hosting belum ditulis | Owner | Tidak; blok release |

## 9. Docs consulted
- better-auth@1.7 (`latest`): https://better-auth.com/llms.txt · 2026-11-07
- better-auth@1.7: https://better-auth.com/docs/integrations/tanstack · 2026-11-07
- better-auth@1.7: https://better-auth.com/docs/plugins/username · 2026-11-07
- better-auth@1.7: https://better-auth.com/docs/plugins/admin · 2026-11-07
- better-auth@1.7: https://better-auth.com/docs/authentication/email-password · 2026-11-07
- better-auth@1.7: https://better-auth.com/docs/concepts/typescript#the-input-property · 2026-11-07
- better-auth@1.7: https://better-auth.com/docs/concepts/rate-limit · 2026-11-07
- better-auth@1.7.18: https://unpkg.com/better-auth@1.7.18/dist/crypto/index.d.mts and `dist/plugins/username/index.d.mts` · 2026-11-07
- npm registry: dist-tags `better-auth`, `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg`, `zod`, `pino`; `better-auth@1.7.18` peerDependencies and exports · 2026-11-07
- pg-connection-string (dependency of pg@8.23.1): README on npm, section sslmode · 2026-11-07
- @tanstack/start-client-core@1.170.39: installed `dist/esm/createServerFn.d.ts` · 2026-11-07
- shadcn@4.23.0: `pnpm exec shadcn add login-04 --dry-run`, `--view src/shared/ui/login-form.tsx`, `add sidebar-07 --dry-run` · 2026-11-07
- Repo: `docs/04-stack/better-auth.md`, `drizzle-postgres.md`, `versions.md`, `docs/03-standards/database.md`, `environment.md`, ADR 0007, 0008, 0014 · 2026-11-07

Tools: Better Auth MCP used. shadcn MCP used (`search_items_in_registries`). Context7 not used. Drizzle MCP failed (connection closed); expected because `drizzle-kit` is not installed (`docs/05-agent-tooling/mcp.md`). No Drizzle API was needed in this phase.

## 10. Recommendation
- [x] Proceed to the prototype (section 5) or the PRD. Owner memilih prototype (lihat `Decision quote:`). **Decisions later phases must make:**
  - Prototype atau tidak: hipotesis integrasi di section 5 (Tech Lead).
  - Opsi role dan status, 4a (architecture review, ADR plugin).
  - Letak shell dashboard, 4c (architecture review).
  - Cara seed membuat akun, 4b, dan runner seed, decision AB (feature spec, ADR).
  - Aturan username dan password, dan penerimaan risiko enumeration (PRD).
  - Mekanisme write bersyarat untuk aktivasi, Q16 (feature spec).
  - `cookieCache`, rate limit `/sign-in/username`, dan `advanced.ipAddress` (feature spec).
- [ ] Needs clarification first: n/a
- [ ] Stop: n/a
