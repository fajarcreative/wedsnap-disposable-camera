# WedSnap by Fajar Creative 📷💍

Aplikasi **Digital Disposable Wedding Camera PWA** (Progressive Web App) yang mengubah smartphone setiap tamu undangan menjadi kamera analog sekali pakai dengan batas maksimal 36 foto. Foto yang dijepret tamu akan otomatis terunggah ke cloud storage dan dikurasi dalam galeri bersama untuk kedua mempelai.

---

## 🌟 Fitur Utama

### 1. Kamera Tamu Disposable (`/camera/:slug` & `/cam/:slug`)
- **Tanpa Unduh & Tanpa Login:** Tamu cukup memindai QR code di meja jamuan dengan kamera HP standar untuk langsung masuk.
- **Web Camera API:** Preview video viewfinder langsung dengan orientasi portrait/landscape adaptif.
- **Peralihan Kamera:** Tombol flip kamera untuk beralih antara kamera belakang dan kamera depan (selfie).
- **Efek Tactile & Vintage:** Viewfinder reticle WS-400 film, corner brackets, simulasi flash layar, dan suara shutter mekanik film analog menggunakan Web Audio API (tanpa file audio eksternal).
- **Penegakan Batas 36 Foto:** Divalidasi di sisi frontend (HUD counter & shutter button lock) serta di sisi backend (database trigger `validate_photo_count` pada Supabase PostgreSQL).
- **Manajemen Antrean Unggah:** Status unggah foto (*sedang mengunggah*, *berhasil*, *gagal*). Mekanisme **Coba Lagi (Retry)** memastikan foto tidak hilang jika koneksi internet terputus.
- **Rol Foto Sesi Ini:** Drawer modal untuk melihat daftar foto yang telah dijepret dari perangkat tersebut.
- **Tautan Cepat ke Galeri:** Tombol langsung menuju galeri foto bersama setelah rol selesai.

### 2. Panel Admin / Penyelenggara (`/admin`)
- **Autentikasi Aman:** Registrasi dan login penyelenggara dengan Supabase Auth & Row Level Security (RLS).
- **Buat Acara Baru (`/admin/events/new`):** Input nama pasangan/acara, tanggal, lokasi opsional, kuota foto per tamu (default 36), dan mode privasi galeri (Publik / Terkunci).
- **Dashboard Ringkasan (`/admin/dashboard`):** Menampilkan statistik real-time: total foto masuk, jumlah tamu/kamera aktif, dan daftar acara.
- **Detail Acara & QR Code (`/admin/events/:id`):**
  - **Generator Kartu Meja Cetak (PNG):** Render kartu meja beresolusi tinggi (A6) lengkap dengan QR Code siap cetak di percetakan.
  - **Salin Tautan:** Salin tautan kamera tamu atau tautan galeri foto dengan satu klik.
  - **Kontrol Akses Galeri:** Toggle mode akses Publik vs Terkunci secara instan.

### 3. Galeri Foto Bersama (`/gallery/:slug`)
- **Grid Responsif Polaroid:** Tampilan foto rapi dengan nuansa hangat *Warm Nostalgia* (ivory, champagne gold, charcoal).
- **Filter Tab:** Tab "Semua Foto" dan "Foto Saya" (hanya menampilkan foto yang diambil dari perangkat tamu saat ini).
- **Lightbox Viewer:** Ketuk foto apa pun untuk pratinjau resolusi tinggi, waktu jepretan, dan tombol unduh langsung.
- **Pembaruan Real-Time:** Tersambung ke Supabase Realtime channel postgres_changes agar foto yang baru diunggah tamu langsung tampil di layar.
- **Perlindungan Privasi:** Jika galeri dalam mode Terkunci, tamu melihat pesan ramah bahwa foto sedang dikurasi oleh mempelai.

