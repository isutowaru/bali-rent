const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bali_rent',
  waitForConnections: true,
  connectionLimit: 10,
});

// Inisialisasi tabel database
async function initDB() {
  const conn = await pool.getConnection();
  try {
    // Tabel kendaraan
    await conn.query(`
      CREATE TABLE IF NOT EXISTS kendaraan (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nama VARCHAR(100) NOT NULL,
        jenis ENUM('motor', 'mobil') NOT NULL,
        harga_per_hari INT NOT NULL,
        stok INT NOT NULL DEFAULT 1,
        foto VARCHAR(255) DEFAULT NULL,
        deskripsi TEXT,
        tersedia BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabel pemesanan
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pemesanan (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nama_pemesan VARCHAR(100) NOT NULL,
        no_hp VARCHAR(20) NOT NULL,
        no_ktp VARCHAR(50) NOT NULL,
        kendaraan_id INT NOT NULL,
        tanggal_mulai DATE NOT NULL,
        tanggal_selesai DATE NOT NULL,
        lama_sewa INT NOT NULL,
        total_harga INT NOT NULL,
        alamat_antar VARCHAR(255) DEFAULT '-',
        catatan TEXT DEFAULT NULL,
        status ENUM('pending', 'dikonfirmasi', 'selesai', 'dibatalkan') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (kendaraan_id) REFERENCES kendaraan(id)
      )
    `);

    // Tabel artikel (blog)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS artikel (
        id INT PRIMARY KEY AUTO_INCREMENT,
        judul VARCHAR(200) NOT NULL,
        slug VARCHAR(220) NOT NULL UNIQUE,
        ringkasan VARCHAR(300) DEFAULT NULL,
        konten LONGTEXT NOT NULL,
        gambar VARCHAR(255) DEFAULT NULL,
        status ENUM('draft', 'published') DEFAULT 'published',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Tabel admin — tambah kolom role & akses jika belum ada
    await conn.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('superadmin','staff') NOT NULL DEFAULT 'superadmin',
        akses JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrasi: tambah kolom role & akses jika tabel admin sudah ada tapi belum punya kolom ini
    try {
      await conn.query(`ALTER TABLE admin ADD COLUMN role ENUM('superadmin','staff') NOT NULL DEFAULT 'superadmin'`);
    } catch(e) { /* kolom sudah ada */ }
    try {
      await conn.query(`ALTER TABLE admin ADD COLUMN akses JSON DEFAULT NULL`);
    } catch(e) { /* kolom sudah ada */ }

    // Insert data kendaraan contoh jika tabel kosong
    const [rows] = await conn.query('SELECT COUNT(*) as count FROM kendaraan');
    if (rows[0].count === 0) {
      await conn.query(`
        INSERT INTO kendaraan (nama, jenis, harga_per_hari, stok, deskripsi) VALUES
        ('Honda Beat 2023', 'motor', 75000, 3, 'Motor matic irit bahan bakar, cocok untuk keliling Denpasar. Sudah termasuk helm dan jas hujan.'),
        ('Honda Scoopy 2023', 'motor', 85000, 2, 'Motor matic stylish dengan bagasi lega. Nyaman untuk wisata seputar Bali.'),
        ('Yamaha NMAX 2022', 'motor', 100000, 2, 'Motor maxi scooter bertenaga, ideal untuk perjalanan jauh ke Ubud atau Uluwatu.'),
        ('Honda Vario 160', 'motor', 90000, 2, 'Motor sporty dengan mesin bertenaga, cocok untuk menjelajahi Bali.'),
        ('Toyota Avanza 2022', 'mobil', 350000, 1, 'Mobil keluarga 7 seater, irit BBM, AC dingin. Cocok untuk keluarga atau grup wisata.'),
        ('Daihatsu Xenia 2023', 'mobil', 350000, 1, 'Mobil MPV nyaman dengan kabin luas. Sempurna untuk tour keliling Bali bersama keluarga.'),
        ('Toyota Rush 2022', 'mobil', 450000, 1, 'SUV tangguh dengan ground clearance tinggi, ideal untuk wisata ke daerah pegunungan Bali.')
      `);
    }

    // Insert admin default jika belum ada
    const bcrypt = require('bcryptjs');
    const [admins] = await conn.query('SELECT COUNT(*) as count FROM admin');
    if (admins[0].count === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await conn.query(
        'INSERT INTO admin (username, password) VALUES (?, ?)',
        ['admin', hashedPassword]
      );
      console.log('✅ Admin default dibuat: username=admin, password=admin123');
    }

    console.log('✅ Database berhasil diinisialisasi');
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDB };
