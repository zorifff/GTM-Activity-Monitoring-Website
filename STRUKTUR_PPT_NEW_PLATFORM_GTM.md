# STRUKTUR LENGKAP PPT PRESENTASI PROYEK NEW PLATFORM GTM
**Sistem Monitoring Aktivitas Go-To-Market (GTM) & Okupansi ODP Berbasis Web**  
*Studi Kasus: PT Telekomunikasi Seluler (Telkomsel) Regional Jawa Tengah & DIY*

---

## DAFTAR ISI DAN RANGKUMAN ALUR PRESENTASI

Presentasi ini dirancang ke dalam **2 Sesi Utama** dengan total **28 Slide**, mengadopsi format dan kedalaman presentasi proyek website (referensi template *Des-Coach*):

- **BAGIAN PEMBUKA: Pengantar & Konteks Proyek** (Slide 1 – 6)
- **SESI 1: Penjelasan Front-End (UI/UX & Frontend Engineering)** (Slide 7 – 17)
- **SESI 2: Penjelasan Back-End (Architecture, Database, Security & Async Worker)** (Slide 18 – 26)
- **BAGIAN PENUTUP: Demo Aplikasi & Dokumentasi** (Slide 27 – 28)

---

## BAGIAN PEMBUKA: PENGANTAR & KONTEKS PROYEK

### Slide 1: Cover / Judul Presentasi
- **Judul Proyek:** New Platform GTM: Sistem Monitoring Aktivitas Go-To-Market & Okupansi ODP Berbasis Web
- **Instansi / Mitra:** PT Telekomunikasi Seluler (Telkomsel) Regional Jawa Tengah & DIY
- **Sub-judul:** Presentasi Arsitektur Sistem, Frontend Engineering & Backend Distributed Services
- **Elemen Visual:**
  - Logo Instansi: `Asset/Telkomsel-Logo.png`
  - Nama Anggota Tim / Pemrasaran & Peran Masing-Masing

---

### Slide 2: Table of Contents (Agenda 2 Sesi)
- **Agenda Utama:**
  - `01` Profil Perusahaan & Konteks Bisnis
  - `02` Latar Belakang, Tujuan & Tantangan Sistem
  - `03` Overview Role & Fitur Aplikasi
  - **Sesi 1: Front-End**
    - `04` Alur Desain UI/UX, Wireframe & Design System
    - `05` Peran, Tech Stack & Arsitektur Frontend Developer
    - `06` Implementasi Halaman Klien & Virtualisasi Antarmuka
  - **Sesi 2: Back-End**
    - `07` Peran, Tech Stack & Layer Architecture Backend
    - `08` Perancangan Database (ERD), PostGIS & Materialized View
    - `09` Keamanan Autentikasi, BullMQ Background Worker & Keandalan Server
  - `10` Demo Aplikasi Terintegrasi & Dokumentasi

---

### Slide 3: Profil Perusahaan (Tentang Telkomsel Regional Jateng & DIY)
- **Profil Perusahaan:**
  - PT Telekomunikasi Seluler (Telkomsel) merupakan operator telekomunikasi digital terdepan di Indonesia yang mengoperasikan infrastruktur *mobile broadband* dan *fixed broadband* (IndiHome / Orbit).
  - Regional Jawa Tengah & DIY mencakup 6 Branch operasional: Semarang, Solo, Yogyakarta, Purwokerto, Pekalongan, dan Magelang.
- **Konteks Operasional GTM:**
  - Mengelola ribuan titik *Optical Distribution Point* (ODP) di tingkat kecamatan (*Work Order Kecamatan* / WOK).
  - Pemasaran terfokus pada optimalisasi port ODP melalui eksekusi terarah 5 aktivitas lapangan guna mendongkrak *Occupancy Rate* (OCC).
- **Lokasi Kantor:** Kantor Telkomsel Regional Jateng & DIY, Semarang.

---

