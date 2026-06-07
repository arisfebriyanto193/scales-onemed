'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Child {
  id: number; nik: string; nama_anak: string; jenis_kelamin: string;
  tanggal_lahir: string; nama_orang_tua: string; alamat: string;
  wilayah: string; nomor_telepon: string; rfid_uid?: string;
}
const EMPTY: Omit<Child, 'id'> = {
  nik: '', nama_anak: '', jenis_kelamin: 'Laki-laki',
  tanggal_lahir: '', nama_orang_tua: '', alamat: '', wilayah: '', nomor_telepon: '',
  rfid_uid: '',
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: '14px' }}>
    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>{label}</label>
    {children}
  </div>
);

// ─── Inner component (menggunakan useSearchParams) ─────────────
function DataAnakInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [data, setData]       = useState<Child[]>([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<'add' | 'edit' | null>(null);
  const [form, setForm]       = useState({ ...EMPTY });
  const [editId, setEditId]   = useState<number | null>(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  // ── Banner: kartu RFID dari redirect data-pengukuran-ws ──────
  const [rfidBanner, setRfidBanner] = useState<string | null>(null);

  const fetchData = async (q = '') => {
    setLoading(true);
    try {
      const res = await api.get(`/children${q ? `?search=${q}` : ''}`);
      setData(res.data.data);
    } catch { setData([]); }
    finally { setLoading(false); }
  };

  // ── Baca query param ?rfid_uid= saat halaman pertama load ────
  useEffect(() => {
    fetchData();
    const rfidUid = searchParams.get('rfid_uid');
    if (rfidUid) {
      const uid = rfidUid.toUpperCase();
      setRfidBanner(uid);
      // Buka modal tambah dengan UID sudah terisi
      setForm({ ...EMPTY, rfid_uid: uid });
      setEditId(null);
      setError('');
      setModal('add');
      // Bersihkan query param dari URL tanpa reload halaman
      router.replace('/data-anak', { scroll: false });
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => {
    setForm({ ...EMPTY });
    setEditId(null);
    setError('');
    setModal('add');
  };

  const openEdit = (c: Child) => {
    setForm({
      nik: c.nik, nama_anak: c.nama_anak, jenis_kelamin: c.jenis_kelamin,
      tanggal_lahir: c.tanggal_lahir?.split('T')[0] || '',
      nama_orang_tua: c.nama_orang_tua, alamat: c.alamat,
      wilayah: c.wilayah || '', nomor_telepon: c.nomor_telepon || '',
      rfid_uid: c.rfid_uid || '',
    });
    setEditId(c.id); setError(''); setModal('edit');
  };

  const handleSave = async () => {
    setError(''); setSaving(true);
    try {
      const payload = {
        ...form,
        rfid_uid: form.rfid_uid?.trim().toUpperCase() || null,
      };
      if (modal === 'add') await api.post('/children', payload);
      else await api.put(`/children/${editId}`, payload);
      setModal(null);
      setRfidBanner(null);
      fetchData(search);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Gagal menyimpan data.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Hapus data anak "${nama}"?`)) return;
    try { await api.delete(`/children/${id}`); fetchData(search); }
    catch (e: any) { alert(e.response?.data?.message || 'Gagal menghapus.'); }
  };

  return (
    <div className="page-content" style={{ padding: '24px' }}>
      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .rfid-chip {
          display: inline-flex; align-items: center; gap: 4px;
          background: #ede9fe; color: #6d28d9; border-radius: 6px;
          padding: 2px 8px; font-size: 0.72rem; font-family: monospace;
          font-weight: 600; letter-spacing: 0.05em;
        }
      `}</style>

      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '20px', color: '#1e293b' }}>Data Anak</h1>

      {/* ── Banner RFID redirect ──────────────────────────────── */}
      {rfidBanner && !modal && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px',
          padding: '12px 16px', marginBottom: '16px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          animation: 'slideIn 0.3s ease'
        }}>
          <div style={{ color: '#92400e' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '3px' }}>
              🎫 Daftarkan Anak dengan Kartu RFID
            </div>
            <div style={{ fontSize: '0.82rem' }}>
              UID: <code style={{ background: '#fde68a', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                {rfidBanner}
              </code>{' '}
              telah diisi otomatis. Lengkapi data anak dan simpan.
            </div>
          </div>
          <button onClick={() => setRfidBanner(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: '1.1rem' }}>✕</button>
        </div>
      )}

      <div className="card">
        {/* Toolbar */}
        <div className="toolbar-mobile" style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input className="input-penting" placeholder="Cari nama / NIK..." style={{ maxWidth: '260px' }}
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchData(search)} />
          <button className="btn-primary" onClick={() => fetchData(search)}>🔍 Cari</button>
          <button className="btn-primary" onClick={openAdd} style={{ marginLeft: 'auto' }}>+ Tambah Data</button>
        </div>

        {/* Table */}
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table className="table-penting">
            <thead>
              <tr>
                <th>No</th><th>NIK</th><th>Nama Anak</th><th>Jenis Kelamin</th>
                <th>Tgl Lahir</th><th>Nama Orang Tua</th><th>Wilayah</th>
                <th>No. Telp</th><th>RFID</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Tidak ada data anak.</td></tr>
              ) : data.map((c, i) => (
                <tr key={c.id}>
                  <td>{i + 1}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{c.nik}</td>
                  <td style={{ fontWeight: 600 }}>{c.nama_anak}</td>
                  <td>
                    <span className={`badge ${c.jenis_kelamin === 'Laki-laki' ? 'badge-normal' : 'badge-lebih'}`}>
                      {c.jenis_kelamin === 'Laki-laki' ? '♂' : '♀'} {c.jenis_kelamin}
                    </span>
                  </td>
                  <td>{c.tanggal_lahir?.split('T')[0]}</td>
                  <td>{c.nama_orang_tua}</td>
                  <td>{c.wilayah || '-'}</td>
                  <td>{c.nomor_telepon || '-'}</td>
                  <td>
                    {c.rfid_uid
                      ? <span className="rfid-chip">🃏 {c.rfid_uid}</span>
                      : <span style={{ color: '#cbd5e1', fontSize: '0.78rem' }}>—</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }} onClick={() => openEdit(c)}>Edit</button>
                      <button className="btn-danger" onClick={() => handleDelete(c.id, c.nama_anak)}>🗑️</button>
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
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>
              {modal === 'add' ? '+ Tambah Data Anak' : '✏️ Edit Data Anak'}
            </h3>

            {/* Banner RFID di dalam modal */}
            {modal === 'add' && rfidBanner && (
              <div style={{
                background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '8px',
                padding: '9px 12px', fontSize: '0.82rem', color: '#5b21b6',
                marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '7px'
              }}>
                🎫 <span>RFID UID <strong>{rfidBanner}</strong> otomatis diisi dari kartu yang di-tap.</span>
              </div>
            )}

            {error && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px' }}>
                {error}
              </div>
            )}

            <Field label="NIK Anak *">
              <input className="input-penting" maxLength={16} placeholder="16 digit NIK"
                value={form.nik} onChange={e => setForm({ ...form, nik: e.target.value })} />
            </Field>
            <Field label="Nama Anak *">
              <input className="input-penting" placeholder="Nama lengkap anak"
                value={form.nama_anak} onChange={e => setForm({ ...form, nama_anak: e.target.value })} />
            </Field>

            <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Jenis Kelamin *">
                <select className="input-penting" value={form.jenis_kelamin}
                  onChange={e => setForm({ ...form, jenis_kelamin: e.target.value })}>
                  <option>Laki-laki</option><option>Perempuan</option>
                </select>
              </Field>
              <Field label="Tanggal Lahir *">
                <input className="input-penting" type="date"
                  value={form.tanggal_lahir} onChange={e => setForm({ ...form, tanggal_lahir: e.target.value })} />
              </Field>
            </div>

            <Field label="Nama Orang Tua *">
              <input className="input-penting" placeholder="Nama ayah/ibu/wali"
                value={form.nama_orang_tua} onChange={e => setForm({ ...form, nama_orang_tua: e.target.value })} />
            </Field>
            <Field label="Alamat *">
              <textarea className="input-penting" rows={2} placeholder="Alamat lengkap"
                value={form.alamat} onChange={e => setForm({ ...form, alamat: e.target.value })} style={{ resize: 'none' }} />
            </Field>

            <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Wilayah">
                <input className="input-penting" placeholder="Kelurahan/Posyandu"
                  value={form.wilayah} onChange={e => setForm({ ...form, wilayah: e.target.value })} />
              </Field>
              <Field label="Nomor Telepon">
                <input className="input-penting" placeholder="08xxx"
                  value={form.nomor_telepon} onChange={e => setForm({ ...form, nomor_telepon: e.target.value })} />
              </Field>
            </div>

            {/* Field RFID UID */}
            <Field label="RFID UID (Opsional)">
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '10px', top: '50%',
                  transform: 'translateY(-50%)', fontSize: '0.85rem', pointerEvents: 'none'
                }}>🃏</span>
                <input
                  className="input-penting"
                  placeholder="Contoh: A3B4C5D6 (scan kartu RFID)"
                  maxLength={20}
                  style={{
                    paddingLeft: '30px',
                    fontFamily: 'monospace',
                    letterSpacing: '0.05em',
                    ...(form.rfid_uid ? { borderColor: '#a78bfa', background: '#faf5ff' } : {}),
                  }}
                  value={form.rfid_uid || ''}
                  onChange={e => setForm({ ...form, rfid_uid: e.target.value.toUpperCase() })}
                />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                UID akan disimpan dalam format huruf besar (uppercase). Biarkan kosong jika belum ada kartu RFID.
              </div>
            </Field>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button className="btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Wrapper dengan Suspense (wajib untuk useSearchParams) ────
export default function DataAnakPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '24px', color: '#94a3b8' }}>Memuat halaman...</div>
    }>
      <DataAnakInner />
    </Suspense>
  );
}
