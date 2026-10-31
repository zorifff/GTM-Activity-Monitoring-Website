# Panduan Pengujian API dengan Postman — GTM Activity Monitoring

Pengujian *black-box* seluruh REST API backend dengan aplikasi **Postman**. Koleksi berisi **73 request** dalam **14 folder**. Setiap request membawa uji otomatis (`pm.test`), sehingga hasil **lulus/gagal** langsung tampil di Postman dan bisa di-screenshot untuk laporan.

| File | Isi |
|---|---|
| [GTM-Activity-Monitoring.postman_collection.json](GTM-Activity-Monitoring.postman_collection.json) | Koleksi request + uji otomatis |
| [GTM-Lokal.postman_environment.json](GTM-Lokal.postman_environment.json) | Environment: alamat server & akun uji (password diisi sendiri) |
| `fixtures/` | File uji untuk upload (dibuat ulang otomatis setiap server pengujian dinyalakan) |

---

## 1. Kenapa memakai server pengujian terpisah?

Koleksi ini benar-benar **mengubah data**: mengunggah, memverifikasi, menolak, dan menghapus bukti kegiatan, mengimpor Excel ODP, serta mencabut sesi login. Import Excel ODP bahkan menghapus ODP yang tidak ada di file.

Karena itu, pengujian dijalankan ke **server pengujian di port 3200**, bukan ke server development (3001):

| | Server development (`npm run dev`, port 3001) | **Server pengujian** (`npm run postman:server`, port 3200) |
|---|---|---|
| Database | Neon (data asli) | **Salinan** Neon di PostgreSQL lokal (WSL), dibuat ulang setiap dinyalakan |
| Antrean Redis | awalan `gtm` | awalan `gtm-postman` (terpisah) |
| Captcha Turnstile | aktif | **nonaktif** (Postman tidak bisa menyelesaikan widget captcha) |
| Cookie | `Secure` di localhost | tanpa `Secure` (Postman tidak mengirim cookie `Secure` lewat `http://`) |

Data Neon **tidak pernah diubah**. Server pengujian hanya membaca Neon untuk membuat cadangan (`pg_dump`), lalu memulihkannya ke database lokal `gtm_postman`.

---

## 2. Persiapan (sekali saja)

1. **Pasang Postman Desktop**: <https://www.postman.com/downloads/>. Gunakan versi desktop (bukan web), karena versi web tidak bisa mengakses `localhost` dan file lokal tanpa agent.
2. **Pastikan layanan pendukung di WSL sudah pernah disiapkan** (sudah dilakukan saat Fase 2 & 4):
   - Redis terpasang di WSL Ubuntu;
   - `npm run storage:setup` (Garage, object storage);
   - `npm run db:test:setup` (PostgreSQL + PostGIS uji, port 5433/6433).
3. **Siapkan 2 akun** untuk pengujian:
   - **Admin**: `ADMIN_USERNAME` / `ADMIN_PASSWORD` di `gtm-monitor-backend/.env`.
   - **User WOK** (role USER, terikat 1 branch), mis. akun `E2E_USER_USERNAME` / `E2E_USER_PASSWORD` di `.env` yang sama.

---

## 3. Menyalakan server pengujian

Dari folder root repositori:

```bash
npm run postman:server
```

Tunggu sampai muncul (±1 menit):

```
[postman-server] Database salinan siap: 3098 ODP.
[postman-server] File uji dibuat di postman\fixtures (odp-uji.xlsx: 3098 baris, 3 ODP diubah).

✅ Server pengujian Postman siap: http://localhost:3200
```

- **Biarkan terminal ini terbuka** selama pengujian. Log server (`[API]`, `[WORKER]`) tampil di sini.
- **Selesai:** tekan `Ctrl+C`. Server, worker, dan layanan yang dinyalakan skrip ini ikut dimatikan.
- **Mengulang dari data bersih:** matikan lalu nyalakan lagi. Salinan database dibuat ulang dari Neon.
- **Lebih cepat (tanpa membuat salinan ulang):** `node gtm-monitor-backend/scripts/postman-server.js --reuse`.

> Server development (`npm run dev`) **boleh** tetap berjalan bersamaan, karena port, database, dan antreannya berbeda.

---

## 4. Impor koleksi ke Postman