### Slide 4: Latar Belakang, Tujuan, dan Tantangan
- **Format 3 Kolom (Masalah, Solusi/Tujuan, Tantangan):**
  - **Penjelasan (Masalah Eksisting):**
    - Pelaporan 5 aktivitas GTM lapangan dan rekapitulasi data ribuan ODP masih menggunakan spreadsheet manual dan pengiriman foto terpisah melalui grup pesan singkat.
    - Sulit mengukur korelasi antara eksekusi aktivitas lapangan dengan pertumbuhan okupansi ODP (*OCC Rate* & *Gap WoW*) secara terpusat dan *real-time*.
    - Proses verifikasi bukti kegiatan oleh Admin Regional memakan waktu serta rawan duplikasi dan inkonsistensi data.
  - **Tujuan Sistem:**
    - Mendigitalisasi alur pelaporan dan verifikasi berjenjang (*Maker-Checker*) 5 aktivitas GTM ke dalam satu sistem web terpadu.
    - Menyediakan dashboard eksekutif analitik visual untuk okupansi ODP (Greenfield & Brownfield) lintas 6 Branch.
    - Mengotomatisasi proses ETL *import* puluhan ribu baris data Excel ODP, pencarian data *pairing*, dan ekstraksi teks poster promo (Smart OCR).
  - **Tantangan Teknis:**
    - Menangani render ribuan baris proyek/ODP pada browser tanpa penurunan performa (*lag/freezing*).
    - Memproses *import* file spreadsheet berukuran besar dan ekstraksi teks gambar tanpa memblokir *main thread* server API.
    - Menjamin pemisahan hak akses data (*data isolation*) antara Admin Regional dan User Branch.
- **Aset Diagram:** `diagrams/Gambar_4.33_Perbandingan_Alur_Kerja_Sebelum_vs_Sesudah_Sistem.png`

---

### Slide 5: Pengimplementasian Role & Overview Tech Stack
- **Pembagian Role Pengguna:**
  - **Guest / Pengunjung:** Mengakses *Landing Page*, meninjau poster program pemasaran (lengkap dengan hasil teks OCR), dan melihat metrik agregat publik.
  - **USER (Branch / WOK):** Memantau target KPI cabangnya, melaporkan 5 aktivitas GTM lapangan (unggah foto bukti, input tanggal, outlet/BUMDes/kode SF), serta mengakses fitur *Cek Pairing*.
  - **ADMIN (Regional):** Mengelola seluruh 6 cabang, meninjau dan memverifikasi/menolak bukti kegiatan (*Maker-Checker*), mengimpor Excel ODP/Pairing, mengelola poster program, mengekspor laporan rekap, serta mencabut sesi login aktif.
- **Ringkasan Tech Stack:**
  - **Frontend:** React 19, Vite 8, React Router 7, TanStack React Query v5, TanStack Virtual.
  - **Backend:** Node.js, Express 5, Prisma ORM, BullMQ (Redis), Tesseract.js (OCR), Zod.
  - **Database & Storage:** PostgreSQL (Neon PgBouncer) + PostGIS, S3-Compatible Object Storage (Garage) / Cloudinary.
- **Aset Diagram:** `diagrams/Gambar_4.1_Alur_Interaksi_UI_Berdasarkan_Peran.png`

---

### Slide 6: Daftar Fitur Utama Sistem
- **Fitur Unggulan Platform:**
  1. **Autentikasi Multi-Perangkat:** Login aman dengan Cloudflare Turnstile anti-bot, JWT HttpOnly Cookie, dan Refresh Token Rotation.
  2. **Dashboard Analitik 4 Baris:** Hero Occupancy Regional, Port Distribution Chart, ODP Status Donut (`BLACK`, `RED`, `YELLOW`, `GREEN`), dan Peringkat Eksekusi Branch.
  3. **Pelaporan 5 Aktivitas GTM Lapangan:** Form terstruktur untuk *Telkomsel Menyapa, Branding Outlet, BUMDes, Rekrutmen SF, dan Open Table*.
  4. **Tabel Virtualisasi Proyek & ODP:** Filter tipe desain (*All, Greenfield, Brownfield*), pencarian cepat, dan performa tinggi via TanStack Virtual.
  5. **Admin Action Hub & Async ETL:** Impor Excel ODP dan Pairing secara asinkron dengan pemantauan progres *real-time* berbasis Server-Sent Events (SSE).
  6. **Program Marketing & Smart OCR:** Ekstraksi otomatis teks promosi dari poster gambar menggunakan Tesseract.js.
  7. **Ekspor Dokumen Terformat:** Ekspor Rekap Excel multi-sheet terformat (`xlsx-js-style`) dan tangkapan visual ringkasan eksekutif (`html2canvas`).

