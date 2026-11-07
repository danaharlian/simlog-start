# PRD: Auth (register, login, logout, aktivasi akun oleh superadmin)

- Slug: `auth` (folder `specs/auth/`, file `04-prd.md`)
- Idea: `01-idea.md` (decision: proceed)
- Research: `02-research.md`
- Prototype: `03-prototype.md` (spike dihentikan atas keputusan owner, 2026-11-07; hipotesis integrasi dibuktikan di task pertama)
- Status: approved
- Gate: PRD gate
- Tier: L
- Owner: Dana Harliansyah
- Author: AI agent
- Reviewers: Dana Harliansyah (Product Owner, Tech Lead, QA Lead)
- Date: 2026-11-07
- Approved by: Dana Harliansyah (Product Owner), 2026-11-07, via chat

## Gate readiness

| Item | Where | Ready |
|---|---|---|
| Problem and target user | section 2 | ya |
| Priority, rationale, and decision owner | section 2 | ya |
| Success metric with baseline, target, window, and owner | section 3 | **tidak**: target M1 dan M2 belum ditetapkan owner (section 12, Q1) |
| Scope and non-goals | section 4 | ya |
| Roles and permissions | section 7 | ya |
| Sensitive data: classification, retention, deletion | section 7 | **sebagian**: retensi dan jalur penghapusan belum diputuskan (section 12, Q2) |
| Acceptance criteria cover every Must requirement | section 9 | ya (cek cakupan di akhir section 9) |
| Release and regression expectations, rollback trigger and owner | section 11 | ya |

## 1. Summary
Simlog mendapat akun dan sesi. Pengunjung mendaftar dengan nama, username, email, dan password. Akun baru menunggu persetujuan superadmin sebelum bisa membuka dashboard di `/`. Superadmin mengaktifkan, menolak, dan menonaktifkan akun, serta mengangkat dan mencabut superadmin lain. Pengembang mengisi database dev lewat seed. Fitur ini dibuat sekarang karena belum ada fitur dengan data per pengguna yang bisa dibangun sebelum ada identitas (`01-idea.md` section 2).

## 2. Problem, priority, and rationale
**Problem:** simlog belum bisa mengenali penggunanya, dan pengembang aplikasi tidak bisa menahan orang asing sebelum mereka melihat isi aplikasi. Setiap pengunjung anonim. **Evidence:** `01-idea.md` section 2 (repo diperiksa 2026-11-07; permintaan owner, 2026-11-07).
**Priority:** MoSCoW per requirement (section 6) · **Expected impact:** semua fitur berikutnya bisa dibatasi per pengguna, dan hanya akun yang disetujui yang bisa masuk · **Decision owner:** Dana Harliansyah (Product Owner) · **Why now:** fitur pertama; fitur lain bergantung padanya. Deadline: **Unknown**.

## 3. Goals and success metrics

| Metric | Baseline | Target | Measurement window | Data source | Owner |
|---|---|---|---|---|---|
| M1: median waktu dari register sampai superadmin memutuskan (aktif atau ditolak) | Unknown: fitur belum ada. Diambil dari waktu register dan waktu keputusan per akun mulai hari rilis | **Unknown**: ditetapkan owner di PRD gate | 30 hari setelah rilis production | none yet (waktu register dan waktu keputusan per akun) | Dana Harliansyah |
| M2: jumlah akun yang masih menunggu lebih lama dari batas yang ditetapkan owner | Unknown: dihitung pertama kali 7 hari setelah rilis | **Unknown**: ditetapkan owner di PRD gate | 30 hari setelah rilis production | none yet | Dana Harliansyah |

## 4. Scope
**In scope:**
- Register dengan nama, username, email, password, dan konfirmasi password. Akun baru berstatus menunggu.
- Login dengan username atau email, ditambah password. Logout.
- Status akun: menunggu, aktif, ditolak, nonaktif. Hanya akun aktif yang bisa membuka dashboard.
- Halaman status untuk akun yang menunggu, ditolak, atau nonaktif.
- Dashboard di `/` dengan sidebar yang bisa diciutkan menjadi ikon (layout `sidebar-07`).
- Halaman login dan register dengan form di satu sisi dan gambar `public/bdh.avif` di sisi lain (layout `login-04`).
- Halaman manajemen pengguna untuk superadmin: melihat akun, mengaktifkan, menolak, menonaktifkan, mengangkat superadmin, dan mencabut superadmin.
- Seed untuk database dev: satu superadmin aktif dan akun contoh di setiap status.

