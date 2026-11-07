# Prototype: Auth (register, login, logout, aktivasi akun oleh superadmin)

- Slug: `auth` (file `03-prototype.md`)
- Research: `02-research.md` (section 5 names the hypothesis)
- Status: done
- Decided by: Dana Harliansyah (Product Manager), 2026-11-07, via chat
- Decision quote: "03-prototype auth: diterima, lanjut ke PRD"
- Gate: none
- Author: AI agent
- Seen by: Dana Harliansyah (Tech Lead), 2026-11-07, hasil sementara via chat
- Date: 2026-11-07

Spike dihentikan oleh owner sebelum time-box habis. Keputusan owner (2026-11-07, via chat): fase idea, research, prototype, PRD, architecture review, dan feature spec hanya berisi dokumentasi, dan semua pemasangan dependency, generate, serta pengecekan error dilakukan saat mengerjakan task dari task breakdown. File ini mencatat yang sudah teramati sebelum spike dihentikan, dan memindahkan sisa hipotesis ke task pertama.

## 1. Hypothesis
Better Auth 1.7.18 dengan adapter Drizzle `1.0.0-rc.5`, `pg` 8.23.1, plugin `username`, dan `tanstackStartCookies` bisa melakukan register, login dengan username, `getSession` di server function, dan logout di TanStack Start 1.169.4. Migration dari `auth generate` + `drizzle-kit generate` berhasil diterapkan ke Prisma Postgres (`sslmode=verify-full`). Jika salah, feature spec harus memilih adapter atau cara pembuatan schema lain, dan ADR 0007 R atau decision AA perlu ditinjau.

## 2. What was built
Branch: `spike/auth` (dibuat dari `master` `bc8f877`, tanpa commit, dihapus 2026-11-07) · Time-box: setengah hari, dihentikan lebih awal · Database: test (keputusan owner); tidak sempat tersambung karena `.env` belum ada.

Yang sempat dibuat: dependency terpasang exact (`better-auth` 1.7.18, `drizzle-orm` dan `drizzle-kit` 1.0.0-rc.5, `pg` dan `@types/pg` 8.23.1, `zod` 4.6.7); `auth.ts` dengan `drizzleAdapter` dari `better-auth/adapters/drizzle`, `emailAndPassword`, `user.additionalFields` `role` dan `status` (`input: false`), plugin `username()` dan `tanstackStartCookies()`; server route `src/routes/api/auth/$.ts`; server function `getRequestHeaders` + `auth.api.getSession`; `drizzle.config.ts`. Semua perubahan dibuang dan `node_modules` dipulihkan dengan `pnpm install`.

Yang tidak dibuat: UI (keputusan owner: integrasi saja).

## 3. Result and evidence

| Question | Result | Evidence | Consequence for the PRD or spec |
|---|---|---|---|
| Apakah versi yang dipilih bisa dipasang bersama? | Ya | `pnpm add -E` selesai tanpa konflik peer, pnpm 12.16.1, 2026-11-07 | Versi di `02-research.md` section 3 dipakai di task pertama |
| Apakah export yang dibutuhkan ada di paket terpasang? | Ya | `better-auth/package.json` `exports`: `./tanstack-start`, `./adapters/drizzle`, `./plugins`, `./client`, `./client/plugins`. `./adapters/drizzle` me-re-export `@better-auth/drizzle-adapter`. `DrizzleAdapterConfig`: `provider`, `schema`, `usePlural`, `camelCase`, `transaction` | Import sesuai ADR 0007 R bisa dipakai |
| Apakah schema dari `pnpm dlx auth@1.7.18 generate` lolos typecheck di Drizzle 1.0 RC? | **Tidak** | `tsc --noEmit`: `TS2724: '"drizzle-orm"' has no exported member named 'relations'` pada `import { relations } from "drizzle-orm"`. Docs adapter: relations v2 butuh `@better-auth/drizzle-adapter/relations-v2` (https://better-auth.com/docs/adapters/drizzle#drizzle-relations-v2) | `better-auth.md` rule 5 ("never hand-edit generated auth tables") tidak bisa diikuti apa adanya. Feature spec memilih: buang blok relations dari output CLI, atau pakai adapter relations-v2 (dependency langsung `@better-auth/drizzle-adapter`, bertentangan dengan ADR 0007 R dan decision AA) |
| Apakah schema tanpa relations lolos typecheck? | Ya | Blok `relations` dihapus; `tsc --noEmit` exit 0. `session.user.username`, `role`, dan `status` ter-infer tanpa cast | Relations hanya dibutuhkan untuk `advanced.database.joins` (docs adapter, "Joins"). Tanpa joins, opsi ini tetap sesuai ADR 0007 R dan decision AA. **Not run:** query sungguhan dengan adapter ini |
| Apakah `drizzle-kit generate` menghasilkan migration dari schema itu? | Ya, offline | `drizzle/20261107021812_spike_auth/migration.sql`: tabel `user`, `session`, `account`, `verification`; index `account_userId_idx`, `session_userId_idx`, `verification_identifier_idx`; FK `ON DELETE CASCADE` | Lihat baris berikut untuk isi kolom |
| Bagaimana bentuk kolom yang dihasilkan? | Teramati | `user.username text UNIQUE` (nullable), `display_username text`, `role text DEFAULT 'user'` (nullable), `status text DEFAULT 'pending'` (nullable), `email text NOT NULL UNIQUE`; semua timestamp `timestamp` tanpa time zone; id `text` | Feature spec memutuskan: `username` dan `status` `NOT NULL`, nilai `status` yang sah (check constraint atau enum), timestamp dengan time zone, dan apakah `email` unik tanpa membedakan huruf besar kecil di level database |
| Migrate ke Prisma Postgres, lalu register, login username dan email, `getSession`, logout | **Not run** | `.env` belum ada saat spike dihentikan | Dibuktikan di task pertama (riskiest first) |
| `role` atau `status` yang dikirim saat register diabaikan | **Not run** | Sama | Tes wajib di task pertama |

**Carries forward:** knowledge only. **Branch deleted when:** 2026-11-07 (sudah dihapus).

## 4. User flow (UI only)
n/a: owner memilih prototype integrasi saja; alur UI ditulis di PRD dan feature spec.

## 5. Layout sketch (UI only)
n/a: alasan sama dengan section 4.

## 6. Open points for the PRD

| Point | Who decides | Why it is still open |
|---|---|---|
| Hipotesis integrasi end-to-end belum terbukti; task pertama harus membuktikannya sebelum task lain | Tech Lead | Spike dihentikan sebelum terhubung ke database |
| Cara memakai output `auth generate` di Drizzle 1.0 RC (buang relations atau adapter relations-v2) | Software Architect (architecture review, ADR bila memilih relations-v2) | Bertentangan dengan ADR 0007 R dan decision AA |
| Kolom nullable dari CLI (`username`, `role`, `status`) dan timestamp tanpa time zone | Tech Lead (feature spec) | PRD hanya perlu menyatakan bahwa username wajib dan setiap akun punya status |
| Usulan pipeline: phase 3 tidak membangun kode bila owner memintanya | Product Manager (phase 11, pipeline feedback) | `docs/01-workflow/sdlc-pipeline.md` masih menyebut prototype dibangun di `spike/<slug>` |
