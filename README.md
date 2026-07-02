# 🏍️ Bali Rent — Website Rental Kendaraan Denpasar

Website rental kendaraan lokal untuk area Denpasar, Bali. Dibangun dengan Node.js + Express + MySQL. Dilengkapi katalog kendaraan, form pemesanan dengan validasi berlapis, integrasi konfirmasi via WhatsApp, dashboard admin dengan sistem role, serta blog/artikel.

---

## 📁 Struktur Project

```
bali-rent/
├── backend/
│   ├── server.js            ← Entry point server (Express, CORS, rate limit, routing)
│   ├── db.js                ← Koneksi pool MySQL + auto-create tabel + seed data awal
│   ├── .env                 ← Konfigurasi (DB, port, JWT secret, WA number, dll)
│   ├── routes/
│   │   ├── kendaraan.js     ← API kendaraan + upload foto
│   │   ├── pemesanan.js     ← API pemesanan + validasi + cek bentrok jadwal
│   │   ├── admin.js         ← API auth admin + manajemen user admin
│   │   └── artikel.js       ← API blog/artikel
│   ├── middleware/
│   │   └── auth.js          ← Middleware verifikasi JWT
│   └── uploads/              ← Folder foto kendaraan & gambar artikel
│
└── frontend/
    ├── index.html            ← Halaman utama
    ├── kendaraan.html        ← Daftar kendaraan
    ├── pesan.html            ← Form pemesanan + validasi + redirect WhatsApp
    ├── blog.html             ← Daftar artikel/blog
    ├── artikel.html          ← Detail artikel
    ├── tentang.html          ← Halaman tentang
    ├── kontak.html           ← Halaman kontak
    ├── css/style.css         ← CSS global
    └── admin/
        ├── login.html        ← Login admin
        └── dashboard.html    ← Dashboard admin
```

---

## ⚙️ Cara Setup & Menjalankan

### 1. Install Node.js
Download dari https://nodejs.org (versi LTS)

### 2. Install MySQL
Download XAMPP dari https://www.apachefriends.org atau MySQL langsung.

### 3. Buat Database
Buka phpMyAdmin atau MySQL Workbench, jalankan:
```sql
CREATE DATABASE bali_rent;
```
> Semua tabel (`kendaraan`, `pemesanan`, `artikel`, `admin`) dibuat otomatis saat server pertama kali dijalankan, termasuk akun admin default dan beberapa data kendaraan contoh.

### 4. Konfigurasi .env
Buat file `backend/.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=              # isi password MySQL jika ada
DB_NAME=bali_rent
PORT=3000
JWT_SECRET=ganti_dengan_string_acak_panjang     # WAJIB diisi, server tidak akan jalan tanpa ini
WA_NUMBER=628xxxxxxxxxx   # nomor WA pemilik rental (tanpa +), fallback: 6281234567890
ALLOWED_ORIGINS=http://localhost:3000           # daftar origin yang diizinkan CORS, pisahkan koma jika lebih dari satu
```

### 5. Install Dependencies
```bash
cd backend
npm install
```

### 6. Jalankan Server
```bash
npm start
```
atau pakai nodemon (auto-restart saat file diubah):
```bash
npm run dev
```

### 7. Buka di Browser
- **Website:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin/login.html

---

## 🔑 Login Admin Default
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** `superadmin` (akses penuh ke semua fitur, termasuk manajemen user admin lain)

> ⚠️ Ganti password setelah pertama kali login lewat menu ganti password di dashboard.

---

## 🌟 Fitur Website

### Untuk Customer:
- ✅ Halaman utama, daftar kendaraan (filter motor/mobil), dan blog/artikel
- ✅ Form pemesanan dengan validasi real-time (nama, no HP format Indonesia, NIK 16 digit, tanggal)
- ✅ Deteksi bentrok jadwal — kendaraan yang sudah dipesan pada rentang tanggal tertentu tidak bisa dipesan ulang di tanggal yang sama
- ✅ Hitung total harga otomatis (dihitung ulang & divalidasi di server, bukan sekadar dipercaya dari input pelanggan)
- ✅ Otomatis buka WhatsApp dengan pesan terformat berisi nomor order, detail kendaraan, dan total harga

### Untuk Admin:
- ✅ Login dengan JWT (token berlaku 8 jam), dilindungi rate limiter (maks 10 percobaan/15 menit)
- ✅ Sistem role: `superadmin` (akses penuh) dan `staff` (akses terbatas sesuai izin yang diberikan)
- ✅ Dashboard statistik (total pemesanan, pending, dikonfirmasi, total pendapatan per periode) + grafik pendapatan bulanan
- ✅ Lihat, filter (status/bulan/tahun), dan update status pemesanan (pending → dikonfirmasi → selesai/dibatalkan)
- ✅ Tambah, edit, hapus, dan lihat kendaraan (termasuk yang nonaktif)
- ✅ Kelola artikel/blog (tulis, edit, hapus, upload gambar, slug otomatis dari judul)
- ✅ Manajemen user admin (khusus superadmin): tambah, edit, hapus akun staff

