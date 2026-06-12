'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

// ─── Tipe Data ────────────────────────────────────────────────
interface Measurement {
  id: number; child_id: number; nama_anak: string; tanggal_lahir: string;
  jenis_kelamin: string; tanggal_kunjungan: string; usia_bulan: number;
  usia_teks: string; berat_badan: number; tinggi_badan: number; catatan?: string;
}
interface Child { id: number; nama_anak: string; }

const EMPTY = { child_id: '', tanggal_kunjungan: '', berat_badan: '', tinggi_badan: '', catatan: '' };

// ─── Field Wrapper ────────────────────────────────────────────
const Field = ({ label, children: fc }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: '14px' }}>
    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>
      {label}
    </label>
    {fc}
  </div>
);

// ─── Hook: Polling API untuk BB & TB ────────────────────────────
function useScaleAPI(enabled: boolean) {
  const [bb, setBb] = useState<string>('');
  const [tb, setTb] = useState<string>('');
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  // Hardcode dev_id untuk sementara
  const DEV_ID = 'ESP32_ONEMED_01';

  useEffect(() => {
    if (!enabled) {
      setWsStatus('disconnected');
      setBb('');
      setTb('');
      return;
    }

    setWsStatus('connecting');
    let lastUpdate = 0;

    const fetchHardwareData = async () => {
      try {
        const res = await api.get(`/hardware/data/${DEV_ID}`);
        if (res.data?.success && res.data?.data) {
          const data = res.data.data;
          setWsStatus('connected');
          
          // Format ke string sesuai state form
          const valBb = parseFloat(data.bb).toFixed(2);
          const valTb = parseFloat(data.tb).toFixed(1);

          if (valBb !== '0.00' && valBb !== bb) setBb(valBb);
          if (valTb !== '0.0' && valTb !== tb) setTb(valTb);
        }
      } catch (err) {
        setWsStatus('connecting'); // Sedang mencari alat / offline
      }
    };

    // Polling pertama kali
    fetchHardwareData();

    // Polling setiap 1.5 detik
    const interval = setInterval(fetchHardwareData, 1500);

    return () => clearInterval(interval);
  }, [enabled, bb, tb]);

  return { bb, tb, wsStatus };
}

// ─── Komponen Utama ───────────────────────────────────────────
export default function DataPengukuranPage() {
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('penting_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'admin') {
          router.replace('/dashboard');
        }
      } catch (e) {}
    }
  }, [router]);

  const [data, setData]         = useState<Measurement[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<'add' | 'edit' | null>(null);
  const [form, setForm]         = useState({ ...EMPTY });
  const [editId, setEditId]     = useState<number | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  // ── Mode Auto/Manual ─────────────────────────────────────────
  const [inputMode, setInputMode] = useState<'manual' | 'auto'>('manual');
  const isAuto = inputMode === 'auto' && modal !== null;

  // ── Polling API (hanya aktif saat mode auto & modal terbuka) ───
  const { bb: wsBb, tb: wsTb, wsStatus } = useScaleAPI(isAuto);

  // Sync nilai API → form saat mode auto
  useEffect(() => {
    if (isAuto) {
      setForm(prev => ({
        ...prev,
        ...(wsBb ? { berat_badan: wsBb } : {}),
        ...(wsTb ? { tinggi_badan: wsTb } : {}),
      }));
    }
  }, [wsBb, wsTb, isAuto]);

  // ─── Fetch Data ───────────────────────────────────────────────
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

  // ─── Modal Helpers ────────────────────────────────────────────
  const openAdd = () => {
    setForm({ ...EMPTY });
    setEditId(null);
    setError('');
    setInputMode('manual');
    setModal('add');
  };

  const openEdit = (m: Measurement) => {
    setForm({
      child_id: String(m.child_id),
      tanggal_kunjungan: m.tanggal_kunjungan?.split('T')[0] || '',
      berat_badan: String(m.berat_badan),
      tinggi_badan: String(m.tinggi_badan),
      catatan: m.catatan || '',
    });
    setEditId(m.id);
    setError('');
    setInputMode('manual');
    setModal('edit');
  };

  const closeModal = () => {
    setModal(null);
    setInputMode('manual');
  };

  // ─── Save ─────────────────────────────────────────────────────
  const handleSave = async () => {
    setError(''); setSaving(true);
    try {
      const payload = {
        child_id:          parseInt(form.child_id),
        tanggal_kunjungan: form.tanggal_kunjungan,
        berat_badan:       parseFloat(form.berat_badan),
        tinggi_badan:      parseFloat(form.tinggi_badan),
        catatan:           form.catatan || null,
      };
      if (modal === 'add') await api.post('/measurements', payload);
      else await api.put(`/measurements/${editId}`, payload);
      closeModal();
      fetchData(search);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Gagal menyimpan data.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus data pengukuran ini?')) return;
    try { await api.delete(`/measurements/${id}`); fetchData(search); }
    catch (e: any) { alert(e.response?.data?.message || 'Gagal menghapus.'); }
  };


  // ─── Status IoT badge ─────────────────────────────────────────
  const wsBadge = () => {
    const map = {
      connecting:   { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b', text: 'Mencari data timbangan...' },
      connected:    { bg: '#d1fae5', color: '#065f46', dot: '#10b981', text: 'Terhubung — menerima data' },
      disconnected: { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444', text: 'Alat tidak terhubung' },
    }[wsStatus];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px',
        background: map.bg, color: map.color, padding: '8px 12px',
        borderRadius: '8px', fontSize: '0.8rem', fontWeight: 500, marginBottom: '12px' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: map.dot,
          display: 'inline-block',
          ...(wsStatus === 'connecting' ? { animation: 'pulse 1.2s infinite' } : {}) }} />
        📡 Status Alat: {map.text}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="page-content" style={{ padding: '24px' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .mode-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 8px 16px; border-radius: 8px; font-size: 0.83rem;
          font-weight: 600; border: 1.5px solid transparent;
          cursor: pointer; transition: all .18s; font-family: inherit;
        }
        .mode-btn.active-manual {
          background: #1e293b; color: #fff; border-color: #1e293b;
        }
        .mode-btn.active-auto {
          background: #2563eb; color: #fff; border-color: #2563eb;
          box-shadow: 0 3px 10px rgba(37,99,235,0.25);
        }
        .mode-btn.inactive {
          background: #f8fafb; color: #64748b; border-color: #e8edf2;
        }
        .mode-btn.inactive:hover { background: #f1f5f9; color: #374151; }
        .auto-field input[type="number"] {
          background: #eff6ff !important;
          color: #1d4ed8 !important;
          font-weight: 700 !important;
          border-color: #93c5fd !important;
          cursor: not-allowed;
        }
        @keyframes data-flash {
          0%   { box-shadow: 0 0 0 0 rgba(37,99,235,.4); }
          70%  { box-shadow: 0 0 0 6px rgba(37,99,235,0); }
          100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
        }
        .auto-field input.has-data {
          animation: data-flash 0.6s ease;
        }
      `}</style>

      <div style={{ marginBottom: '22px' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Data Pengukuran</h1>
        <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>Riwayat pengukuran berat dan tinggi badan anak</p>
      </div>

      <div className="card">
        {/* Toolbar */}
        <div className="toolbar-mobile" style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', maxWidth: '280px', flex: '1 1 200px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input className="input-penting" placeholder="Cari nama anak..." style={{ paddingLeft: '36px' }}
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchData(search)} />
          </div>
          <button className="btn-ghost" onClick={() => fetchData(search)}>Cari</button>
          <button className="btn-primary" onClick={openAdd} style={{ marginLeft: 'auto' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Pengukuran
          </button>
        </div>

        {/* Table */}
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
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
                  <td><span className="badge badge-normal">{m.usia_teks}</span></td>
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
                      <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                        onClick={() => openEdit(m)}>Edit</button>
                      <button className="btn-danger" style={{ padding: '5px 10px' }} onClick={() => handleDelete(m.id)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Modal ─────────────────────────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>
              {modal === 'add' ? '+ Tambah Pengukuran' : '✏️ Edit Pengukuran'}
            </h3>

            {/* ── Toggle Auto / Manual ── */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px',
              padding: '10px', background: '#f8fafc', borderRadius: '12px',
              border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b',
                alignSelf: 'center', marginRight: 4 }}>Mode Input:</span>

              <button
                className={`mode-btn ${inputMode === 'manual' ? 'active-manual' : 'inactive'}`}
                onClick={() => setInputMode('manual')}>
                ✍️ Manual
              </button>
              <button
                className={`mode-btn ${inputMode === 'auto' ? 'active-auto' : 'inactive'}`}
                onClick={() => setInputMode('auto')}>
                📡 Auto (IoT)
              </button>
            </div>

            {/* Status WS (hanya saat auto) */}
            {isAuto && wsBadge()}

            {/* Error */}
            {error && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px',
                borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px' }}>
                {error}
              </div>
            )}

            {/* Nama Anak */}
            <Field label="Nama Anak *">
              <select className="input-penting" value={form.child_id}
                onChange={e => setForm({ ...form, child_id: e.target.value })}>
                <option value="">-- Pilih Anak --</option>
                {children.map(c => <option key={c.id} value={c.id}>{c.nama_anak}</option>)}
              </select>
            </Field>

            {/* Tanggal Kunjungan */}
            <Field label="Tanggal Kunjungan *">
              <input className="input-penting" type="date"
                value={form.tanggal_kunjungan}
                onChange={e => setForm({ ...form, tanggal_kunjungan: e.target.value })} />
            </Field>

            {/* BB & TB */}
            <div className={isAuto ? 'auto-field' : ''}>
              {/* Keterangan mode auto */}
              {isAuto && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: '8px', padding: '9px 12px', fontSize: '0.8rem',
                  color: '#15803d', marginBottom: '10px', display: 'flex',
                  alignItems: 'center', gap: '6px' }}>
                  🔄 Data BB & TB diisi <strong>otomatis</strong> dari timbangan IoT.
                  Pastikan ESP32 aktif.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label={`Berat Badan (kg) *${isAuto ? ' 📡' : ''}`}>
                  <input
                    className={`input-penting${isAuto && form.berat_badan ? ' has-data' : ''}`}
                    type="number" step="0.01" min="0.5" max="30"
                    placeholder={isAuto ? 'Menunggu data...' : 'Contoh: 7.50'}
                    value={form.berat_badan}
                    readOnly={isAuto}
                    onChange={isAuto ? undefined : e => setForm({ ...form, berat_badan: e.target.value })}
                  />
                </Field>
                <Field label={`Tinggi Badan (cm) *${isAuto ? ' 📡' : ''}`}>
                  <input
                    className={`input-penting${isAuto && form.tinggi_badan ? ' has-data' : ''}`}
                    type="number" step="0.1" min="30" max="130"
                    placeholder={isAuto ? 'Menunggu data...' : 'Contoh: 70.0'}
                    value={form.tinggi_badan}
                    readOnly={isAuto}
                    onChange={isAuto ? undefined : e => setForm({ ...form, tinggi_badan: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            {/* Catatan */}
            <Field label="Catatan">
              <textarea className="input-penting" rows={2} placeholder="Catatan tambahan (opsional)"
                value={form.catatan}
                onChange={e => setForm({ ...form, catatan: e.target.value })}
                style={{ resize: 'none' }} />
            </Field>

            {/* Info box */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px',
              padding: '10px 12px', fontSize: '0.8rem', color: '#1d4ed8', marginBottom: '16px' }}>
              💡 Status gizi akan <strong>dihitung otomatis</strong> setelah data pengukuran disimpan.
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={closeModal}>Batal</button>
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
