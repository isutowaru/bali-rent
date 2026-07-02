const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Validasi env wajib sebelum apapun dijalankan
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET wajib diset di environment variables!');
  process.exit(1);
}

const { initDB } = require('./db');
const kendaraanRoutes = require('./routes/kendaraan');
const pemesananRoutes = require('./routes/pemesanan');
const adminRoutes = require('./routes/admin');
const artikelRoutes = require('./routes/artikel');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS — batasi hanya origin yang diizinkan
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting untuk endpoint login (max 10 percobaan per 15 menit)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Terlalu banyak percobaan login. Coba lagi setelah 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/admin/login', loginLimiter);

// Sajikan file statis (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// Sajikan folder uploads (foto kendaraan)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/kendaraan', kendaraanRoutes);
app.use('/api/pemesanan', pemesananRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/artikel', artikelRoutes);

// Nomor WA untuk frontend (endpoint publik)
app.get('/api/config', (req, res) => {
  res.json({ wa_number: process.env.WA_NUMBER || '6281234567890' });
});

// Fallback ke index.html untuk semua route selain API
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  }
});

// Global error handler (termasuk error dari Multer)
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'Ukuran file terlalu besar (maksimal 3MB)' });
  }
  if (err.message && err.message.includes('gambar')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  console.error('Server error:', err);
  res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
});

// Inisialisasi DB lalu jalankan server
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 Bali Rent Server berjalan di http://localhost:${PORT}`);
      console.log(`📋 Admin panel: http://localhost:${PORT}/admin/login.html\n`);
    });
  })
  .catch((err) => {
    console.error('❌ Gagal menginisialisasi database:', err.message);
    process.exit(1);
  });