---

## 📡 API Endpoints

### Publik (tidak perlu login)
| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/api/kendaraan` | Semua kendaraan tersedia (bisa filter `?jenis=motor/mobil`) |
| GET | `/api/kendaraan/:id` | Detail kendaraan |
| POST | `/api/pemesanan` | Buat pemesanan baru (dengan validasi & cek bentrok jadwal) |
| GET | `/api/artikel` | Semua artikel yang published |
| GET | `/api/artikel/slug/:slug` | Detail artikel berdasarkan slug |
| GET | `/api/config` | Config publik (nomor WhatsApp) |

### Admin (perlu token JWT di header `Authorization: Bearer <token>`)
| Method | Endpoint | Fungsi |
|--------|----------|--------|
| POST | `/api/admin/login` | Login admin (dibatasi rate limit) |
| GET | `/api/admin/verify` | Verifikasi token aktif |
| POST | `/api/admin/ganti-password` | Ganti password akun sendiri |
| GET | `/api/admin/users` | Daftar user admin *(superadmin only)* |
| POST | `/api/admin/users` | Tambah user admin *(superadmin only)* |
| PUT | `/api/admin/users/:id` | Edit user admin *(superadmin only)* |
| DELETE | `/api/admin/users/:id` | Hapus user admin *(superadmin only)* |
| GET | `/api/kendaraan/admin/semua` | Semua kendaraan termasuk nonaktif |
| POST | `/api/kendaraan` | Tambah kendaraan (upload foto) |
| PUT | `/api/kendaraan/:id` | Edit kendaraan |
| DELETE | `/api/kendaraan/:id` | Hapus kendaraan |
| GET | `/api/pemesanan` | Semua pemesanan (filter `status`, `bulan`, `tahun`) |
| GET | `/api/pemesanan/stats/summary` | Statistik dashboard per periode |
| GET | `/api/pemesanan/stats/pendapatan-bulanan` | Data pendapatan per bulan (untuk grafik) |
| GET | `/api/pemesanan/:id` | Detail pemesanan |
| PUT | `/api/pemesanan/:id/status` | Update status pemesanan |
| GET | `/api/artikel/admin/semua` | Semua artikel termasuk draft |
| GET | `/api/artikel/:id` | Detail artikel berdasarkan id |
| POST | `/api/artikel` | Tambah artikel (upload gambar) |
| PUT | `/api/artikel/:id` | Edit artikel |
| DELETE | `/api/artikel/:id` | Hapus artikel |
| POST | `/api/artikel/upload-gambar` | Upload gambar untuk disisipkan di editor konten |

> Endpoint kendaraan & artikel untuk admin juga dibatasi middleware akses tambahan (`cekAksesKendaraan` / `cekAksesArtikel`) — role `staff` hanya bisa mengakses jika diberi izin spesifik oleh superadmin.

---

## 🛠️ Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** MySQL (mysql2/promise, connection pool)
- **Auth:** JWT (jsonwebtoken, token 8 jam) + bcryptjs, dengan role-based access (superadmin/staff)
- **Keamanan tambahan:** express-rate-limit (anti brute-force login), cors dengan whitelist origin
- **Upload:** Multer (validasi tipe file gambar, maks 3MB)
- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Font:** Google Fonts (Syne + Inter)
- **Deployment:** Railway — lihat [DEPLOY.md](./DEPLOY.md) untuk panduan lengkap

---

## 🔒 Validasi & Keamanan Pemesanan

Validasi dijalankan dua kali — di frontend (untuk feedback instan ke pelanggan) dan diulang di backend (agar tidak bisa dilewati):
- Nama minimal 3 karakter, hanya huruf/spasi/tanda baca nama
- NIK harus tepat 16 digit angka
- No HP harus format Indonesia yang valid (`08xx`, `+628xx`, `628xx`)
- Tanggal mulai tidak boleh di masa lalu, tanggal selesai harus setelah tanggal mulai
- Maksimal masa sewa 90 hari
- Kendaraan harus berstatus tersedia
- Tidak boleh bentrok dengan pemesanan aktif lain untuk kendaraan yang sama (overlap check)
- Total harga dihitung ulang di server (bukan dipercaya dari input client) untuk mencegah manipulasi harga

---

## 💬 Alur WhatsApp
1. Customer isi form pemesanan (data divalidasi di frontend & backend)
2. Server mengecek ketersediaan & bentrok jadwal, lalu menyimpan pemesanan (status awal `pending`)
3. Muncul modal sukses dengan ringkasan pesanan (nomor order, kendaraan, tanggal, total harga)
4. Customer klik "Buka WhatsApp"
5. Otomatis buka WhatsApp dengan pesan terformat lengkap (termasuk nomor order) ke nomor pemilik rental yang diambil dari `/api/config`
