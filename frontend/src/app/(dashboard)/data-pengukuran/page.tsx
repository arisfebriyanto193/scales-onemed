'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Measurement {
  id: number; child_id: number; nama_anak: string; tanggal_lahir: string;
  jenis_kelamin: string; tanggal_kunjungan: string; usia_bulan: number;
  usia_teks: string; berat_badan: number; tinggi_badan: number; catatan?: string;
}
interface Child { id: number; nama_anak: string; }

const EMPTY = { child_id: '', tanggal_kunjungan: '', berat_badan: '', tinggi_badan: '', catatan: '' };

export default function DataPengukuranPage() {
  const [data, setData]       = useState<Measurement[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<'add' | 'edit' | null>(null);
  const [form, setForm]       = useState({ ...EMPTY });
  const [editId, setEditId]   = useState<number | null>(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const fetchData = async (q = '') => {
    setLoading(true);
    try {
      const res = await api.get(`/measurements${q ? `?search=${q}` : ''}`);
      setData(res.data.data);
    } catch { setData([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    api.get('/children').then(r => setChildren(r.data.data)).catch(() => {});
  }, []);

  const openAdd = () => { setForm({ ...EMPTY }); setEditId(null); setError(''); setModal('add'); };
  const openEdit = (m: Measurement) => {
    setForm({
      child_id: String(m.child_id),
      tanggal_kunjungan: m.tanggal_kunjungan?.split('T')[0] || '',
      berat_badan: String(m.berat_badan),
      tinggi_badan: String(m.tinggi_badan),
      catatan: m.catatan || '',
    });
    setEditId(m.id); setError(''); setModal('edit');
  };

  const handleSave = async () => {
    setError(''); setSaving(true);
    try {
      const payload = {
        child_id: parseInt(form.child_id),
        tanggal_kunjungan: form.tanggal_kunjungan,
        berat_badan: parseFloat(form.berat_badan),
        tinggi_badan: parseFloat(form.tinggi_badan),
        catatan: form.catatan || null,
      };
      if (modal === 'add') await api.post('/measurements', payload);
      else await api.put(`/measurements/${editId}`, payload);
      setModal(null); fetchData(search);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Gagal menyimpan data.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus data pengukuran ini?')) return;
    try { await api.delete(`/measurements/${id}`); fetchData(search); }
    catch (e: any) { alert(e.response?.data?.message || 'Gagal menghapus.'); }
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>{label}</label>
      {children}
    </div>
  );

  return (
    <div>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '20px', color: '#1e293b' }}>Data Pengukuran</h1>

      <div className="card">
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input className="input-penting" placeholder="Cari nama anak..." style={{ maxWidth: '260px' }}
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchData(search)} />
          <button className="btn-primary" onClick={() => fetchData(search)}>🔍 Cari</button>
          <button className="btn-primary" onClick={openAdd} style={{ marginLeft: 'auto' }}>+ Tambah</button>
          <button className="btn-secondary" onClick={openEdit as any}>✏️ Edit</button>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table-penting">
            <thead>
              <tr>
                <th>ID</th><th>Nama Anak</th><th>Tgl Lahir</th><th>Usia</th>
                <th>Jenis Kelamin</th><th>Berat Badan</th><th>Tinggi Badan</th>
                <th>Tgl Kunjungan</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Belum ada data pengukuran.</td></tr>
              ) : data.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600, color: '#64748b' }}>{m.id}</td>
                  <td style={{ fontWeight: 600 }}>{m.nama_anak}</td>
                  <td>{m.tanggal_lahir?.split('T')[0]}</td>
                  <td>
                    <span className="badge badge-normal">{m.usia_teks}</span>
                  </td>
                  <td>
                    <span className={`badge ${m.jenis_kelamin === 'Laki-laki' ? 'badge-normal' : 'badge-lebih'}`}>
                      {m.jenis_kelamin === 'Laki-laki' ? '♂' : '♀'} {m.jenis_kelamin}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{m.berat_badan} kg</td>
                  <td style={{ fontWeight: 600 }}>{m.tinggi_badan} cm</td>
                  <td>{m.tanggal_kunjungan?.split('T')[0]}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }} onClick={() => openEdit(m)}>✏️ Edit</button>
                      <button className="btn-danger" onClick={() => handleDelete(m.id)}>🗑️</button>
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
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '20px', color: '#1e293b' }}>
              {modal === 'add' ? '+ Tambah Pengukuran' : '✏️ Edit Pengukuran'}
            </h3>
            {error && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px' }}>
                {error}
              </div>
            )}

            <Field label="Nama Anak *">
              <select className="input-penting" value={form.child_id}
                onChange={e => setForm({ ...form, child_id: e.target.value })}>
                <option value="">-- Pilih Anak --</option>
                {children.map(c => <option key={c.id} value={c.id}>{c.nama_anak}</option>)}
              </select>
            </Field>

            <Field label="Tanggal Kunjungan *">
              <input className="input-penting" type="date"
                value={form.tanggal_kunjungan}
                onChange={e => setForm({ ...form, tanggal_kunjungan: e.target.value })} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Berat Badan (kg) *">
                <input className="input-penting" type="number" step="0.01" min="0.5" max="30"
                  placeholder="Contoh: 7.50"
                  value={form.berat_badan}
                  onChange={e => setForm({ ...form, berat_badan: e.target.value })} />
              </Field>
              <Field label="Tinggi Badan (cm) *">
                <input className="input-penting" type="number" step="0.1" min="30" max="130"
                  placeholder="Contoh: 70.0"
                  value={form.tinggi_badan}
                  onChange={e => setForm({ ...form, tinggi_badan: e.target.value })} />
              </Field>
            </div>

            <Field label="Catatan">
              <textarea className="input-penting" rows={2} placeholder="Catatan tambahan (opsional)"
                value={form.catatan}
                onChange={e => setForm({ ...form, catatan: e.target.value })}
                style={{ resize: 'none' }} />
            </Field>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 12px', fontSize: '0.8rem', color: '#1d4ed8', marginBottom: '16px' }}>
              💡 Status gizi akan <strong>dihitung otomatis</strong> setelah data pengukuran disimpan.
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Pengukuran'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