---

## SESI 1: PENJELASAN FRONT-END (UI/UX & FRONTEND ENGINEERING)

### Slide 7: Alur Kerja Desain UI/UX & Design System
- **Metodologi Desain:**
  - Analisis Kebutuhan Role (`Guest`, `USER`, `ADMIN`) -> Perancangan User Flow -> Wireframe Low-Fidelity -> Penyusunan Design System -> Komponen High-Fidelity.
- **Spesifikasi Design System (`gtm-monitor-frontend/src/index.css`):**
  - **Tipografi:** Font keluarga `Gordita` (`Gordita-Regular`, 400 weight) untuk keterbacaan data metrik dan tabel operasional yang padat.
  - **Warna Identitas Brand:** Maroon Telkomsel `#800000` (Hover `#660000`, background aksen lembut `#FEF2F2` / `#FEE2E2`).
  - **Warna Dasar & Teks:** Putih murni `#FFFFFF`, Slate `#1E293B`, Latar gelap Landing Page `#090A0F`.
  - **Semantik Status ODP:**
    - `BLACK`: Port belum terpakai (0%).
    - `RED`: Okupansi rendah (butuh penetrasi GTM intensif).
    - `YELLOW`: Okupansi moderat.
    - `GREEN`: Okupansi tinggi / optimal.

---

### Slide 8: Wireframe Antarmuka
- **Tampilan Tata Letak Awal (Low-Fidelity):**
  - Wireframe Landing Page & Modal Login (`diagrams/Gambar_4.14_Wireframe_Landing_Page.png` & `diagrams/Gambar_4.15_Wireframe_Login_Modal.png`).
  - Wireframe Dashboard 4 Baris Regional & Branch (`diagrams/Gambar_4.16_Wireframe_Dashboard_4_Baris.png`).
  - Wireframe Halaman Activity & Tabel Virtualisasi (`diagrams/Gambar_4.17_Wireframe_Activity_dan_Tabel_Virtualisasi.png`).
  - Wireframe Admin Panel & Action Hub (`diagrams/Gambar_4.18_Wireframe_Admin_Panel_Action_Hub.png`).

---

### Slide 9: Peran & Tanggung Jawab Frontend Developer
- **Fokus Pekerjaan Frontend Engineer:**
  - Mengimplementasikan antarmuka reaktif berbasis **React 19** dan **Vite 8** sesuai rancangan UI/UX.
  - Mengelola *server-state*, *caching*, dan sinkronisasi data menggunakan **TanStack React Query v5**.
  - Mengoptimasi performa tabel data besar melalui **TanStack React Virtual** (60 FPS rendering).
  - Menyusun sistem proteksi rute deklaratif (*Declarative Route Guards*) dan penanganan *silent token refresh*.
  - Menghubungkan aliran event asinkron dari backend menggunakan **Server-Sent Events (SSE)** untuk monitoring progres import.

---

### Slide 10: Teknologi untuk Frontend (Frontend Tech Stack)
- **Komponen Teknologi:**
  - **React 19 (`^19.2.7`):** Core UI library dengan efisiensi re-render tinggi.
  - **Vite 8 (`^8.1.1`) & Oxlint:** Build tool modern dengan kecepatan kompilasi tinggi dan linter statis.
  - **React Router 7 (`^7.18.4`):** Routing deklaratif berbasis layout dan dukungan *legacy hash redirect*.
  - **TanStack React Query v5 (`^5.104.5`):** Manajemen query cache, refetch otomatis, dan mutasi optimistik.
  - **TanStack React Virtual (`^3.14.22`):** Virtualisasi elemen DOM untuk rendering tabel ribuan data ODP.
  - **SheetJS (`xlsx`, `xlsx-js-style`) & `html2canvas`:** Engine ekspor laporan Excel berformat dan tangkapan layar sisi klien.
  - **Playwright (`^1.64.1`):** End-to-end (E2E) automated testing.

