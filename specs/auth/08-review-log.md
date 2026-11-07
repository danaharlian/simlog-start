# Review Log: Auth (register, login, logout, aktivasi akun oleh superadmin)

- Slug: `auth` (file `08-review-log.md`)
- Task Breakdown: `07-tasks.md`
- Status: draft
- Decided by: pending
- Gate: PR gate
- Tier: L

## T1: Register tersimpan di PostgreSQL dan `/status` membaca status dari database

### Round 1: 2026-11-08
- **PR:** https://github.com/danaharlian/simlog-start/compare/docs/auth-planning...feat/auth-t1 (PR belum dibuka; `gh` tidak terpasang) · **Commit reviewed:** `b201d5f`
- **Review passes:** separate-context pass (`code-review`): subagent general-purpose dengan konteks baru, read-only, 2026-11-08 · human review: pending (Dana Harliansyah)
- **Verdict:** request changes (subagent)

| ID | File:line | Review pass | Severity | Finding | Resolution | Status |
|---|---|---|---|---|---|---|
| R1-1 | `__tests__/accounts.service.test.ts:29` | tests | Blocking | Tes "AC16/D10" hanya `SELECT` by id, tidak pernah lewat `getSession`, cookie, atau header; jalur sesi tanpa tes | Fixed in `bb9fcb9`: `__tests__/session.service.test.ts` menguji `readSessionUserId` dengan cookie sign-up, tanpa cookie, dan token yang diubah, serta status baru lewat sesi yang sama; tes lama diganti nama | resolved |
| R1-2 | PR description | evidence | Blocking | Bukti `build`, `db:generate`, `db:migrate:test`, `drizzle-kit check`, dan cek manual tidak terlihat oleh reviewer | Semua sudah dijalankan sebelum review dan ada di draf deskripsi PR (scratchpad), yang tidak dibaca reviewer. Diulang setelah `bb9fcb9`: build PASS, `drizzle-kit check` bersih, bundle client tanpa kode server | resolved |
| R1-3 | `server/accounts.functions.ts:7` | security | Non-blocking | GET yang bergantung pada identitas tanpa `Cache-Control` | Fixed in `bb9fcb9`: `withSession` menyetel `Cache-Control: private, no-store` dan `Vary: Cookie`; terlihat di respons SSR `/status` (curl) | resolved |
| R1-4 | `routes/_status/status.tsx:7` | data fetching | Non-blocking | `staleTime: 'static'` di loader melawan R21 | Fixed in `bb9fcb9`: loader tanpa override; dicatat di change log spec (section 7), menunggu konfirmasi reviewer | resolved |
| R1-5 | `routes/__root.tsx` | UI | Non-blocking | Tidak ada `errorComponent` | Fixed in `bb9fcb9`: `RootError` dengan pesan umum dan tombol coba lagi | resolved |
| R1-6 | `docs/04-stack/better-auth.md:22` | docs, security | Non-blocking | Fakta `input: false` hanya setengah benar; `/update-user` tidak dites | Fixed in `bb9fcb9`: kalimat dikoreksi; tes `/update-user` (status, role) ditolak 400 dan baris tetap; sign-up dengan `statusChangedAt` ditolak 400 | resolved |
| R1-7 | `/api/auth/*` | security | Non-blocking | Pemeriksaan Origin (rule 9) tidak ada di task mana pun | Tes Vitest menunjukkan 200: Better Auth 1.7.18 melewati origin check saat `NODE_ENV=test` (`context/create-context.mjs`). Dibuktikan di dev server dengan curl: Origin asing 403, cross-site navigation 403, same origin 200. Dicatat di `better-auth.md` rule 9. Keputusan terbuka: lihat "Decisions" | resolved (keputusan terbuka di bawah) |
| R1-8 | `docs/decisions/0041-…md:21` | scope | Non-blocking | Perubahan ADR tanpa baris change log dan tanpa decider | Fixed in `bb9fcb9`: baris change log di `07-tasks.md` dan baris `Amended:` di ADR | resolved |
| R1-9 | `shared/db/columns.ts` | design | Non-blocking | `timestamps` tanpa pemakai | Fixed in `bb9fcb9`: dihapus, dicatat di change log | resolved |
| R1-10 | `docs/03-standards/testing.md:20` | docs | Non-blocking | Rule 1 bertentangan dengan ADR 0044 point 4 | Fixed in `bb9fcb9` | resolved |
| R1-11 | `07-tasks.md:64` | scope | Non-blocking | Nama tes berbeda dari rencana | Fixed in `bb9fcb9`: dicatat di change log | resolved |
| R1-12 | `06-feature-spec.md:168,174` | spec | Non-blocking | Spec memberi `updated_at` default `now()` di `sessions` dan `accounts`; migration tidak | Fixed in `bb9fcb9`: section 4 dikoreksi lewat change log, menunggu konfirmasi reviewer | resolved |
| R1-13 | `features/auth/README.md:36` | docs | Non-blocking | Kalimat tanda kutip terbalik | Fixed in `bb9fcb9` | resolved |
| R1-14 | `__tests__/sign-up.test.ts` | tests | Non-blocking | Tes `createdAt` tidak menangkap bug zona di UTC | Fixed in `bb9fcb9`: tes berjalan dengan `TZ=Asia/Jakarta` | resolved |
| R1-15 | `errors.ts:2` | spec | Non-blocking | `USERNAME_REQUIRED` tanpa prefiks fitur (`error-handling.md`) | Declined untuk T1: nama ditetapkan spec section 6; perubahannya keputusan spec. Diteruskan ke reviewer | open (keputusan reviewer) |
| R1-16 | `server/auth.repository.ts` | design | Non-blocking | `cookieCache` bergantung pada default | Fixed in `bb9fcb9`: `session.cookieCache.enabled: false` eksplisit | resolved |

**Unverified:**
- Header `Cache-Control` pada panggilan RPC server function dari client: hanya respons SSR yang dicek; middleware yang sama berlaku untuk keduanya (**Inferred**). Dicek saat T2 memakai navigasi client.
- Bahwa persetujuan Spec gate round 2 benar-benar diberikan: tercatat dengan kutipan di `06-feature-spec.md`. Hanya reviewer manusia yang bisa mengonfirmasinya.

**Decisions made in review:**
- Pemeriksaan Origin tidak bisa diuji di Vitest tanpa menyetel `advanced.disableOriginCheck: false`, dan `better-auth.md` rule 9 melarang menyetel opsi itu. Pilihannya: biarkan bukti curl di dev server (sekarang), atau izinkan `disableOriginCheck: false` secara eksplisit lewat ADR supaya tesnya otomatis. Keputusan reviewer.
- Dua koreksi spec (R1-4, R1-12) menunggu konfirmasi reviewer di change log spec.

**Outcome:** blocking findings resolved: yes · PR gate passed: not yet (menunggu Dana Harliansyah)
