const db = require('../config/database');
const bcrypt = require('bcrypt');

exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, username, nama_lengkap, role, is_active FROM users ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data user' });
  }
};

exports.createUser = async (req, res) => {
  const { username, password, nama_lengkap, role } = req.body;
  if (!username || !password || !nama_lengkap) {
    return res.status(400).json({ success: false, message: 'Username, password, dan nama lengkap wajib diisi' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.execute(
      'INSERT INTO users (username, password, nama_lengkap, role) VALUES (?, ?, ?, ?)', 
      [username, hashedPassword, nama_lengkap, role || 'petugas']
    );
    res.json({ success: true, message: 'User berhasil ditambahkan' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Gagal menambahkan user. Mungkin username sudah ada.' });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, password, nama_lengkap, role } = req.body;
  
  try {
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.execute(
        'UPDATE users SET username=?, password=?, nama_lengkap=?, role=? WHERE id=?', 
        [username, hashedPassword, nama_lengkap, role, id]
      );
    } else {
      await db.execute(
        'UPDATE users SET username=?, nama_lengkap=?, role=? WHERE id=?', 
        [username, nama_lengkap, role, id]
      );
    }
    res.json({ success: true, message: 'User berhasil diubah' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Gagal mengubah user' });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM users WHERE id=?', [id]);
    res.json({ success: true, message: 'User berhasil dihapus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Gagal menghapus user' });
  }
};
