const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDB } = require('./db');
const kendaraanRoutes = require('./routes/kendaraan');
const pemesananRoutes = require('./routes/pemesanan');
const adminRoutes = require('./routes/admin');
const artikelRoutes = require('./routes/artikel');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Inisialisasi DB lalu jalankan server
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 Bali Rent Server berjalan di http://localhost:${PORT}`);
      console.log(`📋 Admin panel: http://localhost:${PORT}/admin/login.html`);
      console.log(`🔑 Login: username=admin, password=admin123\n`);
    });
  })
  .catch((err) => {
    console.error('❌ Gagal menginisialisasi database:', err.message);
    process.exit(1);
  });
