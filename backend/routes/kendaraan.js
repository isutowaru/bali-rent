const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { pool } = require('../db');
const auth = require('../middleware/auth');

// Setup upload foto
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExt = /jpeg|jpg|png|webp/;
    const allowedMime = /image\/(jpeg|png|webp)/;
    if (allowedExt.test(path.extname(file.originalname).toLowerCase()) && allowedMime.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar (jpeg, png, webp) yang diizinkan'));
    }
  },
  limits: { fileSize: 3 * 1024 * 1024 }, // max 3MB
});

// GET semua kendaraan (publik) - hanya yang tersedia
router.get('/', async (req, res) => {
  try {
    const { jenis } = req.query;
    let query = 'SELECT * FROM kendaraan WHERE tersedia = TRUE';
    const params = [];
    if (jenis && (jenis === 'motor' || jenis === 'mobil')) {
      query += ' AND jenis = ?';
      params.push(jenis);
    }
    query += ' ORDER BY jenis, harga_per_hari ASC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data kendaraan' });
  }
});

// GET semua kendaraan untuk admin (termasuk nonaktif)
router.get('/admin/semua', auth, async (req, res) => {
  try {
    const { jenis, tersedia } = req.query;
    let query = 'SELECT * FROM kendaraan WHERE 1=1';
    const params = [];
    if (jenis && (jenis === 'motor' || jenis === 'mobil')) {
      query += ' AND jenis = ?';
      params.push(jenis);
    }
    if (tersedia === '1' || tersedia === '0') {
      query += ' AND tersedia = ?';
      params.push(tersedia === '1' ? 1 : 0);
    }
    query += ' ORDER BY jenis, harga_per_hari ASC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data kendaraan' });
  }
});

// GET detail kendaraan (publik)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM kendaraan WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Kendaraan tidak ditemukan' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil detail kendaraan' });
  }
});

// POST tambah kendaraan (admin)
router.post('/', auth, upload.single('foto'), async (req, res) => {
  try {
    const { nama, jenis, harga_per_hari, stok, deskripsi } = req.body;
    if (!nama || !jenis || !harga_per_hari) {
      return res.status(400).json({ success: false, message: 'Nama, jenis, dan harga wajib diisi' });
    }
    const foto = req.file ? req.file.filename : null;
    const [result] = await pool.query(
      'INSERT INTO kendaraan (nama, jenis, harga_per_hari, stok, foto, deskripsi) VALUES (?, ?, ?, ?, ?, ?)',
      [nama, jenis, harga_per_hari, stok || 1, foto, deskripsi || '']
    );
    res.status(201).json({ success: true, message: 'Kendaraan berhasil ditambahkan', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan kendaraan' });
  }
});

// PUT update kendaraan (admin)
router.put('/:id', auth, upload.single('foto'), async (req, res) => {
  try {
    const { nama, jenis, harga_per_hari, stok, deskripsi, tersedia } = req.body;
    const [existing] = await pool.query('SELECT * FROM kendaraan WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Kendaraan tidak ditemukan' });

    const foto = req.file ? req.file.filename : existing[0].foto;
    await pool.query(
      'UPDATE kendaraan SET nama=?, jenis=?, harga_per_hari=?, stok=?, foto=?, deskripsi=?, tersedia=? WHERE id=?',
      [
        nama || existing[0].nama,
        jenis || existing[0].jenis,
        harga_per_hari || existing[0].harga_per_hari,
        stok !== undefined ? stok : existing[0].stok,
        foto,
        deskripsi !== undefined ? deskripsi : existing[0].deskripsi,
        tersedia !== undefined ? tersedia : existing[0].tersedia,
        req.params.id,
      ]
    );
    res.json({ success: true, message: 'Kendaraan berhasil diupdate' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengupdate kendaraan' });
  }
});

// DELETE kendaraan (admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM kendaraan WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Kendaraan tidak ditemukan' });
    await pool.query('DELETE FROM kendaraan WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Kendaraan berhasil dihapus' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED' || err.errno === 1451) {
      return res.status(409).json({
        success: false,
        message: 'Kendaraan ini tidak bisa dihapus karena masih memiliki riwayat pemesanan. Tandai sebagai "Tidak Tersedia" jika ingin menyembunyikannya dari website.',
      });
    }
    res.status(500).json({ success: false, message: 'Gagal menghapus kendaraan' });
  }
});

module.exports = router;