### 4. Progressive Web App (PWA)
- **Dukungan PWA Penuh:** Manifest web manifest dengan nama `WedSnap by Fajar Creative`, ikon 192px & 512px (maskable), serta Service Worker Workbox via `vite-plugin-pwa`.
- **Dapat Dipasang:** Tombol pasang otomatis di Android (Chrome) dan panduan "Tambahkan ke Layar Utama" (Add to Home Screen) untuk iOS (Safari).

---

## 🛠️ Arsitektur & Teknologi

| Komponen | Teknologi |
|---|---|
| **Frontend Framework** | React 18, TypeScript, Vite 5 |
| **Styling & Theme** | Tailwind CSS v4 (*Warm Nostalgia* Design Tokens) |
| **Kamera** | Web MediaDevices Camera API (`getUserMedia`) + HTML5 Canvas |
| **Efek Audio** | Web Audio API Synthesizer (Zero-asset shutter click & winder) |
| **QR Code** | `qrcode.react` (SVG & Canvas rendering) |
| **Backend & Database** | Supabase (PostgreSQL 15+, Auth, Storage, Realtime) |
| **Keamanan** | Row Level Security (RLS) + PostgreSQL Triggers |
| **PWA** | `vite-plugin-pwa` + Workbox |

---

## 🚀 Panduan Menjalankan Proyek

### 1. Prasyarat
- Node.js versi 18 ke atas (direkomendasikan Node.js 20).
- Proyek Supabase (gratis di [supabase.com](https://supabase.com)).

### 2. Konfigurasi Lingkungan (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi variabel dengan kredensial Supabase Anda:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```
*(Catatan: Tanpa kredensial Supabase, aplikasi tetap dapat dijalankan dalam mode demo otomatis di `/` dan `/camera/demo`)*.

### 3. Setup Database Supabase
Buka dashboard Supabase Anda -> **SQL Editor** -> Jalankan seluruh isi script:
```
supabase/schema.sql
```
Script tersebut akan membuat:
- Tabel `profiles`, `events`, `camera_sessions`, `photos`.
- Storage bucket `wedsnap-photos` dengan batasan MIME type gambar dan limit 10MB.
- RLS Policies aman untuk tamu (anon) dan admin.
- Trigger `validate_photo_count` (menegakkan kuota 36 foto di sisi database server).
- Trigger `increment_photos_taken` dan auto-update timestamp.

### 4. Menjalankan Server Pengembangan
```bash
npm run dev
```
Buka browser pada alamat yang muncul (biasanya `http://localhost:5173`).

### 5. Build Produksi & Verifikasi
```bash
npm run build
npm run preview
```

---

## 📱 Panduan Pemasangan di HP (PWA)

### Android (Google Chrome)
1. Buka tautan WedSnap melalui browser Google Chrome (harus melalui protokol HTTPS atau `localhost`).
2. Ketuk tombol **"Pasang WedSnap di HP (PWA)"** pada halaman utama, atau buka menu titik tiga (⋮) -> pilih **"Tambahkan ke Layar Utama" / "Install App"**.
3. Ikon WedSnap akan muncul di laci aplikasi HP Anda layaknya aplikasi native.

### iPhone / iPad (Safari)
1. Buka tautan WedSnap menggunakan browser **Safari**.
2. Ketuk ikon **Bagikan (Share)** di bagian bawah layar (kotak dengan panah ke atas).
3. Gulir ke bawah dan ketuk opsi **"Tambahkan ke Layar Utama" (Add to Home Screen)**.
4. Ketuk **Tambah (Add)** di sudut kanan atas.
5. Aplikasi WedSnap akan terpasang di Home Screen dengan status bar fullscreen.

---

## 🔒 Catatan Keamanan
- Kunci `service_role` Supabase **TIDAK PERNAH** dimasukkan ke dalam kode frontend. Hanya gunakan `anon_key` publik.
- Aturan kepemilikan acara dan kuota foto ditegakkan melalui RLS dan Database Trigger di level PostgreSQL.
