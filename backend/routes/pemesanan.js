const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const auth = require('../middleware/auth');

// POST buat pemesanan baru (publik - dari customer)
router.post('/', async (req, res) => {
  try {
    const { nama_pemesan, no_hp, no_ktp, kendaraan_id, tanggal_mulai, tanggal_selesai, alamat_antar, catatan } = req.body;

    // Validasi field wajib
    if (!nama_pemesan || !no_hp || !no_ktp || !kendaraan_id || !tanggal_mulai || !tanggal_selesai) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
    }

    // Cek kendaraan ada dan tersedia
    const [kendaraan] = await pool.query(
      'SELECT * FROM kendaraan WHERE id = ? AND tersedia = TRUE',
      [kendaraan_id]
    );
    if (kendaraan.length === 0) {
      return res.status(404).json({ success: false, message: 'Kendaraan tidak ditemukan atau tidak tersedia' });
    }

    // Hitung lama sewa & total harga
    const mulai = new Date(tanggal_mulai);
    const selesai = new Date(tanggal_selesai);
    if (selesai <= mulai) {
      return res.status(400).json({ success: false, message: 'Tanggal selesai harus setelah tanggal mulai' });
    }
    const lama_sewa = Math.ceil((selesai - mulai) / (1000 * 60 * 60 * 24));
    const total_harga = lama_sewa * kendaraan[0].harga_per_hari;

    // Simpan pemesanan
    const [result] = await pool.query(
      `INSERT INTO pemesanan 
        (nama_pemesan, no_hp, no_ktp, kendaraan_id, tanggal_mulai, tanggal_selesai, lama_sewa, total_harga, alamat_antar, catatan) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nama_pemesan, no_hp, no_ktp, kendaraan_id, tanggal_mulai, tanggal_selesai, lama_sewa, total_harga, alamat_antar || '-', catatan || null]
    );

    res.status(201).json({
      success: true,
      message: 'Pemesanan berhasil disimpan',
      data: {
        id: result.insertId,
        lama_sewa,
        total_harga,
        nama_kendaraan: kendaraan[0].nama,
        harga_per_hari: kendaraan[0].harga_per_hari,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal menyimpan pemesanan' });
  }
});

// GET semua pemesanan (admin only)
// Query params: status, bulan (1-12), tahun (YYYY) — semua opsional
router.get('/', auth, async (req, res) => {
  try {
    const { status, bulan, tahun } = req.query;
    let query = `
      SELECT p.*, k.nama as nama_kendaraan, k.jenis, k.foto
      FROM pemesanan p
      JOIN kendaraan k ON p.kendaraan_id = k.id
    `;
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }
    if (bulan) {
      conditions.push('MONTH(p.created_at) = ?');
      params.push(parseInt(bulan));
    }
    if (tahun) {
      conditions.push('YEAR(p.created_at) = ?');
      params.push(parseInt(tahun));
    }
    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY p.created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data pemesanan' });
  }
});

// GET detail pemesanan (admin only)
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, k.nama as nama_kendaraan, k.jenis, k.harga_per_hari, k.foto
       FROM pemesanan p JOIN kendaraan k ON p.kendaraan_id = k.id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Pemesanan tidak ditemukan' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil detail pemesanan' });
  }
});

// PUT update status pemesanan (admin only)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatus = ['pending', 'dikonfirmasi', 'selesai', 'dibatalkan'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid' });
    }
    const [rows] = await pool.query('SELECT * FROM pemesanan WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Pemesanan tidak ditemukan' });

    await pool.query('UPDATE pemesanan SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true, message: `Status pemesanan diubah menjadi ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengupdate status' });
  }
});

// GET statistik dashboard (admin only)
// Query params: bulan (1-12), tahun (YYYY) — opsional, default bulan & tahun sekarang
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const now = new Date();
    const bulan = parseInt(req.query.bulan) || (now.getMonth() + 1);
    const tahun = parseInt(req.query.tahun) || now.getFullYear();

    // Validasi
    if (bulan < 1 || bulan > 12 || tahun < 2000 || tahun > 2100) {
      return res.status(400).json({ success: false, message: 'Parameter bulan/tahun tidak valid' });
    }

    const periodeFilter = 'MONTH(created_at) = ? AND YEAR(created_at) = ?';
    const params = [bulan, tahun];

    const [totalPemesanan] = await pool.query(
      `SELECT COUNT(*) as total FROM pemesanan WHERE ${periodeFilter}`, params);
    const [pending] = await pool.query(
      `SELECT COUNT(*) as total FROM pemesanan WHERE status = 'pending' AND ${periodeFilter}`, params);
    const [dikonfirmasi] = await pool.query(
      `SELECT COUNT(*) as total FROM pemesanan WHERE status = 'dikonfirmasi' AND ${periodeFilter}`, params);
    const [pendapatan] = await pool.query(
      `SELECT COALESCE(SUM(total_harga), 0) as total FROM pemesanan WHERE status != 'dibatalkan' AND ${periodeFilter}`, params);

    res.json({
      success: true,
      data: {
        total_pemesanan: totalPemesanan[0].total,
        pending: pending[0].total,
        dikonfirmasi: dikonfirmasi[0].total,
        total_pendapatan: pendapatan[0].total,
        periode: { bulan, tahun },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil statistik' });
  }
});

module.exports = router;
