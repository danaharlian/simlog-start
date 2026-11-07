# Idea: Auth (register, login, logout, aktivasi akun oleh superadmin)

- Slug: `auth` (folder `specs/auth/`, file `01-idea.md`)
- Status: done
- Decided by: Dana Harliansyah (Product Manager, Business Sponsor), 2026-11-07, via chat
- Decision quote: "1. Terkonfirmasi tier L 2. Assumption di section 9 sudah benar 3. Lanjut ke research"
- Gate: none
- Tier: L
- Approval mode: personal
- Owner: Dana Harliansyah
- Author: AI agent
- Date: 2026-11-07

## 1. Tier (required)
Tier L karena fitur ini **membuat model auth dan permission pertama** di aplikasi. Belum ada sesi, identitas, maupun role, jadi setiap fitur berikutnya bergantung pada keputusan di sini. Model ini juga punya dua role (superadmin dan pengguna biasa) dan status akun (belum aktif, aktif).

Trigger yang kena (`docs/01-workflow/sdlc-pipeline.md`, section 1):
- L: perubahan model auth atau permission (model auth dan role superadmin dibuat dari nol).
- L: public API baru yang akan dipakai fitur lain (sesi, pengguna saat ini, status aktif, role), lewat `index.ts` / `index.server.ts`.
- Risk: auth, permission, sesi; data pribadi (email, nama, hash password).
- Risk: migration pertama (tabel pengguna, sesi, akun, verifikasi, plus kolom status dan role).
- Risk: dependency baru. `better-auth`, `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg`, dan `zod` belum ada di `package.json` (**Verified**, `package.json`, 2026-11-07). Setiap dependency butuh ADR. Plugin `username` Better Auth juga butuh ADR (`docs/05-agent-tooling/skills.md`).

Confirmed by: Dana Harliansyah, 2026-11-07, via chat (lihat `Decision quote:`).

## 2. Problem
Aplikasi simlog belum punya cara mengenali siapa penggunanya, dan administrator tidak bisa mengatur siapa yang boleh masuk. Saat ini setiap pengunjung anonim. Tidak ada akun, tidak ada sesi, tidak ada data yang bisa dibatasi per pengguna, dan tidak ada cara bagi pengembang aplikasi untuk menahan orang asing sebelum mereka melihat isi aplikasi. Akibatnya belum ada fitur dengan data pribadi yang bisa dibangun. Aturan "setiap server function yang menyentuh data pribadi punya auth check" (`AGENTS.md`) tidak bisa dipenuhi tanpa sesi.

**Evidence:** `src/features/` belum ada, dan `src/routes/` hanya berisi `__root.tsx` dan `index.tsx` (**Verified**, repo, 2026-11-07). Owner meminta register dengan email dan password, dan akun baru harus diaktifkan administrator (Dana Harliansyah, 2026-11-07, via chat).
**Who is affected:** calon pengguna simlog, superadmin (pengembang aplikasi), dan setiap fitur berikutnya yang butuh identitas. Jumlah pengguna: **Unknown**.
**If we do nothing:** fitur dengan data per pengguna belum bisa mulai dibangun, dan siapa pun yang tahu alamatnya bisa melihat aplikasi. Deadline: **Unknown**.

## 3. Desired outcome
- Seseorang bisa membuat akun dengan username, email, dan password. Akun baru berstatus belum aktif.
- Pengguna bisa login dengan username atau email, ditambah password.
- Setelah register atau login, pengguna diarahkan ke `/`. `/` adalah dashboard.
- Pengguna yang belum aktif selalu diarahkan ke halaman "menunggu persetujuan". Halaman ini hanya bisa dibuka oleh pengguna yang sudah login.
- Superadmin melihat akun yang belum aktif di dashboard dan mengaktifkannya. Setelah itu pengguna tersebut bisa membuka dashboard.
- Pengguna bisa keluar (logout).
- Server bisa menjawab "siapa pengguna request ini, apakah aktif, apa role-nya" untuk fitur lain.
- Seed membuat satu superadmin aktif dan akun contoh di database dev, sehingga pengembang bisa masuk tanpa mendaftar manual.

