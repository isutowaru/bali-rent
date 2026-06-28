# 🏍️ Bali Rent — Website Rental Kendaraan Denpasar

Website rental kendaraan lokal untuk area Denpasar, Bali. Dibangun dengan Node.js + Express + MySQL.

---

## 📁 Struktur Project

```
bali-rent/
├── backend/
│   ├── server.js          ← Entry point server
│   ├── db.js              ← Koneksi & inisialisasi database
│   ├── .env               ← Konfigurasi (DB, port, WA number)
│   ├── routes/
│   │   ├── kendaraan.js   ← API kendaraan
│   │   ├── pemesanan.js   ← API pemesanan
│   │   └── admin.js       ← API auth admin
│   ├── middleware/
│   │   └── auth.js        ← Middleware JWT
│   └── uploads/           ← Folder foto kendaraan
│
└── frontend/
    ├── index.html         ← Halaman utama
    ├── kendaraan.html     ← Daftar kendaraan
    ├── pesan.html         ← Form pemesanan + redirect WA
    ├── css/style.css      ← CSS global
    └── admin/
        ├── login.html     ← Login admin
        └── dashboard.html ← Dashboard admin
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
> Tabel akan dibuat otomatis saat server pertama kali dijalankan.

### 4. Konfigurasi .env
Edit file `backend/.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=        ← isi password MySQL jika ada
DB_NAME=bali_rent
PORT=3000
JWT_SECRET=ganti_dengan_string_acak_panjang
WA_NUMBER=628xxxxxxxxxx  ← nomor WA pemilik rental (tanpa +)
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

> ⚠️ Ganti password setelah pertama kali login!

---

## 🌟 Fitur Website

### Untuk Customer:
- ✅ Halaman utama dengan statistik kendaraan
- ✅ Daftar kendaraan (filter motor/mobil)
- ✅ Form pemesanan lengkap
- ✅ Otomatis redirect ke WhatsApp dengan isi pesan terformat
- ✅ Hitung total harga otomatis

### Untuk Admin:
- ✅ Login dengan JWT (aman)
- ✅ Dashboard statistik (total pemesanan, pending, pendapatan)
- ✅ Lihat & filter daftar pemesanan
- ✅ Update status pemesanan (pending → dikonfirmasi → selesai)
- ✅ Tambah, edit, hapus kendaraan

---

## 📡 API Endpoints

### Publik (tidak perlu login)
| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/api/kendaraan` | Semua kendaraan |
| GET | `/api/kendaraan/:id` | Detail kendaraan |
| POST | `/api/pemesanan` | Buat pemesanan baru |
| GET | `/api/config` | Config publik (nomor WA) |

### Admin (perlu token JWT)
| Method | Endpoint | Fungsi |
|--------|----------|--------|
| POST | `/api/admin/login` | Login admin |
| GET | `/api/pemesanan` | Semua pemesanan |
| PUT | `/api/pemesanan/:id/status` | Update status |
| GET | `/api/pemesanan/stats/summary` | Statistik dashboard |
| POST | `/api/kendaraan` | Tambah kendaraan |
| PUT | `/api/kendaraan/:id` | Edit kendaraan |
| DELETE | `/api/kendaraan/:id` | Hapus kendaraan |

---

## 🛠️ Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** MySQL (mysql2)
- **Auth:** JWT (jsonwebtoken) + bcryptjs
- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Upload:** Multer
- **Font:** Google Fonts (Syne + Inter)

---

## 💬 Alur WhatsApp
1. Customer isi form pemesanan
2. Data disimpan ke database
3. Muncul modal sukses dengan ringkasan pesanan
4. Customer klik "Konfirmasi via WhatsApp"
5. Otomatis buka WhatsApp dengan pesan terformat ke nomor pemilik rental
