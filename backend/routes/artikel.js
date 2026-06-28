const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { pool } = require('../db');
const auth = require('../middleware/auth');

// Setup upload gambar artikel
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
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diizinkan'));
    }
  },
  limits: { fileSize: 3 * 1024 * 1024 }, // max 3MB
});

// Bikin slug dari judul, mis. "Cara Menghindari Macet" -> "cara-menghindari-macet"
function buatSlug(judul) {
  return judul
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Pastikan slug unik (tambah angka di belakang jika sudah ada)
async function slugUnik(slug, excludeId = null) {
  let finalSlug = slug;
  let i = 1;
  while (true) {
    let query = 'SELECT id FROM artikel WHERE slug = ?';
    const params = [finalSlug];
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    const [rows] = await pool.query(query, params);
    if (rows.length === 0) return finalSlug;
    finalSlug = `${slug}-${++i}`;
  }
}

// POST upload gambar untuk disisipkan ke dalam konten artikel (admin, dipakai oleh editor)
router.post('/upload-gambar', auth, upload.single('gambar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Tidak ada file gambar' });
  res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

// GET semua artikel (publik) — hanya yang published, kecuali admin minta semua
router.get('/', async (req, res) => {
  try {
    const { semua } = req.query;
    let query = 'SELECT * FROM artikel';
    if (!semua) query += " WHERE status = 'published'";
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(query);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data artikel' });
  }
});

// GET semua artikel untuk admin (termasuk draft)
router.get('/admin/semua', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM artikel ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data artikel' });
  }
});

// GET detail artikel berdasarkan slug (publik)
router.get('/slug/:slug', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM artikel WHERE slug = ?', [req.params.slug]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Artikel tidak ditemukan' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil detail artikel' });
  }
});

// GET detail artikel berdasarkan id (admin)
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM artikel WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Artikel tidak ditemukan' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil detail artikel' });
  }
});

// POST tambah artikel (admin)
router.post('/', auth, upload.single('gambar'), async (req, res) => {
  try {
    const { judul, ringkasan, konten, status } = req.body;
    if (!judul || !konten) {
      return res.status(400).json({ success: false, message: 'Judul dan konten wajib diisi' });
    }
    const slugDasar = buatSlug(judul);
    const slug = await slugUnik(slugDasar);
    const gambar = req.file ? req.file.filename : null;
    const [result] = await pool.query(
      'INSERT INTO artikel (judul, slug, ringkasan, konten, gambar, status) VALUES (?, ?, ?, ?, ?, ?)',
      [judul, slug, ringkasan || null, konten, gambar, status || 'published']
    );
    res.status(201).json({ success: true, message: 'Artikel berhasil ditambahkan', id: result.insertId, slug });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan artikel' });
  }
});

// PUT update artikel (admin)
router.put('/:id', auth, upload.single('gambar'), async (req, res) => {
  try {
    const { judul, ringkasan, konten, status } = req.body;
    const [existing] = await pool.query('SELECT * FROM artikel WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Artikel tidak ditemukan' });

    let slug = existing[0].slug;
    if (judul && judul !== existing[0].judul) {
      slug = await slugUnik(buatSlug(judul), req.params.id);
    }

    const gambar = req.file ? req.file.filename : existing[0].gambar;
    await pool.query(
      'UPDATE artikel SET judul=?, slug=?, ringkasan=?, konten=?, gambar=?, status=? WHERE id=?',
      [
        judul || existing[0].judul,
        slug,
        ringkasan !== undefined ? ringkasan : existing[0].ringkasan,
        konten || existing[0].konten,
        gambar,
        status || existing[0].status,
        req.params.id,
      ]
    );
    res.json({ success: true, message: 'Artikel berhasil diupdate', slug });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengupdate artikel' });
  }
});

// DELETE artikel (admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM artikel WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Artikel tidak ditemukan' });
    await pool.query('DELETE FROM artikel WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Artikel berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus artikel' });
  }
});

module.exports = router;