---

### Slide 11: Arsitektur Frontend & Hierarki Komponen
- **Pemisahan Lapisan Frontend:**
  - **Presentation Layer:** Komponen halaman (`LandingPage`, `Dashboard`, `UploadView`, `AdminPanel`, `BranchView`).
  - **Custom Hooks Layer:** Logika data terisolasi (`useMonitoringData`, `useOdpSummary`, `useGtmMonitoring`, `useActivityActions`, `useOdpImport`, dll).
  - **State & Communication Layer:** `AuthContext` (manajemen status sesi pengguna) + `QueryClient` (cache API) + `jobEvents` (SSE listener).
- **Aset Diagram:**
  - `diagrams/Gambar_4.12_Arsitektur_Antarmuka_Klien_dan_Alur_Data_Klien_Server.png`
  - `diagrams/Gambar_4.13_Hierarki_Pohon_Komponen_Front_End.png`

---

### Slide 12: Struktur Direktori `gtm-monitor-frontend`
- **Organisasi Kode Sumber:**
  - `public/`: Aset statis publik (logo Telkomsel, thumbnail, ikon program).
  - `src/api/` & `src/apiConfig.js`: Konfigurasi instans `apiFetch` (kredensial cookie, penanganan otomatis 401 via silent refresh) dan query keys.
  - `src/auth/`: Konteks autentikasi (`AuthContext.jsx`) serta sinkronisasi multi-tab browser.
  - `src/routes/`: Definisi rute (`paths.js`), layout utama (`AppLayout.jsx`), route guards (`guards.jsx`), dan pemetaan halaman (`pages.jsx`).
  - `src/components/`: Modularisasi komponen UI (`layout/`, `dashboard/`, `admin/`, `Auth/`).
  - `src/hooks/`: 17 custom hooks yang memisahkan logika UI dari aturan bisnis.
  - `src/constants/`: Standar konfigurasi visual, interval metrik, dan skema program GTM.

---

### Slide 13: Implementasi Halaman Landing Page & Modal Login
- **Komponen Utama:** `LandingPage.jsx`, `ProgramViewerModal.jsx`, `guards.jsx`
- **Fitur & Interaksi:**
  - Menampilkan informasi umum inisiatif GTM, galeri poster program promosi, dan ringkasan metrik.
  - Modal penampil poster dengan fitur ekstraksi teks OCR (tombol salin langsung ke clipboard untuk tim lapangan).
  - Modal login terintegrasi dengan **Cloudflare Turnstile** anti-bot widget.
  - Evaluasi otomatis status login: pengguna yang sudah login dialihkan otomatis ke `/dashboard` via `GuestOnly` guard.
- **Aset Visual & Diagram:**
  - `Asset/Landing Page.png`
  - `Asset/Login Page.png`
  - `diagrams/Gambar_4.19_Alur_Evaluasi_Route_Guards.png`

---

### Slide 14: Implementasi Dashboard Analitik & Drill-Down Branch
- **Komponen Utama:** `Dashboard.jsx`, `BranchView.jsx`, sub-komponen `src/components/dashboard/`
- **Fitur & Interaksi:**
  - **Baris 1:** Kartu Hero Okupansi Regional & Gap WoW dengan animasi kenaikan angka (`useCountUp`).
  - **Baris 2:** Ringkasan metrik regional (total port, port terpakai, port tersedia).
  - **Baris 3:** Grafik distribusi port dan visualisasi donat status ODP (`BLACK`, `RED`, `YELLOW`, `GREEN`).
  - **Baris 4:** Kartu wawasan eksekusi GTM (*GtmExecutionInsightCard*) menampilkan peringkat skor Branch.
  - **Drill-Down Khusus Admin:** Navigasi interaktif dari kartu Branch menuju `/branch/:branchName` untuk audit per cabang.

---