## 4. Non-goals (first cut)
- OAuth atau social login (keputusan owner, 2026-11-07).
- Verifikasi email, reset password, dan notifikasi email ke superadmin saat ada akun baru. Semuanya butuh layanan pengiriman email, yang merupakan integrasi eksternal baru (keputusan owner, 2026-11-07). Superadmin mengetahui akun baru dari dashboard.
- Role lain selain superadmin dan pengguna biasa, permission granular, organisasi, dan 2FA.
- Halaman profil dan ganti password.
- Isi dashboard selain shell (sidebar dan area konten) dan halaman aktivasi akun.

## 5. Solution hypothesis (optional, not binding)
- Better Auth dengan provider email dan password saja, plus adapter Drizzle ke PostgreSQL lewat driver `pg`.
- Plugin `username` Better Auth untuk login dengan username atau email (keputusan owner, 2026-11-07).
- Halaman register dan login memakai layout shadcn block `login-04` (form di satu sisi, gambar di sisi lain), dengan gambar `public/bdh.avif`.
- Dashboard di `/` memakai shadcn block `sidebar-07`, sidebar yang bisa diciutkan menjadi ikon.
- Halaman aktivasi akun untuk superadmin ada di dalam dashboard.
- Seed membuat satu superadmin aktif dan beberapa akun contoh. Email dan password superadmin diambil dari env, tidak ditulis di kode.

**Alternatives considered:**
- Do nothing: tidak mungkin, karena fitur lain butuh identitas.
- Pakai fitur atau tool yang sudah ada: belum ada fitur. Better Auth sudah menjadi pilihan stack di `AGENTS.md`, dan ADR 0030 mengatur MCP dan skill-nya.
- Ubah proses: n/a, ini bukan masalah proses.
- Aktivasi lewat script atau langsung di database: owner memilih halaman di dashboard (2026-11-07).

## 6. Existing features and systems touched

| Feature or system | How it is involved | Via |
|---|---|---|
| `src/features/*` | Belum ada fitur. `auth` menjadi fitur pertama. Apakah shell dashboard dan halaman aktivasi akun ada di `auth` atau di fitur terpisah diputuskan di architecture review | none yet |
| `src/shared/` (db, config, server logger, ui) | Koneksi database, env module (`DATABASE_URL`, secret auth, kredensial superadmin untuk seed), logger, primitive shadcn untuk `login-04` dan `sidebar-07`. `shared/db/` dan `shared/config/env.server.ts` belum ada | none yet |
| `src/routes/` | `/` menjadi dashboard. Ada route baru untuk register, login, menunggu persetujuan, aktivasi akun, dan handler Better Auth | none yet |
| PostgreSQL di Prisma Postgres (`db.prisma.io`) | Database dev dan database test terpisah | none yet |

## 7. Discovery notes
- Login memakai plugin `username` Better Auth, sehingga pengguna bisa masuk dengan username atau email · source: Dana Harliansyah, via chat · 2026-11-07 · Verified (keputusan owner; API plugin dicek di research)
- Dependency untuk Drizzle dengan PostgreSQL: `pnpm add drizzle-orm@rc pg` dan `pnpm add -D drizzle-kit@rc @types/pg` · source: Dana Harliansyah, mengutip situs resmi Drizzle (halaman connect PostgreSQL); agent belum membuka halaman ini, jadi versi persisnya dicek di research · 2026-11-07 · Inferred
- Owner punya dua database PostgreSQL terpisah di `db.prisma.io`, satu untuk dev dan satu untuk test, dengan `sslmode=verify-full` · source: Dana Harliansyah, via chat · 2026-11-07 · Verified
- Credential database ditempel di chat. Credential ini tidak ditulis di repo, dan owner sendiri yang memasukkannya ke `.env` (`docs/03-standards/environment.md`) · source: `AGENTS.md` · 2026-11-07 · Verified
- Gambar untuk layout `login-04` ada di `public/bdh.avif` (32.849 byte) · source: repo · 2026-11-07 · Verified
- `.env.example` belum ada di repo · source: repo · 2026-11-07 · Verified
- Script `db:generate`, `db:migrate`, dan `db:migrate:test` belum ada di `package.json` · source: `package.json`, `AGENTS.md` · 2026-11-07 · Verified
- Block `login-04` dan `sidebar-07` tersedia untuk registry Base UI · source: belum dicek · Unknown
- Drizzle MCP gagal tersambung di sesi ini · source: status MCP sesi · 2026-11-07 · Verified