1. **Import:** klik **Import** (kiri atas) → seret kedua file JSON di folder `postman/` → **Import**.
2. **Pilih environment:** di pojok kanan atas, pilih **GTM Lokal (Server Pengujian)**.
3. **Isi akun uji:** buka **Environments → GTM Lokal (Server Pengujian)**, lalu isi kolom **Current value**:

   | Variable | Isi |
   |---|---|
   | `baseUrl` | `http://localhost:3200` (sudah terisi) |
   | `devBaseUrl` | `http://localhost:3001` (hanya untuk folder 13) |
   | `adminUsername`, `adminPassword` | akun admin |
   | `userUsername`, `userPassword` | akun user WOK |

   Klik **Save**. Kolom *Initial value* biarkan kosong agar password tidak ikut tersimpan bila koleksi dibagikan.
4. **Atur folder file upload** (wajib untuk folder 08):
   - **Settings** (ikon gerigi) → **General** → **Working directory** → **Choose** → pilih folder `postman/fixtures` di repositori ini.
   - Request upload (08.2, 08.3) memakai nama file relatif (`odp-uji.xlsx`, `salah-format.txt`) yang dicari di folder ini.
5. **Biarkan cookie jar Postman aktif** (bawaan).
   - Login menyimpan cookie sesi di *cookie jar* Postman untuk `localhost`, lalu request berikutnya otomatis memakainya, persis seperti browser.
   - Request yang menguji "tanpa login" sudah diatur **Disable cookie jar** di tab *Settings* masing-masing.

---

## 5. Menjalankan pengujian

### Cara A — Collection Runner (semua sekaligus, untuk screenshot ringkasan)

1. Klik kanan koleksi **GTM Activity Monitoring — Pengujian API** → **Run collection**.
2. Di panel Runner:
   - urutan request **jangan diubah**, karena request berikutnya memakai data yang disimpan request sebelumnya (mis. ID bukti, jobId, token);
   - folder **11** (menunggu 31 detik) dan **12** (memblokir login 10 menit) bersifat opsional; centang bila ingin diuji;
   - folder **13** butuh `npm run dev` berjalan; hilangkan centangnya bila server development tidak menyala;
   - **Delay**: 0 ms; **Iterations**: 1.
3. Klik tombol **Run**.
4. Hasil: jumlah **Passed / Failed** di atas, lalu daftar setiap request beserta uji-ujinya. Klik sebuah request untuk melihat request & respons lengkapnya.

> Request **08.4** (status job import) otomatis **diulang** oleh Runner sampai job selesai (`completed`). Request **12.1** juga diulang sampai login diblokir (429). Wajar bila request ini muncul berkali-kali di hasil Runner.

### Cara B — Per request (tombol Send, untuk screenshot detail)

Buka request satu per satu **berurutan dari atas**, lalu klik **Send**. Tab yang berguna untuk laporan:

| Tab | Isi |
|---|---|
| **Body** | Respons JSON dari server |
| **Test Results** | Daftar uji ✔/✘ untuk request ini |
| **Headers** | Mis. `Content-Security-Policy`, `X-Request-Id`, `RateLimit-*` |
| **Cookies** | Cookie `gtm_access_token` & `gtm_refresh_token` setelah login |
| **Console** (bawah: View → Show Postman Console) | Catatan tambahan, mis. jumlah ODP, OCC regional |

Catatan mode Send:
- **08.4 (status job):** bila hasilnya masih `waiting`/`active`, klik **Send** lagi beberapa detik kemudian sampai `completed`.
- **08.5 (SSE):** Postman menampilkan aliran event (`progress` … `completed`), lalu stream ditutup server.
- **11.3** menunggu 31 detik sebelum terkirim. Itu disengaja.
- **12.1:** klik **Send** berulang (±10 kali) sampai muncul **429**.

### Cara C — Newman (baris perintah, opsional)

```bash
npx newman@6.2.1 run postman/GTM-Activity-Monitoring.postman_collection.json \
  -e postman/GTM-Lokal.postman_environment.json --working-dir postman/fixtures \
  --env-var "adminUsername=..." --env-var "adminPassword=..." \
  --env-var "userUsername=..." --env-var "userPassword=..."
```

---

## 6. Apa saja yang diuji