**Non-goals:**
- OAuth atau social login.
- Verifikasi email, reset password, dan notifikasi email apa pun.
- Role selain superadmin dan pengguna, permission granular, organisasi, dan 2FA.
- Halaman profil, ganti password, ganti username (username tidak bisa diganti, keputusan owner 2026-11-07), dan hapus akun.
- Isi dashboard selain shell, halaman beranda sederhana, dan manajemen pengguna.
- Tombol "Forgot password", tombol OAuth, dan tautan Terms atau Privacy dari block `login-04`.

## 5. Users and stories
Roles: Pengunjung (belum login), Pengguna (login, berstatus menunggu, aktif, ditolak, atau nonaktif), Superadmin (pengguna aktif dengan role superadmin), Pengembang (menjalankan seed di dev).

| ID | As a (role) | I want to | So that | Priority |
|---|---|---|---|---|
| US1 | Pengunjung | membuat akun dengan nama, username, email, dan password | saya bisa meminta akses ke simlog | Must |
| US2 | Pengguna | login dengan username atau email, lalu logout | saya bisa memakai simlog dengan akun saya dan mengakhiri sesi | Must |
| US3 | Pengguna yang belum aktif | melihat status akun saya setelah login | saya tahu harus menunggu, atau bahwa akun saya ditolak atau dinonaktifkan | Must |
| US4 | Pengguna aktif | membuka dashboard dengan sidebar | saya bisa berpindah ke halaman yang boleh saya buka | Must |
| US5 | Superadmin | melihat akun yang menunggu, lalu mengaktifkan atau menolaknya | hanya orang yang saya setujui yang masuk | Must |
| US6 | Superadmin | menonaktifkan akun aktif dan mengaktifkan kembali akun yang ditolak atau nonaktif | saya bisa mencabut dan memulihkan akses | Must |
| US7 | Superadmin | mengangkat pengguna aktif menjadi superadmin dan mencabutnya kembali | lebih dari satu orang bisa mengelola akun | Must |
| US8 | Pengembang | mengisi database dev dengan akun contoh | saya bisa login dan menguji setiap status tanpa mendaftar manual | Must |

## 6. Requirements
**Functional:**

