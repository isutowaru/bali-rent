# Panduan Deploy Bali Rent ke Railway

Dokumen ini berisi langkah lengkap untuk mendeploy website Bali Rent (Node.js + Express + MySQL) ke [Railway](https://railway.app) secara gratis.

---

## 0. Persiapan

Pastikan kamu sudah punya:
- Akun **GitHub** (gratis) — [github.com](https://github.com)
- Akun **Railway** (gratis, daftar pakai akun GitHub) — [railway.app](https://railway.app)
- Git terinstall di komputer ([git-scm.com](https://git-scm.com))

Struktur project (jangan diubah):
```
bali-rent/
├── backend/        ← server Express (yang akan dideploy)
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   ├── routes/
│   ├── middleware/
│   └── uploads/    ← folder foto upload (perlu volume persisten)
└── frontend/       ← disajikan otomatis oleh backend (express.static)
```

---

## 1. Push Project ke GitHub

Buka terminal di folder `bali-rent`, jalankan:

```bash
cd bali-rent
git init
git add .
git commit -m "Initial commit - Bali Rent"
```

Lalu buat repository baru (kosong, tanpa README) di [github.com/new](https://github.com/new), misalnya nama `bali-rent`. Setelah itu:

```bash
git remote add origin https://github.com/USERNAME/bali-rent.git
git branch -M main
git push -u origin main
```

> Ganti `USERNAME` dengan username GitHub kamu.

---

## 2. Buat Project Baru di Railway

1. Login ke [railway.app](https://railway.app) menggunakan akun GitHub.
2. Klik **New Project**.
3. Pilih **Deploy from GitHub repo**.
4. Pilih repo `bali-rent` yang baru kamu push.
5. Railway akan membuat service baru, tapi **belum bisa langsung jalan** karena `server.js` ada di dalam folder `backend/`. Lanjut ke langkah berikutnya untuk mengatur ini.

---

## 3. Atur Root Directory & Start Command

1. Klik service yang baru dibuat (biasanya bernama sama dengan repo).
2. Masuk tab **Settings**.
3. Di bagian **Source**, set **Root Directory** menjadi:
   ```
   backend
   ```
4. Di bagian **Deploy**, pastikan **Start Command** adalah:
   ```
   npm start
   ```
   (ini sudah didefinisikan di `package.json`, biasanya otomatis terdeteksi)

---

## 4. Tambah Database MySQL

1. Di halaman project (kanvas dengan kotak-kotak service), klik **+ New**.
2. Pilih **Database** → **Add MySQL**.
3. Railway otomatis menyediakan kredensial database dalam bentuk variabel:
   - `MYSQLHOST`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`
   - `MYSQLPORT`

---

## 5. Hubungkan Environment Variables

1. Klik service **backend** (bukan service MySQL).
2. Masuk tab **Variables**.
3. Tambahkan variabel berikut satu per satu. Untuk nilai yang merujuk ke service MySQL, gunakan format `${{MySQL.VARIABLE_NAME}}` (Railway akan memberi dropdown referensi otomatis saat kamu mengetik `${{`):

   | Key            | Value                          |
   |----------------|--------------------------------|
   | `DB_HOST`      | `${{MySQL.MYSQLHOST}}`         |
   | `DB_USER`      | `${{MySQL.MYSQLUSER}}`         |
   | `DB_PASSWORD`  | `${{MySQL.MYSQLPASSWORD}}`     |
   | `DB_NAME`      | `${{MySQL.MYSQLDATABASE}}`     |
   | `WA_NUMBER`    | `6285228806200` (ganti sesuai nomor WA bisnis) |

4. Railway otomatis menyediakan variabel `PORT` — tidak perlu ditambahkan manual karena `server.js` sudah membaca `process.env.PORT`.

---

## 6. Tambah Volume untuk Folder Uploads

Tanpa langkah ini, **semua foto kendaraan & artikel yang diupload lewat admin panel akan hilang** setiap kali Railway redeploy service (karena filesystem container bersifat sementara).

1. Klik service **backend** → tab **Settings**.
2. Scroll ke bagian **Volumes** → klik **+ New Volume**.
3. Isi **Mount Path** dengan:
   ```
   /app/uploads
   ```
4. Klik **Add**.

> Catatan: Railway mount volume relatif terhadap working directory container (root directory yang sudah diset ke `backend`), jadi `/app/uploads` akan terhubung ke folder `backend/uploads` di project kamu.

---

## 7. Deploy & Generate Domain

1. Railway otomatis men-deploy ulang setiap ada perubahan variable/volume, atau klik **Deploy** manual jika belum jalan.
2. Tunggu proses build selesai (lihat tab **Deployments** → klik build terbaru untuk lihat log).
3. Setelah status **Success**, masuk tab **Settings** → bagian **Networking** → klik **Generate Domain**.
4. Kamu akan mendapat URL publik seperti:
   ```
   https://bali-rent-production.up.railway.app
   ```

---

## 8. Verifikasi

Buka URL yang dihasilkan dan cek:
- `/` → halaman utama (index.html) tampil
- `/kendaraan.html`, `/blog.html`, `/pesan.html`, `/tentang.html`, `/kontak.html` → semua halaman bisa diakses
- `/admin/login.html` → bisa login dengan:
  - **Username:** `admin`
  - **Password:** `admin123`

  > ⚠️ **Penting:** segera ganti password admin default ini lewat tab "User Admin" di dashboard setelah deploy berhasil, supaya panel admin tidak mudah diakses orang lain.

- Coba tambah 1 kendaraan baru dengan foto di admin panel, lalu cek apakah foto tampil di halaman `/kendaraan.html`.

---

## Troubleshooting Umum

| Masalah | Kemungkinan Sebab | Solusi |
|---|---|---|
| Build gagal / "Cannot find module" | Root Directory belum diset ke `backend` | Cek langkah 3 |
| Error koneksi database | Variabel `DB_HOST` dll belum benar / belum ter-link ke service MySQL | Cek langkah 5, pastikan format `${{MySQL.xxx}}` benar |
| Foto hilang setelah beberapa saat / redeploy | Volume belum ditambahkan | Cek langkah 6 |
| Halaman blank / 404 di semua route | Static file frontend tidak ketemu | Pastikan struktur folder `backend/` dan `frontend/` tetap sejajar (tidak dipindah-pindah) |
| Domain tidak muncul | Belum klik "Generate Domain" | Cek langkah 7 |

---

## Update Website Setelah Deploy

Setiap kali ada perubahan kode (misalnya edit HTML/CSS), cukup push ulang ke GitHub:

```bash
git add .
git commit -m "Update tampilan halaman X"
git push
```

Railway otomatis mendeteksi push baru dan men-redeploy service secara otomatis (auto-deploy aktif secara default).