Kolom **Jumlah uji** sudah termasuk uji global "Header `X-Request-Id` ada", yang berlaku di setiap request.

> Fitur **Tsel One Pairing** dan **Program Bulanan** tidak termasuk cakupan pengujian ini.

**00 Persiapan & Endpoint Umum**: Server menyala, header keamanan (Helmet/CSP), dan 404 API tetap berupa JSON.

| No | Skenario | Method & Endpoint | Jumlah uji |
|---|---|---|---|
| 00.1 | Health check | `GET /api/health` | 5 |
| 00.2 | Endpoint API tidak dikenal → 404 JSON | `GET /api/endpoint-tidak-ada` | 3 |

**01 Akses Tanpa Login (Autentikasi)**: Cookie dimatikan pada setiap request: endpoint yang dilindungi wajib menolak 401.

| No | Skenario | Method & Endpoint | Jumlah uji |
|---|---|---|---|
| 01.1 | /api/auth/me tanpa login → 401 | `GET /api/auth/me` | 3 |
| 01.2 | Metrik performa tanpa login → 401 | `GET /api/performance` | 3 |
| 01.3 | Query spasial tanpa login → 401 | `GET /api/odps/nearby?lat=-7&lon=110` | 3 |
| 01.4 | Upload kegiatan tanpa login → 401 | `POST /api/activities` | 3 |
| 01.5 | Verifikasi (admin) tanpa login → 401 | `POST /api/verify` | 3 |
| 01.6 | Import Excel ODP tanpa login → 401 | `POST /api/admin/import-excel` | 3 |
| 01.7 | Foto terverifikasi tanpa login → 401 | `GET /media/verified/CONTOH/foto.jpg` | 3 |
| 01.8 | Cek sesi tanpa login → 200 authenticated false | `GET /api/auth/session` | 3 |
| 01.9 | Data dashboard (publik sesuai desain) → 200 | `GET /api/data` | 3 |

**02 Login & Validasi Input**: Validasi skema (Zod), pesan login seragam, login admin berhasil (cookie HttpOnly).

| No | Skenario | Method & Endpoint | Jumlah uji |
|---|---|---|---|
| 02.1 | Login body kosong → 400 VALIDATION_ERROR | `POST /api/auth/login` | 5 |
| 02.2 | Login JSON rusak → 400 | `POST /api/auth/login` | 3 |
| 02.3 | Login password salah → 401 pesan seragam | `POST /api/auth/login` | 3 |
| 02.4 | Login username tidak terdaftar → 401 pesan sama | `POST /api/auth/login` | 3 |
| 02.5 | Login admin (username huruf besar) → 200 | `POST /api/auth/login` | 6 |

**03 Sesi & Refresh Token (Dual-Token)**: Sesi aktif, rotasi refresh token, balapan antar-tab (token lama dalam 30 detik → 409).

| No | Skenario | Method & Endpoint | Jumlah uji |
|---|---|---|---|
| 03.1 | Profil sesi aktif (/api/auth/me) | `GET /api/auth/me` | 3 |
| 03.2 | Cek sesi → authenticated true, batas 7 hari | `GET /api/auth/session` | 4 |
| 03.3 | Refresh token → token baru (rotasi) | `POST /api/auth/refresh` | 3 |
| 03.4 | Refresh dengan token LAMA (≤30 dtk) → 409 balapan antar-tab | `POST /api/auth/refresh` | 3 |
| 03.5 | Sesi tetap aktif setelah balapan | `GET /api/auth/me` | 2 |

**04 Data Dashboard & Metrik Performa**: Data utama, ringkasan regional, metrik materialized view = hitungan data.

| No | Skenario | Method & Endpoint | Jumlah uji |
|---|---|---|---|
| 04.1 | Data dashboard lengkap | `GET /api/data` | 5 |
| 04.2 | Ringkasan regional (import-meta) | `GET /api/import-meta` | 3 |
| 04.3 | Metrik performa (materialized view) | `GET /api/performance` | 6 |

**05 Query Spasial (PostGIS)**: ODP dalam radius & bounding box; validasi parameter koordinat.

