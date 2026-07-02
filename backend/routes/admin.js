const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const auth = require('../middleware/auth');
require('dotenv').config();

// Middleware: hanya superadmin yang boleh akses
function superadminOnly(req, res, next) {
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Fitur ini hanya bisa diakses oleh superadmin' });
  }
  next();
}

// POST login admin
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
    }

    const [rows] = await pool.query('SELECT * FROM admin WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    const admin = rows[0];
    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    // Parse akses (JSON string dari DB)
    const akses = admin.akses ? (typeof admin.akses === 'string' ? JSON.parse(admin.akses) : admin.akses) : null;

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role, akses },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      message: 'Login berhasil',
      token,
      admin: { id: admin.id, username: admin.username, role: admin.role, akses },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal login' });
  }
});

// GET verifikasi token
router.get('/verify', auth, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

// POST ganti password admin sendiri
router.post('/ganti-password', auth, async (req, res) => {
  try {
    const { password_lama, password_baru } = req.body;
    if (!password_lama || !password_baru) {
      return res.status(400).json({ success: false, message: 'Password lama dan baru wajib diisi' });
    }
    if (password_baru.length < 6) {
      return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter' });
    }
    const [rows] = await pool.query('SELECT * FROM admin WHERE id = ?', [req.admin.id]);
    const match = await bcrypt.compare(password_lama, rows[0].password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Password lama tidak sesuai' });
    }
    const hashed = await bcrypt.hash(password_baru, 10);
    await pool.query('UPDATE admin SET password = ? WHERE id = ?', [hashed, req.admin.id]);
    res.json({ success: true, message: 'Password berhasil diubah' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengganti password' });
  }
});

// ===== MANAJEMEN USER ADMIN =====

// GET semua user admin (superadmin only)
router.get('/users', auth, superadminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, role, akses, created_at FROM admin ORDER BY id ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data user' });
  }
});

// POST tambah user admin baru (superadmin only)
router.post('/users', auth, superadminOnly, async (req, res) => {
  try {
    const { username, password, role, akses } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
    }
    const validRole = role === 'staff' ? 'staff' : 'superadmin';

    const [exist] = await pool.query('SELECT id FROM admin WHERE username = ?', [username]);
    if (exist.length > 0) {
      return res.status(409).json({ success: false, message: 'Username sudah digunakan' });
    }

    const hashed = await bcrypt.hash(password, 10);
    // Akses hanya berlaku untuk role staff; superadmin otomatis punya semua akses
    const aksesValue = validRole === 'staff' && akses ? JSON.stringify(akses) : null;

    const [result] = await pool.query(
      'INSERT INTO admin (username, password, role, akses) VALUES (?, ?, ?, ?)',
      [username, hashed, validRole, aksesValue]
    );
    res.status(201).json({ success: true, message: 'User berhasil ditambahkan', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan user' });
  }
});

// PUT edit user admin (superadmin only)
router.put('/users/:id', auth, superadminOnly, async (req, res) => {
  try {
    const { username, password, role, akses } = req.body;
    const targetId = parseInt(req.params.id);

    const [existing] = await pool.query('SELECT * FROM admin WHERE id = ?', [targetId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    // Tidak boleh downgrade diri sendiri
    if (targetId === req.admin.id && role === 'staff') {
      return res.status(400).json({ success: false, message: 'Tidak bisa mengubah role akun yang sedang aktif' });
    }

    if (username && username !== existing[0].username) {
      const [conflict] = await pool.query('SELECT id FROM admin WHERE username = ? AND id != ?', [username, targetId]);
      if (conflict.length > 0) {
        return res.status(409).json({ success: false, message: 'Username sudah digunakan' });
      }
    }

    const newUsername = username || existing[0].username;
    const newRole = role === 'staff' ? 'staff' : 'superadmin';
    const aksesValue = newRole === 'staff' && akses ? JSON.stringify(akses) : null;

    let newPassword = existing[0].password;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
      }
      newPassword = await bcrypt.hash(password, 10);
    }

    await pool.query(
      'UPDATE admin SET username = ?, password = ?, role = ?, akses = ? WHERE id = ?',
      [newUsername, newPassword, newRole, aksesValue, targetId]
    );
    res.json({ success: true, message: 'User berhasil diupdate' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengupdate user' });
  }
});

// DELETE user admin (superadmin only)
router.delete('/users/:id', auth, superadminOnly, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    if (targetId === req.admin.id) {
      return res.status(400).json({ success: false, message: 'Tidak bisa menghapus akun yang sedang digunakan' });
    }
    const [rows] = await pool.query('SELECT id FROM admin WHERE id = ?', [targetId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }
    const [count] = await pool.query("SELECT COUNT(*) as total FROM admin WHERE role = 'superadmin'");
    const targetRow = await pool.query('SELECT role FROM admin WHERE id = ?', [targetId]);
    if (targetRow[0][0].role === 'superadmin' && count[0].total <= 1) {
      return res.status(400).json({ success: false, message: 'Tidak bisa menghapus satu-satunya superadmin' });
    }
    await pool.query('DELETE FROM admin WHERE id = ?', [targetId]);
    res.json({ success: true, message: 'User berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus user' });
  }
});

module.exports = router;