| ID | Requirement | Story | Priority |
|---|---|---|---|
| R1 | Form register meminta nama, username, email, password, dan konfirmasi password; semuanya wajib | US1 | Must |
| R2 | Username 3 sampai 30 karakter, hanya huruf, angka, `_`, dan `.`; unik tanpa membedakan huruf besar kecil; tidak bisa diganti setelah register | US1 | Must |
| R3 | Email unik tanpa membedakan huruf besar kecil | US1 | Must |
| R4 | Password 8 sampai 128 karakter, dan konfirmasi harus sama (**Assumption**: panjang mengikuti bawaan, `02-research.md` Q9; owner: Dana Harliansyah) | US1 | Must |
| R5 | Akun baru berstatus menunggu dan berrole pengguna. Pengunjung tidak bisa memilih status atau role saat register | US1 | Must |
| R6 | Setelah register berhasil, pengguna langsung login dan diarahkan ke `/` | US1, US3 | Must |
| R7 | Satu kolom login menerima username atau email, ditambah password. Huruf besar kecil pada username dan email diabaikan | US2 | Must |
| R8 | Login yang gagal menampilkan satu pesan yang sama, apa pun penyebabnya (username atau email tidak ada, atau password salah) | US2 | Must |
| R9 | Setelah login berhasil, pengguna diarahkan ke `/` | US2 | Must |
| R10 | Pengguna bisa logout dari dashboard dan dari halaman status; setelah logout, pengguna berada di halaman login | US2, US3 | Must |
| R11 | Pengguna yang belum login dan membuka halaman selain login atau register diarahkan ke halaman login | US2 | Must |
| R12 | Pengguna yang sudah login dan membuka halaman login atau register diarahkan ke `/` | US2 | Must |
| R13 | Pengguna berstatus menunggu, ditolak, atau nonaktif yang membuka halaman mana pun selain halaman status diarahkan ke halaman status. Halaman itu menyebut statusnya dan apa artinya | US3 | Must |
| R14 | Halaman status hanya bisa dibuka oleh pengguna yang sudah login; pengguna aktif yang membukanya diarahkan ke `/` | US3 | Must |
| R15 | Pengguna aktif melihat dashboard di `/` dengan sidebar yang bisa diciutkan menjadi ikon. Menu: Beranda, Manajemen pengguna (hanya superadmin), dan menu pengguna (nama, username, logout) | US4 | Must |
| R16 | Superadmin melihat daftar akun dengan nama, username, email, status, role, dan waktu register, bisa disaring per status, dan akun menunggu bisa ditampilkan lebih dulu | US5 | Must |
| R17 | Superadmin bisa mengaktifkan atau menolak akun yang menunggu | US5 | Must |
| R18 | Superadmin bisa menonaktifkan akun aktif, dan mengaktifkan kembali akun yang ditolak atau nonaktif | US6 | Must |
| R19 | Superadmin bisa mengangkat pengguna aktif menjadi superadmin, dan mencabut role superadmin dari superadmin lain | US7 | Must |
| R20 | Superadmin tidak bisa menonaktifkan dirinya sendiri atau mencabut role superadmin dirinya sendiri. Selalu tersisa minimal satu superadmin aktif | US7 | Must |
| R21 | Perubahan status atau role berlaku pada navigasi berikutnya pengguna itu, tanpa perlu login ulang | US3, US6, US7 | Must |
| R22 | Hanya superadmin yang bisa melihat daftar akun dan mengubah status atau role, termasuk lewat request langsung tanpa UI | US5, US6, US7 | Must |
| R23 | Halaman login dan register memakai layout form di satu sisi dan gambar `public/bdh.avif` di sisi lain; di layar sempit gambar disembunyikan | US1, US2 | Should |
| R24 | Seed membuat satu superadmin aktif (email, username, dan password dari konfigurasi lingkungan, tidak ditulis di kode) dan akun contoh berstatus menunggu, aktif, ditolak, dan nonaktif | US8 | Must |
| R25 | Seed bisa dijalankan berulang tanpa membuat akun ganda, dan menolak berjalan terhadap database production | US8 | Must |

**Non-functional:**

| ID | Category | Target | Verification |
|---|---|---|---|
| NFR1 | security | Percobaan login berulang dari satu sumber dibatasi: lebih dari 3 percobaan dalam 10 detik ditolak dengan pesan "coba lagi nanti" (**Assumption**: angka bawaan, `02-research.md` Q9; owner: Dana Harliansyah) | automated test |
| NFR2 | security | Password tidak pernah tersimpan atau tercatat dalam bentuk asli, dan tidak muncul di log | audit + automated test |
| NFR3 | security | Setiap aksi superadmin ditolak untuk selain superadmin aktif, walaupun dikirim tanpa UI (R22) | automated test |
| NFR4 | reliability | Dua superadmin yang mengubah akun yang sama pada saat bersamaan tidak menghasilkan keadaan yang melanggar R20, dan yang kalah mendapat pesan bahwa status sudah berubah | automated test terhadap database sungguhan |
| NFR5 | accessibility | Form login dan register bisa diisi dan dikirim hanya dengan keyboard; setiap kolom punya label; pesan error terbaca oleh screen reader (**Assumption**: level ini, bukan WCAG penuh; decision W; owner: Dana Harliansyah) | manual check |
| NFR6 | privacy | Daftar akun hanya menampilkan kolom di R16; password dan data sesi tidak pernah ditampilkan | automated test |

## 7. Permissions and data
**Roles and permissions:**

| Role | Can | Cannot | Data scope |
|---|---|---|---|
| Pengunjung | Membuka login dan register; register; login | Membuka halaman lain | Tidak ada |
| Pengguna menunggu, ditolak, atau nonaktif | Melihat halaman status; logout | Membuka dashboard dan halaman lain | Nama, username, dan status dirinya |
| Pengguna aktif | Membuka dashboard dan Beranda; logout | Membuka manajemen pengguna; mengubah status atau role siapa pun | Data dirinya |
| Superadmin | Semua yang bisa dilakukan pengguna aktif; melihat daftar akun; mengubah status (R17, R18) dan role (R19) akun lain | Menonaktifkan atau mencabut role dirinya sendiri (R20) | Kolom di R16 untuk semua akun |
| Pengembang | Menjalankan seed di database dev | Menjalankan seed di production (R25) | Database dev |