| No | Skenario | Method & Endpoint | Jumlah uji |
|---|---|---|---|
| 05.1 | ODP dalam radius 1 km | `GET /api/odps/nearby?lat={{sampleLat}}&lon={{sampleLon}}&radius=1000` | 4 |
| 05.2 | ODP dalam bounding box | `GET /api/odps/within?minLat={{bboxMinLat}}&minLon={{bboxMinLon}}&maxLat={{bboxMaxLat}}&maxLon={{bboxMaxLon}}` | 4 |
| 05.3 | Batas jumlah hasil (limit=5) | `GET /api/odps/within?minLat=-9&minLon=108&maxLat=-6&maxLon=112&limit=5` | 3 |
| 05.4 | Radius tanpa lat → 400 | `GET /api/odps/nearby?lon=110.4` | 4 |
| 05.5 | Radius > 50 km → 400 | `GET /api/odps/nearby?lat=-7&lon=110&radius=60000` | 4 |
| 05.6 | Bounding box minLat > maxLat → 400 | `GET /api/odps/within?minLat=-7&minLon=110&maxLat=-8&maxLon=111` | 4 |

**06 Akun User WOK: Otorisasi & Kegiatan GTM**: Login sebagai user branch: endpoint admin ditolak 403, validasi aturan kegiatan, batas branch, upload bukti kegiatan.

| No | Skenario | Method & Endpoint | Jumlah uji |
|---|---|---|---|
| 06.1 | Login user WOK | `POST /api/auth/login` | 7 |
| 06.2 | User membuka daftar sesi (admin) → 403 | `GET /api/admin/sessions` | 2 |
| 06.3 | User memverifikasi kegiatan (admin) → 403 | `POST /api/verify` | 2 |
| 06.4 | User import Excel ODP (admin) → 403 | `POST /api/admin/import-excel` | 2 |
| 06.5 | Jenis kegiatan tidak dikenal → 400 | `POST /api/activities` | 4 |
| 06.6 | Tanggal kegiatan salah format → 400 | `POST /api/activities` | 4 |
| 06.7 | Rekrutmen SF tanpa Kode SF & foto → 400 (aturan bisnis) | `POST /api/activities` | 3 |
| 06.8 | Branding outlet tanpa foto → 400 (aturan bisnis) | `POST /api/activities` | 3 |
| 06.9 | Upload ke proyek branch LAIN → 403 | `POST /api/activities` | 3 |
| 06.10 | Upload bukti Rekrutmen SF (Kode SF) → 200 | `POST /api/activities` | 3 |
| 06.11 | Upload lagi saat masih menunggu verifikasi → 400 | `POST /api/activities` | 3 |

**07 Admin: Verifikasi, Tolak & Hapus Bukti**: Siklus status kegiatan: upload → verified → (hapus) belum; upload → tolak → belum.

| No | Skenario | Method & Endpoint | Jumlah uji |
|---|---|---|---|
| 07.1 | Login admin | `POST /api/auth/login` | 6 |
| 07.2 | Status kegiatan sebelum verifikasi = upload | `GET /api/data` | 3 |
| 07.3 | Verifikasi bukti → verified | `POST /api/verify` | 3 |
| 07.4 | Status kegiatan setelah verifikasi = verified | `GET /api/data` | 3 |
| 07.5 | Hapus bukti → kegiatan kembali belum | `POST /api/activities/delete-photo` | 3 |
| 07.6 | Status kegiatan setelah dihapus = belum | `GET /api/data` | 3 |
| 07.7 | Upload bukti baru (oleh admin) | `POST /api/activities` | 2 |
| 07.8 | Tolak bukti → kegiatan kembali belum | `POST /api/reject` | 3 |
| 07.9 | Verifikasi proyek yang tidak ada → 404 | `POST /api/verify` | 2 |

**08 Import Excel ODP (Antrean Kerja)**: Import Excel ODP diproses worker latar belakang: 202 + jobId → status/SSE → hasil. File dari folder postman/fixtures (working directory Postman).