### Slide 15: Implementasi Pelaporan Aktivitas Lapangan (WOK)
- **Komponen Utama:** `UploadView.jsx`, `ProjectTable.jsx`, `UploadModal.jsx`, `ActivityStatus.jsx`
- **Fitur & Interaksi:**
  - Isolasi data otomatis: akun `USER` hanya dapat melihat daftar proyek di Branch tempat ia terdaftar.
  - **Tabel Virtualisasi:** Render data proyek skala besar tanpa hambatan memori via `@tanstack/react-virtual`.
  - Kontrol navigasi horizontal tabel berbantu slider custom (`TableScrollSlider`).
  - Form pelaporan 5 aktivitas: unggah foto bukti lapangan, input tanggal rencana/aktual, nama outlet/BUMDes, dan kode Sales Force (SF).
  - Indikator status visual terintegrasi: *Belum Dilaporkan*, *Menunggu Verifikasi*, dan *Terverifikasi*.
- **Aset Diagram:** `diagrams/Gambar_4.3_Alur_Pelaporan_Aktivitas_Lapangan_WOK.png`

---

### Slide 16: Implementasi Admin Panel, Verifikasi & Ekspor Laporan
- **Komponen Utama:** `AdminPanel.jsx`, `ReviewModal.jsx`, `AdminActionHubCard.jsx`, `ExportRekapModal.jsx`, `CekPairingPopover.jsx`
- **Fitur & Interaksi:**
  - **Alur Maker-Checker:** Admin meninjau detail foto kegiatan lapangan dan memilih untuk memverifikasi (*Verify*) atau menolak (*Reject*) dengan catatan evaluasi.
  - **Admin Action Hub:** Antarmuka upload data Excel ODP dan Pairing secara asinkron dengan progress bar real-time.
  - **Manajemen Program GTM:** Upload poster program baru dan penataan arsip.
  - **Ekspor Dokumen:**
    - Ekspor Rekap Excel multi-sheet terformat (`xlsx-js-style`) untuk pelaporan manajemen.
    - Ekspor gambar Executive Summary (`html2canvas`) untuk bahan laporan cepat.
- **Aset Diagram:** `diagrams/Gambar_4.5_Alur_Peninjauan_Bukti_dan_Kontrol_Operasional_Admin.png`

---

### Slide 17: Integrasi Frontend dengan Backend (REST API + SSE)
- **Diagram Alur 6 Langkah Komunikasi Klien-Server:**
  1. **Aksi Pengguna di UI:** Pengguna melakukan aksi (misal: submit form aktivitas atau unggah file Excel).
  2. **Persiapan Data di Hook:** Hook frontend menyiapkan `FormData` atau payload JSON tervalidasi.
  3. **Pengiriman via `apiFetch`:** Request HTTP dikirim dengan `credentials: 'include'` (membawa cookie sesi `HttpOnly`).
  4. **Intersepsi & Silent Refresh:** Jika Access Token kedaluwarsa (401), fungsi interceptor memanggil `/api/auth/refresh` secara transparan dan mengulang request awal.
  5. **Pemrosesan Asinkron & Streaming SSE:** Backend merespons status `202 Accepted` dan frontend membuka kanal `EventSource` untuk menerima update persentase job.
  6. **Sinkronisasi Reaktif Cache:** Selesainya job memicu `queryClient.invalidateQueries()`, menghasilkan pembaruan tabel/grafik secara instan.

---

## SESI 2: PENJELASAN BACK-END (ARCHITECTURE, DATABASE, SECURITY & ASYNC WORKER)

### Slide 18: Pembuka Sesi 2 — Peran & Tanggung Jawab Backend Developer
- **Fokus Pekerjaan Backend Engineer:**
  - Merancang arsitektur RESTful API modular berlapis menggunakan **Node.js** dan **Express 5**.
  - Merancang skema basis data relasional & geospasial (**PostgreSQL + PostGIS**) dengan query teroptimasi.
  - Membangun mekanisme keamanan enterprise: **Dual-Token Cookie Auth**, **Token Reuse Detection**, **Cloudflare Turnstile**, dan **Rate Limiting**.
  - Membangun sistem antrean kerja latar belakang (*Background Job Queue*) menggunakan **BullMQ & Redis** untuk ETL Excel dan Smart OCR (Tesseract.js).
  - Menyediakan layanan media aman via **S3 Object Storage** (Garage) dan menjaga uptime produksi menggunakan **PM2 & Auto-Healing Watchdog**.

