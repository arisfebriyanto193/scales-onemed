'use client';
import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

// ─── Konstanta WebSocket ───────────────────────────────────────
const WS_URL   = '';
const BB_TOPIC = 'onemed/bb';
const TB_TOPIC = 'onemed/tb';

// ─── Tipe Data ────────────────────────────────────────────────
interface Measurement {
  id: number; child_id: number; nama_anak: string; tanggal_lahir: string;
  jenis_kelamin: string; tanggal_kunjungan: string; usia_bulan: number;
  usia_teks: string; berat_badan: number; tinggi_badan: number; catatan?: string;
}
interface Child { id: number; nama_anak: string; }

const EMPTY = { child_id: '', tanggal_kunjungan: '', berat_badan: '', tinggi_badan: '', catatan: '' };

// ─── Hook: WebSocket untuk BB & TB ────────────────────────────
function useScaleWS(enabled: boolean) {
  const [bb, setBb] = useState<string>('');
  const [tb, setTb] = useState<string>('');
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Tutup koneksi kalau tidak dipakai
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsStatus('disconnected');
      setBb('');
      setTb('');
      return;
    }

    setWsStatus('connecting');
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      // Subscribe ke topic BB dan TB
      ws.send(JSON.stringify({ action: 'subscribe', topic: BB_TOPIC }));
      ws.send(JSON.stringify({ action: 'subscribe', topic: TB_TOPIC }));
    };

    ws.onmessage = (e) => {
      // Server bisa kirim beberapa JSON sekaligus dipisah newline
      const lines = (e.data as string).split('\n');
      for (const raw of lines) {
        if (!raw.trim()) continue;
        try {
          const msg = JSON.parse(raw);
          const topic: string   = msg.topic   || '';
          const payload: string = msg.payload !== undefined ? String(msg.payload) : '';

          if (topic === BB_TOPIC) {
            const val = parseFloat(payload);
            if (!isNaN(val) && val > 0) setBb(val.toFixed(2));
          } else if (topic === TB_TOPIC) {
            const val = parseFloat(payload);
            if (!isNaN(val) && val > 0) setTb(val.toFixed(1));
          }
        } catch {
          // Format alternatif: "TOPIC|VALUE"
          if (raw.includes('|')) {
            const [t, v] = raw.split('|');
            if (t.trim() === BB_TOPIC) {
              const val = parseFloat(v);
              if (!isNaN(val) && val > 0) setBb(val.toFixed(2));
            } else if (t.trim() === TB_TOPIC) {
              const val = parseFloat(v);
              if (!isNaN(val) && val > 0) setTb(val.toFixed(1));
            }
          }
        }
      }
    };

    ws.onerror = () => setWsStatus('disconnected');
    ws.onclose = () => setWsStatus('disconnected');

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [enabled]);

  return { bb, tb, wsStatus };
}

// ─── Komponen Utama ───────────────────────────────────────────
export default function DataPengukuranPage() {
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

  // ── WebSocket (hanya aktif saat mode auto & modal terbuka) ───
  const { bb: wsBb, tb: wsTb, wsStatus } = useScaleWS(isAuto);

  // Sync nilai WS → form saat mode auto
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

  // ─── Field Wrapper ────────────────────────────────────────────
  const Field = ({ label, children: fc }: { label: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>
        {label}
      </label>
      {fc}
    </div>
  );

  // ─── Status WS badge ─────────────────────────────────────────
  const wsBadge = () => {
    const map = {
      connecting:   { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b', text: 'Menghubungkan...' },
      connected:    { bg: '#d1fae5', color: '#065f46', dot: '#10b981', text: 'Terhubung — menunggu data' },
      disconnected: { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444', text: 'Tidak terhubung' },
    }[wsStatus];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px',
        background: map.bg, color: map.color, padding: '8px 12px',
        borderRadius: '8px', fontSize: '0.8rem', fontWeight: 500, marginBottom: '12px' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: map.dot,
          display: 'inline-block',
          ...(wsStatus === 'connecting' ? { animation: 'pulse 1.2s infinite' } : {}) }} />
        📡 WebSocket: {map.text}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <div>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .mode-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 18px; border-radius: 9px; font-size: 0.85rem;
          font-weight: 600; border: 2px solid transparent;
          cursor: pointer; transition: all .18s;
        }
        .mode-btn.active-manual {
          background: #1e40af; color: #fff; border-color: #1e40af;
        }
        .mode-btn.active-auto {
          background: #065f46; color: #fff; border-color: #059669;
        }
        .mode-btn.inactive {
          background: #f1f5f9; color: #64748b; border-color: #e2e8f0;
        }
        .mode-btn.inactive:hover { background: #e2e8f0; }
        .auto-field input[type="number"] {
          background: #f0fdf4 !important;
          color: #065f46 !important;
          font-weight: 700 !important;
          border-color: #6ee7b7 !important;
          cursor: not-allowed;
        }
        @keyframes data-flash {
          0%   { box-shadow: 0 0 0 0 rgba(16,185,129,.5); }
          70%  { box-shadow: 0 0 0 6px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
        .auto-field input.has-data {
          animation: data-flash 0.6s ease;
        }
      `}</style>

      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '20px', color: '#1e293b' }}>
        Data Pengukuran
      </h1>

      <div className="card">
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input className="input-penting" placeholder="Cari nama anak..." style={{ maxWidth: '260px' }}
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchData(search)} />
          <button className="btn-primary" onClick={() => fetchData(search)}>🔍 Cari</button>
          <button className="btn-primary" onClick={openAdd} style={{ marginLeft: 'auto' }}>+ Tambah</button>
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
                        onClick={() => openEdit(m)}>✏️ Edit</button>
                      <button className="btn-danger" onClick={() => handleDelete(m.id)}>🗑️</button>
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
                  🔄 Data BB & TB diisi <strong>otomatis</strong> dari timbangan IoT via WebSocket.
                  Pastikan ESP32 aktif dan mengirim data.
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