| No | Skenario | Method & Endpoint | Jumlah uji |
|---|---|---|---|
| 08.1 | Import ODP tanpa file → 400 | `POST /api/admin/import-excel` | 3 |
| 08.2 | Import ODP file bukan Excel → 400 | `POST /api/admin/import-excel` | 3 |
| 08.3 | Import ODP (odp-uji.xlsx) → 202 masuk antrean | `POST /api/admin/import-excel` | 3 |
| 08.4 | Status job import ODP (diulang otomatis sampai selesai) | `GET /api/admin/import-excel/{{odpJobId}}` | 5 |
| 08.5 | Progres import via SSE (event stream) | `GET /api/admin/import-excel/{{odpJobId}}/events` | 4 |
| 08.6 | jobId bukan UUID → 400 | `GET /api/admin/import-excel/bukan-uuid` | 4 |
| 08.7 | jobId tidak dikenal → 404 | `GET /api/admin/import-excel/00000000-0000-4000-8000-000000000000` | 3 |

**09 Akses Foto (Object Storage)**: Foto hanya dari prefix verified/, URL lama dialihkan.

| No | Skenario | Method & Endpoint | Jumlah uji |
|---|---|---|---|
| 09.1 | Foto yang tidak ada → 404 | `GET /media/verified/TIDAK/ADA/foto.jpg` | 3 |
| 09.2 | File sementara (tmp/) tidak boleh dibuka → 404 | `GET /media/tmp/odp-import/contoh.xlsx` | 3 |
| 09.3 | URL lama /database foto/... → 301 ke /media/verified/... | `GET /database%20foto/SEMARANG/DEMAK/foto.jpg` | 3 |

**10 Manajemen Sesi & Logout**: Admin mencabut sesi user (berlaku seketika), logout mencabut sesi di server.

| No | Skenario | Method & Endpoint | Jumlah uji |
|---|---|---|---|
| 10.1 | Daftar sesi aktif (admin) | `GET /api/admin/sessions` | 4 |
| 10.2 | Revoke tanpa userId/sessionId → 400 | `POST /api/admin/sessions/revoke` | 2 |
| 10.3 | Cabut semua sesi user WOK | `POST /api/admin/sessions/revoke` | 3 |
| 10.4 | Token user yang sesinya dicabut → 401 | `GET /api/auth/me` | 3 |
| 10.5 | Logout admin | `POST /api/auth/logout` | 3 |
| 10.6 | Akses setelah logout → 401 | `GET /api/auth/me` | 3 |
| 10.7 | Token lama setelah logout → 401 (dicabut di server) | `GET /api/auth/me` | 3 |

**11 [Opsional] Deteksi Pencurian Refresh Token**: Refresh token lama dipakai ulang > 30 detik setelah dirotasi → seluruh sesi dicabut. Request 11.3 menunggu 31 detik.

| No | Skenario | Method & Endpoint | Jumlah uji |
|---|---|---|---|
| 11.1 | Login admin | `POST /api/auth/login` | 6 |
| 11.2 | Rotasi refresh token | `POST /api/auth/refresh` | 2 |
| 11.3 | Token lama dipakai ulang setelah 31 detik → sesi dicabut | `POST /api/auth/refresh` | 3 |
| 11.4 | Sesi admin ikut dicabut (token terbaru pun ditolak) | `GET /api/auth/me` | 3 |

**12 [Opsional] Rate Limit Login (Anti Brute-Force)**: Login gagal berulang dari IP yang sama → 429 setelah 10 kali dalam 10 menit. Jalankan PALING AKHIR: login dari IP ini terblokir ±10 menit (restart server pengujian untuk membuka).

| No | Skenario | Method & Endpoint | Jumlah uji |
|---|---|---|---|
| 12.1 | Login gagal berulang sampai diblokir | `POST /api/auth/login` | 3 |

**13 [Opsional] Captcha Turnstile (server dev port 3001)**: Server pengujian (3200) mematikan captcha. Request ini memakai server development (npm run dev) yang mewajibkan captcha: login lewat API tanpa token ditolak SEBELUM password diperiksa.

| No | Skenario | Method & Endpoint | Jumlah uji |
|---|---|---|---|
| 13.1 | Login tanpa token captcha → 400 CAPTCHA_REQUIRED | `POST (3001) /api/auth/login` | 3 |

### Ringkasan cakupan per aspek