## 8. Risks and known unknowns
| Item | Kind | How it gets resolved |
|---|---|---|
| Versi Better Auth, `drizzle-orm@rc`, `drizzle-kit@rc`, dan `pg` yang cocok satu sama lain dan dengan TanStack Start yang terpasang | technical | research question |
| Cara memasang Better Auth di TanStack Start (route handler, cookie, sesi di server function dan di `beforeLoad`) | technical | research question |
| Apakah tabel Better Auth dibuat lewat `drizzle-kit generate` dari schema milik fitur `auth` | technical / data | research question |
| Status aktif dan role: pakai plugin admin Better Auth (dependency yang sama, tapi butuh ADR plugin) atau kolom sendiri di tabel pengguna | technical / security | research question |
| Plugin `username`: kolom yang ditambahkan ke tabel pengguna, aturan bawaan (panjang, karakter yang diizinkan, unik tanpa membedakan huruf besar kecil), dan cara satu form login menerima username atau email | technical | research question |
| Isi block `login-04` dan `sidebar-07` di registry Base UI, dan primitive shadcn yang dibutuhkan | technical | research question |
| Seed harus memakai hashing password yang sama dengan Better Auth, dan tidak boleh jalan di production | security / data | research question |
| Dua superadmin mengaktifkan atau menolak akun yang sama pada saat bersamaan | data | feature spec (`docs/04-stack/drizzle-concurrency.md`) |
| Kebijakan password (panjang minimum) dan rate limit percobaan login | security | PRD question |
| Credential database sudah tersimpan di riwayat chat | security | owner decision (rotasi password database bila perlu) |

## 9. Open questions and assumptions
- **Assumption:** satu akun per email, dan email tidak dibedakan huruf besar kecilnya. Owner: Dana Harliansyah.
- **Assumption:** username wajib diisi saat register, unik, dan tidak dibedakan huruf besar kecilnya. Owner: Dana Harliansyah.
- **Assumption:** form login punya satu kolom "username atau email". Owner: Dana Harliansyah.
- **Unknown:** aturan username (panjang minimum dan maksimum, karakter yang diizinkan), dan apakah username bisa diganti setelah register. Owner: Dana Harliansyah (PRD question).
- **Assumption:** setelah register, pengguna langsung punya sesi (tidak perlu login ulang), lalu diarahkan ke `/`, lalu ke halaman menunggu persetujuan karena belum aktif. Owner: Dana Harliansyah.
- **Assumption:** pengguna yang belum aktif boleh login, tetapi hanya bisa membuka halaman menunggu persetujuan dan logout. Owner: Dana Harliansyah.
- **Assumption:** pengguna yang sudah login dan membuka halaman login atau register diarahkan ke `/`. Owner: Dana Harliansyah.
- **Unknown:** apakah superadmin juga bisa menolak akun atau menonaktifkan akun yang sudah aktif, dan apa yang dilihat pengguna yang ditolak. Owner: Dana Harliansyah (PRD question).
- **Unknown:** apakah boleh ada lebih dari satu superadmin, dan apakah superadmin bisa menjadikan pengguna lain superadmin. Owner: Dana Harliansyah (PRD question).
- **Unknown:** menu apa saja di sidebar `sidebar-07` pada cut pertama selain halaman aktivasi akun. Owner: Dana Harliansyah (PRD question).

## 10. Decision
- [x] Proceed to research (tier L, and tier M with unknowns), or straight to the PRD (tier M with no unknowns: say why). For tier S the issue with acceptance criteria is enough
- [ ] More discovery first: n/a
- [ ] Drop: n/a

## References
- shadcn block `login-04` dan `sidebar-07`: https://ui.shadcn.com/blocks (belum dibuka di sesi ini)
- Drizzle, connect PostgreSQL: https://orm.drizzle.team/docs/get-started-postgresql (dikutip owner, belum dibuka agent)
- Gambar halaman login dan register: `public/bdh.avif`