**Sensitive data:**

| Data | Classification | Retention period | Deletion or anonymization path | Who may access |
|---|---|---|---|---|
| Nama, username, email | data pribadi | **Unknown** (Q2) | belum ada di cut ini (Q2) | pemilik akun; superadmin (lewat R16) |
| Password | rahasia (hanya disimpan dalam bentuk hash, NFR2) | selama akun ada | ikut terhapus bersama akun (belum ada jalur, Q2) | tidak ada orang |
| Data sesi (waktu, alamat IP, user agent) | data pribadi | sampai sesi berakhir atau logout (**Assumption**, owner: Dana Harliansyah) | dihapus saat sesi berakhir | tidak ditampilkan di UI cut ini |
| Status, role, waktu register, waktu keputusan | data internal | selama akun ada | ikut terhapus bersama akun | superadmin |

## 8. Edge cases and error scenarios

| ID | Scenario | Expected behavior | Becomes |
|---|---|---|---|
| EC1 | Register dengan email yang sudah dipakai, dengan huruf besar kecil berbeda | Pesan "email sudah dipakai" di kolom email; tidak ada akun baru (**Assumption**: owner menerima bahwa email terdaftar bisa ditebak, `02-research.md` section 6; owner: Dana Harliansyah) | AC3 |
| EC2 | Register dengan username yang sudah dipakai, dengan huruf besar kecil berbeda | Pesan "username sudah dipakai"; tidak ada akun baru | AC3 |
| EC3 | Username terlalu pendek, terlalu panjang, atau berisi karakter lain | Pesan di kolom username sebelum dikirim | AC2 |
| EC4 | Konfirmasi password tidak sama, atau password di luar 8 sampai 128 karakter | Pesan di kolom terkait; form tidak dikirim | AC2 |
| EC5 | Request register yang menyertakan status atau role | Akun tetap berstatus menunggu dan berrole pengguna | AC4 |
| EC6 | Login dengan password salah, atau username atau email yang tidak ada | Pesan yang sama untuk keduanya | AC7 |
| EC7 | Login berulang terlalu cepat | Ditolak dengan pesan "coba lagi nanti" | AC21 |
| EC8 | Pengguna yang sudah login membuka login atau register | Diarahkan ke `/` | AC9 |
| EC9 | Pengguna yang belum login membuka `/`, halaman status, atau manajemen pengguna | Diarahkan ke login | AC8 |
| EC10 | Pengguna menunggu membuka URL manajemen pengguna secara langsung | Diarahkan ke halaman status | AC10 |
| EC11 | Pengguna aktif biasa membuka manajemen pengguna | Halaman "tidak punya akses"; menu tidak muncul di sidebar | AC13 |
| EC12 | Pengguna diaktifkan saat sedang berada di halaman status | Pada navigasi atau muat ulang berikutnya, pengguna masuk ke `/` | AC16 |
| EC13 | Pengguna dinonaktifkan saat sedang berada di dashboard | Pada navigasi berikutnya, pengguna diarahkan ke halaman status "nonaktif" | AC16 |
| EC14 | Dua superadmin mengubah akun yang sama pada saat bersamaan | Satu perubahan berhasil; yang lain melihat pesan "status sudah berubah" dan daftar diperbarui | AC20 |
| EC15 | Superadmin mencoba menonaktifkan atau mencabut role dirinya sendiri | Aksi tidak ditawarkan di UI; request langsung ditolak | AC18 |
| EC16 | Dua superadmin saling mencabut role pada saat bersamaan | Minimal satu superadmin aktif tetap ada | AC20 |
| EC17 | Superadmin yang dicabut atau dinonaktifkan masih membuka halaman manajemen pengguna | Aksi berikutnya ditolak; navigasi berikutnya sesuai role dan status barunya | AC19 |
| EC18 | Superadmin mencoba mengangkat pengguna yang belum aktif menjadi superadmin | Ditolak dengan pesan bahwa hanya pengguna aktif yang bisa diangkat | AC17 |
| EC19 | Sesi berakhir saat pengguna berada di dashboard | Navigasi berikutnya diarahkan ke login | AC8 |
| EC20 | Seed dijalankan dua kali, atau dijalankan dengan konfigurasi production | Tidak ada akun ganda; dengan konfigurasi production seed berhenti dengan pesan | AC22, AC23 |
| EC21 | Daftar akun kosong untuk status yang disaring | Pesan "tidak ada akun dengan status ini" | AC14 |