| Aspek | Folder | Yang dibuktikan |
|---|---|---|
| Autentikasi | 01, 02, 03, 10 | Endpoint terlindungi menolak tanpa login (401); login memasang cookie **HttpOnly + SameSite=Strict**; token tidak ada di body; refresh token dirotasi; logout & pencabutan sesi berlaku seketika |
| Otorisasi (RBAC & branch) | 06 | User WOK ditolak di endpoint admin (403) dan di proyek branch lain (403) |
| Validasi input | 02, 05, 06, 08 | Skema Zod: field wajib, jenis & format tanggal kegiatan, koordinat, radius, UUID (400 `VALIDATION_ERROR` + nama field) |
| Aturan bisnis | 06, 07 | Kewajiban data per jenis kegiatan; tidak bisa upload saat masih menunggu verifikasi; siklus status upload → verified → belum |
| Data & metrik | 04 | `/api/data` lengkap; materialized view `/api/performance` = hitungan langsung dari data |
| Geospasial (PostGIS) | 05 | Radius akurat & urut jarak; bounding box; batas jumlah hasil |
| Antrean kerja & SSE | 08 | Import Excel → 202 + jobId → status → hasil; event stream SSE; file salah ditolak |
| Object storage | 09 | Hanya prefix `verified/` yang bisa dibuka; URL lama dialihkan 301 |
| Keamanan | 00, 11, 12, 13 | Header Helmet/CSP; deteksi pencurian refresh token; rate limit login (429); captcha Turnstile wajib di server development |
| Error handling | 00, 02 | 404 API tetap JSON; JSON rusak → 400; semua respons membawa `X-Request-Id` |

---

## 7. Saran screenshot untuk laporan

| No | Screenshot | Menunjukkan |
|---|---|---|
| 1 | Hasil **Collection Runner** (ringkasan Passed/Failed + daftar request) | Keseluruhan pengujian |
| 2 | **02.5** — tab *Body* + *Cookies* + *Test Results* | Login aman: cookie HttpOnly, tanpa token di body |
| 3 | **01.x** salah satu — status 401 `NO_SESSION` | Proteksi endpoint |
| 4 | **06.9** — status 403 | Pembatasan per branch |
| 5 | **02.1** atau **05.4** — status 400 dengan daftar `errors` | Validasi input terpusat |
| 6 | **07.3** & **07.4** | Verifikasi kegiatan oleh admin |
| 7 | **08.3** (202 + jobId) dan **08.4** (hasil import) | Import lewat antrean kerja |
| 8 | **08.5** | Progres real-time via SSE |
| 9 | **05.1** | Query spasial PostGIS (`distanceM`) |
| 10 | **04.3** + Console | Metrik materialized view = hitungan data |
| 11 | **10.4** / **10.7** | Pencabutan sesi & logout di sisi server |
| 12 | **12.1** (429) & **11.3** | Rate limit & deteksi pencurian token |
| 13 | **13.1** (400 `CAPTCHA_REQUIRED`) | Captcha Turnstile di server development |

---

## 8. Masalah yang sering terjadi

| Gejala | Penyebab & solusi |
|---|---|
| `Error: connect ECONNREFUSED 127.0.0.1:3200` | Server pengujian belum berjalan / sudah dimatikan → `npm run postman:server` |
| Setelah login, request berikutnya tetap **401** | Cookie tidak tersimpan: pastikan memakai `baseUrl` **3200** (bukan 3001), cookie jar Postman aktif, dan request login dijalankan dulu |
| **401 `TOKEN_EXPIRED`** di tengah pengujian manual | Access token berumur 15 menit. Jalankan ulang request login folder terkait (02.5 / 06.1 / 07.1) |
| **429 RATE_LIMITED** saat login | Folder 12 sudah dijalankan (blokir 10 menit per IP). Tunggu 10 menit atau restart server pengujian |
| **06.10/06.11** gagal "masih menunggu verifikasi" | Pengujian sebelumnya terhenti di tengah. Jalankan folder 07, atau restart server (salinan baru) |
| Upload gagal "file not found" / 400 tanpa file | *Working directory* Postman belum diarahkan ke `postman/fixtures` (langkah 4.4) |
| **08.4** tidak pernah `completed` | Worker tidak berjalan: lihat log `[WORKER]` di terminal server pengujian |
| **13.1** gagal / ECONNREFUSED 3001 | Server development belum berjalan (`npm run dev`), atau `TURNSTILE_SECRET_KEY` kosong di `.env` backend |
| **03.4** mendapat 401, bukan 409 | Jarak 03.3 → 03.4 lebih dari 30 detik (jendela toleransi). Jalankan keduanya berurutan cepat |