---

### Slide 19: Teknologi untuk Backend (Backend Tech Stack)
- **Komponen Teknologi:**
  - **Node.js & Express 5 (`^5.2.1`):** Web framework modern untuk penanganan rute HTTP, middleware rantai keamanan, dan koneksi SSE.
  - **Prisma ORM (`^5.22.0`):** Object-Relational Mapping dengan skema terstruktur dan migrasi otomatis.
  - **PostgreSQL (Neon PgBouncer) + PostGIS:** Basis data relasional berkinerja tinggi dengan ekstensi geospasial.
  - **BullMQ (`^5.81.5`) & ioredis (`^5.11.1`):** Sistem antrean pesan berbasis Redis untuk eksekusi tugas berat asinkron.
  - **Zod (`^4.6.7`):** Validasi skema input data yang ketat pada lapisan middleware.
  - **Keamanan:** `jsonwebtoken`, `bcryptjs`, `helmet`, `cookie-parser`, `express-rate-limit`.
  - **Tesseract.js (`^7.0.0`) & SheetJS (`xlsx`):** Engine ekstraksi teks gambar (OCR) dan parser spreadsheet.
  - **AWS SDK S3 (`@aws-sdk/client-s3`) & Multer:** Driver integrasi object storage S3-compatible dan multipart handler.

---