## 9. Acceptance criteria
- AC1 (covers R1, R2, R3, R4, R5, R6): Given pengunjung di halaman register, When ia mengisi nama, username `Budi.Santoso`, email, password 8 karakter, dan konfirmasi yang sama lalu mengirim, Then akun dibuat dengan username `budi.santoso`, status menunggu, role pengguna, ia sudah login, dan ia berada di halaman status "menunggu persetujuan".
- AC2 (covers R2, R4, EC3, EC4): Given pengunjung di halaman register, When username berisi 2 karakter, 31 karakter, atau karakter selain huruf, angka, `_`, `.`, atau password 7 karakter, atau konfirmasi berbeda, Then form tidak dikirim dan kolom terkait menampilkan pesannya.
- AC3 (covers R2, R3, EC1, EC2): Given akun dengan email `budi@contoh.id` dan username `budi` sudah ada, When pengunjung register dengan email `Budi@Contoh.id` atau username `BUDI`, Then register ditolak dengan pesan "email sudah dipakai" atau "username sudah dipakai", dan jumlah akun tidak berubah.
- AC4 (covers R5, EC5): Given request register yang menyertakan status aktif dan role superadmin, When request dikirim, Then akun yang dibuat berstatus menunggu dan berrole pengguna.
- AC5 (covers R7, R9): Given akun aktif dengan username `budi` dan email `budi@contoh.id`, When ia login dengan `BUDI` dan passwordnya, lalu di sesi lain dengan `Budi@Contoh.id` dan passwordnya, Then kedua login berhasil dan ia berada di `/`.
- AC6 (covers R10): Given pengguna yang sudah login di dashboard atau di halaman status, When ia memilih logout, Then ia berada di halaman login, dan membuka `/` mengarahkannya kembali ke login.
- AC7 (covers R8, EC6): Given akun `budi`, When login dengan password salah, dan When login dengan username `tidakada`, Then kedua percobaan menampilkan pesan yang sama persis dan tidak ada sesi yang dibuat.
- AC8 (covers R11, EC9, EC19): Given pengunjung tanpa sesi atau dengan sesi yang sudah berakhir, When ia membuka `/`, halaman status, atau manajemen pengguna, Then ia diarahkan ke halaman login.
- AC9 (covers R12, EC8): Given pengguna yang sudah login dengan status apa pun, When ia membuka halaman login atau register, Then ia diarahkan ke `/` (lalu ke halaman status sesuai R13 jika belum aktif).
- AC10 (covers R13, EC10): Given pengguna berstatus menunggu, ditolak, atau nonaktif, When ia membuka `/` atau URL manajemen pengguna, Then ia diarahkan ke halaman status yang menyebut statusnya.
- AC11 (covers R14): Given pengguna aktif, When ia membuka halaman status, Then ia diarahkan ke `/`.
- AC12 (covers R15): Given pengguna aktif berrole pengguna, When ia membuka `/`, Then ia melihat dashboard dengan menu Beranda dan menu pengguna (nama, username, logout), tanpa menu Manajemen pengguna; When ia menciutkan sidebar, Then sidebar hanya menampilkan ikon.
- AC13 (covers R15, R22, NFR3, EC11): Given pengguna aktif berrole pengguna, When ia membuka URL manajemen pengguna atau mengirim request aksi superadmin secara langsung, Then halaman menampilkan "tidak punya akses" dan request ditolak tanpa mengubah data.
- AC14 (covers R16, NFR6, EC21): Given superadmin dan akun di keempat status, When ia membuka manajemen pengguna dan menyaring per status, Then setiap baris hanya menampilkan nama, username, email, status, role, dan waktu register, akun menunggu bisa ditampilkan lebih dulu, dan saringan tanpa hasil menampilkan "tidak ada akun dengan status ini".
- AC15 (covers R17, R18): Given akun menunggu A dan B, akun aktif C, dan akun ditolak D, When superadmin mengaktifkan A, menolak B, menonaktifkan C, dan mengaktifkan D, Then statusnya menjadi aktif, ditolak, nonaktif, dan aktif.
- AC16 (covers R21, EC12, EC13): Given pengguna A berada di halaman status "menunggu" dan pengguna C berada di dashboard, When superadmin mengaktifkan A dan menonaktifkan C, Then pada navigasi berikutnya tanpa login ulang A berada di `/` dan C berada di halaman status "nonaktif".
- AC17 (covers R19, EC18): Given pengguna aktif E dan pengguna menunggu F, When superadmin mengangkat E, Then E melihat menu Manajemen pengguna pada navigasi berikutnya; When superadmin mencoba mengangkat F, Then aksi ditolak dengan pesan bahwa hanya pengguna aktif yang bisa diangkat.
- AC18 (covers R20, EC15): Given superadmin S, When S membuka baris dirinya, Then aksi nonaktifkan dan cabut superadmin tidak ditawarkan; When request itu dikirim langsung untuk dirinya, Then request ditolak dan status serta role S tidak berubah.
- AC19 (covers R19, R21, EC17): Given superadmin S1 dan S2, When S1 mencabut role S2 lalu S2 mencoba mengaktifkan sebuah akun, Then aksi S2 ditolak dan navigasi berikutnya S2 tidak menampilkan menu Manajemen pengguna.
- AC20 (covers NFR4, EC14, EC16): Given superadmin S1 dan S2 dan akun menunggu A, When S1 mengaktifkan A dan S2 menolak A pada saat bersamaan, Then A berakhir di tepat satu status dan superadmin yang kalah melihat "status sudah berubah"; When S1 dan S2 saling mencabut role pada saat bersamaan, Then minimal satu dari mereka tetap superadmin aktif.
- AC21 (covers NFR1, EC7): Given lingkungan production, When satu sumber mengirim lebih dari 3 percobaan login dalam 10 detik, Then percobaan berikutnya ditolak dengan pesan "coba lagi nanti".
- AC22 (covers R24, R25, EC20, US8): Given database dev kosong dan konfigurasi superadmin terisi, When seed dijalankan dua kali, Then ada tepat satu superadmin aktif dengan email dan username dari konfigurasi, satu akun contoh di setiap status, dan tidak ada akun ganda; superadmin itu bisa login.
- AC23 (covers R25, EC20): Given konfigurasi yang menandakan production, When seed dijalankan, Then seed berhenti dengan pesan sebelum menulis apa pun.
- AC24 (covers NFR2): Given register, login yang gagal, dan login yang berhasil, When log server dan isi database diperiksa, Then password asli tidak ditemukan di log maupun di database.
- AC25 (covers R23): Given layar lebar, When halaman login atau register dibuka, Then form tampil di satu sisi dan gambar `bdh.avif` di sisi lain; Given layar sempit, Then hanya form yang tampil.
- AC26 (covers NFR5): Given halaman login dan register, When diisi dan dikirim hanya dengan keyboard dan screen reader, Then setiap kolom terbaca dengan labelnya dan pesan error dibacakan.

