'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface User {
  id: number;
  username: string;
  nama_lengkap: string;
  role: string;
  is_active: number;
}

const EMPTY_FORM = { username: '', password: '', nama_lengkap: '', role: 'petugas' };

// SVG Icons
const IconPlus = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconTrash = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: '14px' }}>
    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>
      {label}
    </label>
    {children}
  </div>
);

export default function KelolaUserPage() {
  const [users, setUsers]       = useState<User[]>([]);
  const [loading, setLoading]   = useState(true);
  
  const [modal, setModal]       = useState<'add' | 'edit' | null>(null);
  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [editId, setEditId]     = useState<number | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.data);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  // Modal actions
  const openAdd = () => {
    setForm({ ...EMPTY_FORM });
    setEditId(null);
    setError('');
    setModal('add');
  };

  const openEdit = (u: User) => {
    setForm({
      username: u.username,
      password: '', // Kosongkan password saat edit, diisi hanya jika ingin diubah
      nama_lengkap: u.nama_lengkap || '',
      role: u.role,
    });
    setEditId(u.id);
    setError('');
    setModal('edit');
  };

  const closeModal = () => setModal(null);

  // API actions
  const handleSave = async () => {
    setError(''); setSaving(true);
    try {
      if (modal === 'add') {
        if (!form.username || !form.password || !form.nama_lengkap) {
          setError('Semua field wajib diisi (kecuali role)');
          setSaving(false); return;
        }
        await api.post('/users', form);
      } else {
        if (!form.username || !form.nama_lengkap) {
          setError('Username dan Nama Lengkap wajib diisi');
          setSaving(false); return;
        }
        await api.put(`/users/${editId}`, form);
      }
      closeModal();
      fetchUsers();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Gagal menyimpan data user.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Hapus user "${name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Gagal menghapus user.');
    }
  };


  return (
    <div className="page-content" style={{ padding: '24px' }}>
      <div style={{ marginBottom: '22px' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Kelola User</h1>
        <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>Manajemen akun akses petugas posyandu dan admin</p>
      </div>

      <div className="card">
        {/* Toolbar */}
        <div className="toolbar-mobile" style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={openAdd} style={{ marginLeft: 'auto' }}>
            <IconPlus /> Tambah User
          </button>
        </div>

        {/* Table */}
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table className="table-penting">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Nama Lengkap</th>
                <th>Role</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Memuat data...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Belum ada data user.</td></tr>
              ) : users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600, color: '#64748b' }}>{u.id}</td>
                  <td style={{ fontWeight: 600, color: '#2563eb' }}>@{u.username}</td>
                  <td style={{ fontWeight: 600 }}>{u.nama_lengkap || '-'}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-buruk' : 'badge-normal'}`} style={{ textTransform: 'capitalize' }}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-normal' : 'badge-kurang'}`}>
                      {u.is_active ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                        onClick={() => openEdit(u)}>Edit</button>
                      <button className="btn-danger" style={{ padding: '5px 10px' }} onClick={() => handleDelete(u.id, u.username)}>
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>
              {modal === 'add' ? 'Tambah User Baru' : 'Edit Data User'}
            </h3>

            {error && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px',
                borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px' }}>
                {error}
              </div>
            )}

            <Field label="Username *">
              <input className="input-penting" placeholder="Contoh: bidan_sari"
                value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
            </Field>

            <Field label="Nama Lengkap *">
              <input className="input-penting" placeholder="Contoh: Siti Sari"
                value={form.nama_lengkap} onChange={e => setForm({ ...form, nama_lengkap: e.target.value })} />
            </Field>

            <Field label={modal === 'add' ? 'Password *' : 'Password (opsional, isi jika ingin diganti)'}>
              <input className="input-penting" type="password" placeholder={modal === 'add' ? 'Masukkan password' : 'Kosongkan jika tidak diubah'}
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </Field>

            <Field label="Role Akses *">
              <select className="input-penting" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="petugas">Petugas Posyandu</option>
                <option value="admin">Administrator</option>
              </select>
            </Field>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn-secondary" onClick={closeModal}>Batal</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