### Slide 20: Layer Architecture Backend & Struktur Folder `gtm-monitor-backend`
- **Pipa Pemrosesan Request ([app.js](file:///d:/Kuliah/Project/New%20Platform%20GTM/gtm-monitor-backend/src/app.js)):**
  1. `requestId` & Proxy Trust (`loopback` untuk Cloudflare Tunnel).
  2. Global Security: `helmetMiddleware`, `corsMiddleware`, `cookieParser`, `express.json()`.
  3. Global & Specific Rate Limiters (`apiLimiter`, `loginLimiter`, `odpImportLimiter`, dll).
  4. Protected Media Route (`/media/*key` dengan autentikasi cookie media).
  5. Route Endpoints (`/api/*` tervalidasi skema Zod).
  6. Dedicated API 404 Handler & Centralized Error Handler (`errorHandler.js`).
- **Struktur Direktori:**
  - `prisma/`: Skema basis data dan file migrasi SQL.
  - `src/config/`: Konfigurasi variabel lingkungan, database connection pool, dan path storage.
  - `src/middlewares/`: Auth guard, validasi Zod, rate limiters, turnstile verifier, upload multer.
  - `src/controllers/`: Penanganan input HTTP dan pembentukan respons JSON/SSE.
  - `src/services/`: Logika inti bisnis (autentikasi, agregasi metrik, kueri geospasial, storage S3).
  - `src/queues/` & `src/workers/`: Definisi antrean BullMQ dan processor worker terpisah.

---

### Slide 21: Perancangan Database (Entity Relationship Diagram / ERD)
- **Model Entitas Utama ([schema.prisma](file:///d:/Kuliah/Project/New%20Platform%20GTM/gtm-monitor-backend/prisma/schema.prisma)):**
  - `Branch`: Master data 6 cabang, berelasi ke Proyek, User, dan ReportedMetric.
  - `ReportedMetric` & `ImportMeta`: Menyimpan metrik agregat resmi dari file Excel (`occRate`, `gapWoW`, port summary) dan metadata waktu import.
  - `Project`: Entitas proyek WOK dengan atribut tipe desain (*Greenfield/Brownfield*), berelasi ke ODP dan Aktivitas.
  - `Odp`: Data titik ODP (`avai`, `used`, `total`, `occStatus`), koordinat spasial PostGIS `location (Point, 4326)`, dan kolom terhitung `lat`/`lon`.
  - `ProjectActivity` & `ProjectActivityPhoto`: Status pelaporan 5 aktivitas GTM (`belum`, `upload`, `verified`), foto bukti, dan atribut lapangan (outlet, BUMDes, kode SF).
  - `User`, `AuthSession`, `RefreshToken`: Pengelolaan pengguna (`USER`/`ADMIN`), riwayat sesi multi-perangkat, dan penyimpanan token aman.

---

### Slide 22: Optimasi Database: Materialized Views & PostGIS
- **Inovasi Performa Database:**
  - **Materialized Views (`BranchPerformance` & `RegionalPerformance`):**
    - Agregasi puluhan ribu port ODP dan kalkulasi OCC tidak dihitung pada saat request runtime.
    - Nilai dikomputasi ke dalam materialized view PostgreSQL dan di-refresh secara otomatis seusai worker menyelesaikan import Excel ODP.
  - **PostGIS & Indeks Spasial `GiST`:**
    - Menyimpan titik geospasial menggunakan tipe `geometry(Point, 4326)`.
    - Dilengkapi indeks `GiST` untuk eksekusi kueri radius terdekat (`/api/odps/nearby`) dan batas area (`/api/odps/within`) berkecepatan milidetik.
  - **Koneksi Ganda (PgBouncer vs Direct):**
    - `DATABASE_URL`: Menggunakan pooled connection PgBouncer untuk kestabilan konkurensi server API.
    - `DIRECT_URL`: Koneksi langsung tanpa proxy untuk eksekusi migrasi skema Prisma DDL.

---

### Slide 23: Business Flow for Backend & Daftar Endpoint API
- **Kelompok Rute API:**
  - **Auth & Sesi (`auth.routes.js`):**
    - `POST /api/auth/login` (proteksi Turnstile & rate limit), `POST /api/auth/refresh`, `POST /api/auth/logout`.
    - `GET /api/admin/sessions` & `POST /api/admin/sessions/revoke` (revokasi perangkat oleh Admin).
  - **Data & Dashboard (`data.routes.js`):**
    - `GET /api/data`, `GET /api/import-meta`, `GET /api/performance`, `GET /api/odps/nearby`.
  - **Aktivitas & Maker-Checker (`activity.routes.js`):**
    - `POST /api/activities` (unggah foto bukti WOK).
    - `POST /api/verify` & `POST /api/reject` (verifikasi atau penolakan oleh Admin).
  - **Admin & Asinkron ETL (`admin.routes.js`):**
    - `POST /api/admin/import-excel` & `GET /api/admin/import-excel/:jobId/events` (SSE import ODP).
    - `POST /api/admin/upload-pairing-excel` & `/events` (SSE import Pairing).
    - `POST /api/admin/upload-program-image` & `DELETE /api/admin/programs`.

---

### Slide 24: Keamanan Berlapis (Security & Authentication Architecture)
- **Lapisan Keamanan Enterprise:**
  - **Proteksi Anti-Bot:** Verifikasi Cloudflare Turnstile token pada endpoint login untuk mencegah brute-force.
  - **Dual-Token Pattern (Access & Refresh):**
    - Access Token berumur singkat (15 menit).
    - Refresh Token berumur 7 hari disimpan di database sebagai hash HMAC-SHA256 dan dikirim via cookie `HttpOnly`, `SameSite=Lax`, dan `Secure`.
  - **Refresh Token Reuse Detection:**
    - Setiap refresh token hanya memiliki masa pakai satu kali.
    - Jika token yang sudah dirotasi dikirim kembali oleh penyerang, sistem mendeteksi *token theft* dan secara otomatis membatalkan seluruh sesi login terkait (`revokedReason: "reuse_detected"`).
  - **Aset Diagram:**
    - `diagrams/Gambar_4.21_Alur_Otentikasi_Login_Cloudflare_Turnstile.png`
    - `diagrams/Gambar_4.9_Alur_Verifikasi_Dua_Tahap_Maker_Checker.png`

---

### Slide 25: Arsitektur Pemrosesan Asinkron (Redis, BullMQ & SSE)
- **Tantangan Beban Komputasi:**
  - Parsing spreadsheet ribuan baris dan komputasi OCR gambar menguras CPU dan berisiko menimbulkan HTTP timeout jika diproses secara sinkron.
- **Solusi Arsitektur Antrean ([worker.js](file:///d:/Kuliah/Project/New%20Platform%20GTM/gtm-monitor-backend/worker.js)):**
  - Server utama (`server.js`) hanya memvalidasi file dan melempar job ke antrean **BullMQ (Redis)**, mengembalikan respons instan `202 Accepted` beserta `jobId`.
  - **3 Worker Processor Khusus:**
    - `odpImport.processor.js`: Batch upsert proyek/ODP, pembaruan koordinat PostGIS, dan refresh materialized view.
    - `importJob.processor.js`: Ekstraksi dan indexing data pairing port.
    - `ocr.processor.js`: Ekstraksi teks multi-bahasa dari poster program dengan engine Tesseract.js.
  - **Streaming SSE:** Frontend memantau perkembangan pekerjaan (misal: 10%, 45%, 100%) melalui Server-Sent Events secara real-time.
  - **Graceful Degradation:** Jika Redis offline, server API tetap aktif normal; hanya fitur background worker yang merespons status 503.

---

### Slide 26: Infrastruktur Deployment, Object Storage & Auto-Healing
- **Manajemen Proses PM2 ([ecosystem.config.js](file:///d:/Kuliah/Project/New%20Platform%20GTM/ecosystem.config.js)):**
  - `gtm-redis`: Layanan Redis via WSL Ubuntu untuk antrean BullMQ.
  - `gtm-storage`: Object Storage S3-compatible (**Garage Storage**) via WSL untuk isolasi file foto bukti kegiatan yang aman.
  - `gtm-backend`: Instance server Express (`server.js`, auto-restart, batasan memori 500MB).
  - `gtm-worker`: Instance background job processor (`worker.js`, batasan memori 1GB).
  - `gtm-watchdog`: Layanan monitoring kesehatan ([watchdog.js](file:///d:/Kuliah/Project/New%20Platform%20GTM/gtm-monitor-backend/watchdog.js)) yang menguji endpoint `/api/health` secara berkala dan melakukan restart otomatis jika terdeteksi anomali.
- **Kualitas & Pengujian:**
  - Test runner backend otomatis ([tests/run.js](file:///d:/Kuliah/Project/New%20Platform%20GTM/gtm-monitor-backend/tests/run.js)).
  - Koleksi pengujian endpoint API melalui Postman (`postman/`).

---

## BAGIAN PENUTUP: DEMO APLIKASI & DOKUMENTASI

### Slide 27: Demo Aplikasi (Skenario End-to-End)
- **Alur Demo Sesi 1 (Front-End Focus):**
  1. Akses Landing Page -> Navigasi poster program GTM -> Buka modal viewer dan uji salin teks hasil OCR.
  2. Buka modal Login -> Selesaikan Cloudflare Turnstile -> Masuk ke Dashboard Analitik.
  3. Eksplorasi Dashboard: Uji filter *Greenfield / Brownfield*, amati animasi angka metrik, dan telusuri grafik sebaran port.
  4. Masuk sebagai akun `USER` Branch -> Buka halaman Aktivitas -> Cari WOK di tabel virtualisasi -> Unggah bukti foto kegiatan lapangan.
- **Alur Demo Sesi 2 (Back-End Focus):**
  1. Masuk sebagai akun `ADMIN` Regional -> Buka Admin Panel -> Tinjau antrean bukti foto lapangan -> Eksekusi verifikasi (*Maker-Checker*).
  2. Masuk ke Action Hub -> Unggah file Excel ODP baru -> Tunjukkan progres bar *real-time* yang digerakkan oleh Server-Sent Events (SSE) dari BullMQ Worker.
  3. Uji popover *Cek Pairing*, lakukan ekspor Rekap Excel terformat, dan perlihatkan pencabutan sesi perangkat aktif di panel admin.

---

### Slide 28: Dokumentasi Pengerjaan & Pengujian
- **Dokumentasi Proyek:**
  - Kolase foto pengerjaan tim, sesi diskusi teknis, dan koordinasi bersama pihak Telkomsel.
  - Rekam jejak *commit history* repositori Git, hasil eksekusi pengujian otomatis Playwright (E2E), serta pengujian API Postman.
- **Slide Penutup:**
  - Ucapan terima kasih, sesi tanya jawab (Q&A), dan kontak tim pengembang.