Cakupan: R1 sampai R25 dan NFR1 sampai NFR6 masing-masing muncul di minimal satu AC. EC1 sampai EC21 masing-masing dipetakan ke AC di section 8.

## 10. Dependencies, constraints, and assumptions
**Existing features and systems touched:**

| Feature or system | Why it is needed | Owner | Status |
|---|---|---|---|
| Halaman `/` (scaffold saat ini) | Menjadi dashboard | Dana Harliansyah | ready |
| `public/bdh.avif` | Gambar halaman login dan register | Dana Harliansyah | ready |

**External dependencies:**

| Feature or system | Why it is needed | Owner | Status |
|---|---|---|---|
| PostgreSQL di Prisma Postgres, database dev dan test | Menyimpan akun dan sesi | Dana Harliansyah | ready (database ada; koneksi belum dicoba, `03-prototype.md`) |
| Hosting production dan staging | Menjalankan aplikasi; menentukan alamat publik dan proxy | Dana Harliansyah | blocked: setup hosting belum ditulis (ADR 0007, 0017) |

**Constraints:** tidak ada pengiriman email di cut ini; deadline **Unknown**.
**Assumptions:**
- **Assumption:** superadmin bisa mengaktifkan kembali akun yang ditolak atau nonaktif (R18). Owner: Dana Harliansyah.
- **Assumption:** pengguna yang ditolak atau nonaktif tetap bisa login, lalu melihat halaman status, seperti pengguna menunggu (R13). Owner: Dana Harliansyah.
- **Assumption:** menonaktifkan superadmin tidak mencabut role-nya, tetapi akun itu tidak bisa membuka dashboard selama nonaktif. Owner: Dana Harliansyah.
- **Assumption:** menu sidebar cut pertama hanya Beranda, Manajemen pengguna, dan menu pengguna (R15). Owner: Dana Harliansyah.
- **Assumption:** halaman Beranda berisi sapaan dengan nama pengguna. Owner: Dana Harliansyah.
- Asumsi R4, NFR1, NFR5, EC1, dan data sesi: lihat baris masing-masing.

## 11. Release and regression expectations

| Item | Decision |
|---|---|
| User journeys that must keep working | Belum ada journey pengguna; halaman `/` scaffold digantikan dashboard. Regresi untuk QA: AC5, AC6, AC8, AC10, dan AC13 |
| Backward compatibility | n/a: belum ada data pengguna; ini migration pertama |
| Rollout preference | direct release; owner: Dana Harliansyah (Release Owner) |
| Rollback trigger | Register atau login gagal untuk akun yang benar, atau pengguna yang belum aktif bisa membuka dashboard · kembalikan ke versi sebelumnya · Dana Harliansyah (Release Owner) |
| Post-release review | 30 hari setelah rilis production, Dana Harliansyah, membaca M1 dan M2: keep, revise, atau roll back |

## 12. Open questions and risks

| Open question or risk | Impact | Owner | Resolved how |
|---|---|---|---|
| Q1: target M1 dan M2 | Gate readiness belum lengkap; tahap Measure tidak punya target | Dana Harliansyah | Owner menetapkan angka di PRD gate |
| Q2: retensi data pribadi dan jalur hapus akun | Akun yang ditolak tetap tersimpan tanpa batas waktu | Dana Harliansyah | Owner memutuskan di PRD gate, atau mencatatnya sebagai fitur lanjutan |
| Q3: hipotesis integrasi end-to-end belum terbukti (`03-prototype.md`) | Jika gagal, feature spec dan ADR berubah | Dana Harliansyah (Tech Lead) | Task pertama, riskiest first |
| Q4: alamat publik dan proxy hosting belum diketahui | Pembatasan login (NFR1) bisa salah membaca sumber request | Dana Harliansyah | Setup hosting sebelum Release gate |
| Q5: credential database sudah tersimpan di riwayat chat | Akses database oleh pihak yang membaca riwayat itu | Dana Harliansyah | Rotasi password database |
| Q6: email dan username terdaftar bisa ditebak lewat pesan register (EC1) | Penyerang bisa mengetahui siapa yang punya akun | Dana Harliansyah | Owner menerima risikonya di PRD gate, atau meminta mitigasi |

## 13. Discovery sources
- `01-idea.md`: problem (section 2), outcome (section 3), non-goals (section 4), assumptions (section 9).
- `02-research.md`: Q5 (aturan username bawaan, dipakai di R2), Q6 (satu kolom login, R7), Q8 (status dan role tidak bisa diisi pengguna, R5 dan AC4), Q9 (password, rate limit, enumeration: R4, NFR1, EC1), Q13 (isi block `login-04`, yang menjadi dasar non-goal OAuth dan forgot password), Q16 (perubahan bersamaan, NFR4).
- `03-prototype.md`: hanya Q3 di section 12. Tidak ada requirement yang bergantung pada prototype saja.
- Keputusan owner via chat, 2026-11-07: aksi superadmin (aktifkan, tolak, nonaktifkan), pengangkatan dan pencabutan superadmin di UI kecuali diri sendiri, kolom form register, dan username yang tidak bisa diganti.

## 14. Change log

| Date | Change | Reason (finding, feedback) | Re-approved by |
|---|---|---|---|

## 15. Gate review

| Round | Date | Reviewer | Verdict | Findings, or notes and their owner |
|---|---|---|---|---|
| 1 | 2026-11-07 | Dana Harliansyah (Product Owner) | approve | Pesan owner: "04-prd auth: diterima, lanjut ke architecture review". Pertanyaan Decide 1 sampai 5 tidak dijawab dalam pesan ini, jadi asumsi di section 6, 8, dan 10 berlaku seperti tertulis, dan Q1 (target M1, M2) serta Q2 (retensi, hapus akun) tetap terbuka di section 12 dengan owner Dana Harliansyah |
