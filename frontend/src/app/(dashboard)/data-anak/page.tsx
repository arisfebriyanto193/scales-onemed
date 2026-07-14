'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// ─── Konfigurasi WebSocket ─────────────────────────────────────
const WS_URL      = process.env.NEXT_PUBLIC_WS ?? 'ws://localhost:5000/ws';
const TOPIC_IDCARD = 'abcd/idcard';

// ─── Hook: subscribe abcd/idcard saat modal terbuka ───────────
// Mengembalikan UID terakhir yang terbaca. Field tetap bisa diedit manual.
function useRfidWS(enabled: boolean, onUid: (uid: string) => void) {
  const wsRef       = useRef<WebSocket | null>(null);
  const reconnRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');

  useEffect(() => {
    if (!enabled) {
      if (wsRef.current)   { wsRef.current.close(); wsRef.current = null; }
      if (reconnRef.current) clearTimeout(reconnRef.current);
      setStatus('idle');
      return;
    }

    let destroyed = false;
    const connect = () => {
      if (destroyed) return;
      setStatus('connecting');
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (destroyed) { ws.close(); return; }
        setStatus('connected');
        ws.send(JSON.stringify({ action: 'subscribe', topic: TOPIC_IDCARD }));
      };

      ws.onmessage = (event) => {
        if (destroyed) return;
        const raw = typeof event.data === 'string' ? event.data : '';
        let uid = '';

        // Format "abcd/idcard|XXXXXXXX"
        if (raw.includes('|')) {
          const [topic, val] = raw.split('|');
          if (topic.trim() === TOPIC_IDCARD) uid = val.trim().toUpperCase();
        } else {
          // Format JSON {"topic":"abcd/idcard","payload":"XXXXXXXX"}
          try {
            const msg = JSON.parse(raw);
            if (msg.topic === TOPIC_IDCARD) uid = String(msg.payload ?? '').toUpperCase();
          } catch { /* abaikan */ }
        }

        if (uid) onUid(uid);
      };

      ws.onerror = () => { if (!destroyed) setStatus('connecting'); };
      ws.onclose = () => {
        if (destroyed) return;
        setStatus('connecting');
        reconnRef.current = setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      destroyed = true;
      if (reconnRef.current) clearTimeout(reconnRef.current);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return { status };
}

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

const Field = ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (
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
  const [detailModal, setDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<{ child: any, measurements: any[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // ── Banner: kartu RFID dari redirect data-pengukuran-ws ──────
  const [rfidBanner, setRfidBanner] = useState<string | null>(null);

  // ── RFID via WebSocket (aktif saat modal terbuka) ────────────
  const [rfidFlash, setRfidFlash] = useState(false);   // animasi flash saat UID baru masuk
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { status: wsStatus } = useRfidWS(
    modal !== null,   // aktif hanya saat modal terbuka
    (uid) => {
      setForm(prev => ({ ...prev, rfid_uid: uid }));
      setRfidFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setRfidFlash(false), 800);
    }
  );

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

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
    setRfidFlash(false);
    setModal('add');
  };

  const openEdit = (c: Child) => {
    setForm({
      nik: c.nik, nama_anak: c.nama_anak, jenis_kelamin: c.jenis_kelamin,
      tanggal_lahir: c.tanggal_lahir?.substring(0, 10) || '',
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

  const openDetail = async (c: Child) => {
    setDetailModal(true);
    setDetailLoading(true);
    setDetailError('');
    setDetailData(null);
    try {
      const res = await api.get(`/children/public/by-nik/${c.nik}`);
      setDetailData(res.data.data);
    } catch (err: any) {
      setDetailError(err.response?.data?.message || 'Gagal mengambil data riwayat anak.');
    } finally {
      setDetailLoading(false);
    }
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
                  <td 
                    style={{ fontWeight: 600, cursor: 'pointer', color: '#2563eb', textDecoration: 'underline' }}
                    onClick={() => openDetail(c)}
                  >
                    {c.nama_anak}
                  </td>
                  <td>
                    <span className={`badge ${c.jenis_kelamin === 'Laki-laki' ? 'badge-normal' : 'badge-lebih'}`}>
                      {c.jenis_kelamin === 'Laki-laki' ? '♂' : '♀'} {c.jenis_kelamin}
                    </span>
                  </td>
                  <td>{c.tanggal_lahir?.substring(0, 10)}</td>
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

            {/* Field RFID UID + status WS */}
            <Field label={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>RFID UID (Opsional)</span>
                {/* Status indikator WS */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '0.72rem', fontWeight: 500,
                  color: wsStatus === 'connected' ? '#059669' : wsStatus === 'connecting' ? '#d97706' : '#94a3b8',
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
                    background: wsStatus === 'connected' ? '#10b981' : wsStatus === 'connecting' ? '#f59e0b' : '#cbd5e1',
                    ...(wsStatus === 'connecting' ? { animation: 'pulse 1.2s infinite' } : {}),
                  }} />
                  {wsStatus === 'connected' ? '📡 Siap scan kartu' : wsStatus === 'connecting' ? 'Menyambung...' : ''}
                </span>
              </div>
            }>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '10px', top: '50%',
                  transform: 'translateY(-50%)', fontSize: '0.85rem', pointerEvents: 'none'
                }}>🃏</span>
                <input
                  className="input-penting"
                  placeholder="Scan kartu RFID atau ketik manual"
                  maxLength={20}
                  style={{
                    paddingLeft: '30px',
                    fontFamily: 'monospace',
                    letterSpacing: '0.08em',
                    transition: 'box-shadow 0.2s, border-color 0.2s',
                    ...(rfidFlash
                      ? { borderColor: '#7c3aed', background: '#f5f3ff',
                          boxShadow: '0 0 0 3px rgba(124,58,237,0.25)' }
                      : form.rfid_uid
                        ? { borderColor: '#a78bfa', background: '#faf5ff' }
                        : {}),
                  }}
                  value={form.rfid_uid || ''}
                  onChange={e => setForm({ ...form, rfid_uid: e.target.value.toUpperCase() })}
                />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Tap kartu RFID ke reader untuk mengisi otomatis, atau ketik manual.</span>
                {form.rfid_uid && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, rfid_uid: '' })}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
                      fontSize: '0.72rem', padding: 0, fontFamily: 'inherit' }}
                  >✕ Hapus</button>
                )}
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

      {/* Modal Detail */}
      {detailModal && (
        <div className="modal-overlay" onClick={() => setDetailModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: '95%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Detail Riwayat Pengukuran</h3>
              <button onClick={() => setDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Memuat riwayat...</div>
            ) : detailError ? (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px' }}>{detailError}</div>
            ) : detailData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Profil Anak */}
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>NAMA ANAK</p>
                      <p style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>{detailData.child.nama_anak}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>NIK</p>
                      <p style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 500 }}>{detailData.child.nik}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>TANGGAL LAHIR</p>
                      <p style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 500 }}>
                        {new Date(detailData.child.tanggal_lahir).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>JENIS KELAMIN</p>
                      <p style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 500 }}>{detailData.child.jenis_kelamin}</p>
                    </div>
                  </div>
                </div>

                {/* Grafik */}
                {detailData.measurements.length > 0 && (
                  <div style={{ border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>Grafik Pertumbuhan</h4>
                    <div style={{ height: '300px', position: 'relative' }}>
                      <Line 
                        data={{
                          labels: detailData.measurements.map(m => {
                            const date = new Date(m.tanggal_kunjungan);
                            return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                          }),
                          datasets: [
                            {
                              label: 'Berat Badan (kg)',
                              data: detailData.measurements.map(m => m.berat_badan),
                              borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.5)', yAxisID: 'y', tension: 0.3,
                            },
                            {
                              label: 'Tinggi Badan (cm)',
                              data: detailData.measurements.map(m => m.tinggi_badan),
                              borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.5)', yAxisID: 'y1', tension: 0.3,
                            }
                          ]
                        }}
                        options={{
                          responsive: true, maintainAspectRatio: false, interaction: { mode: 'index' as const, intersect: false },
                          scales: {
                            y: { type: 'linear' as const, display: true, position: 'left' as const, title: { display: true, text: 'Berat (kg)' } },
                            y1: { type: 'linear' as const, display: true, position: 'right' as const, grid: { drawOnChartArea: false }, title: { display: true, text: 'Tinggi (cm)' } },
                          }
                        }} 
                      />
                    </div>
                  </div>
                )}

                {/* Riwayat Pengukuran */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '20px 20px 16px 20px', color: '#1e293b' }}>Riwayat Pengukuran</h4>
                  {detailData.measurements.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Belum ada riwayat pengukuran.</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                            <th style={{ padding: '12px 20px', color: '#475569', fontWeight: 600 }}>Tanggal</th>
                            <th style={{ padding: '12px 20px', color: '#475569', fontWeight: 600 }}>Usia</th>
                            <th style={{ padding: '12px 20px', color: '#475569', fontWeight: 600 }}>BB (kg)</th>
                            <th style={{ padding: '12px 20px', color: '#475569', fontWeight: 600 }}>TB (cm)</th>
                            <th style={{ padding: '12px 20px', color: '#475569', fontWeight: 600 }}>Status Kes.</th>
                            <th style={{ padding: '12px 20px', color: '#475569', fontWeight: 600 }}>Status BB/U</th>
                            <th style={{ padding: '12px 20px', color: '#475569', fontWeight: 600 }}>Status TB/U</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailData.measurements.map((m, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 20px' }}>{new Date(m.tanggal_kunjungan).toLocaleDateString('id-ID')}</td>
                              <td style={{ padding: '12px 20px' }}>{m.usia_bulan} bln</td>
                              <td style={{ padding: '12px 20px', fontWeight: 500, color: '#3b82f6' }}>{m.berat_badan}</td>
                              <td style={{ padding: '12px 20px', fontWeight: 500, color: '#10b981' }}>{m.tinggi_badan}</td>
                              <td style={{ padding: '12px 20px', fontSize: '0.8rem', color: '#64748b' }}>{m.status_kesehatan || '-'}</td>
                              <td style={{ padding: '12px 20px' }}>
                                <span style={{
                                  padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                  background: m.status_bb_u?.includes('Kurang') || m.status_bb_u?.includes('Sangat') ? '#fee2e2' : '#dcfce7',
                                  color: m.status_bb_u?.includes('Kurang') || m.status_bb_u?.includes('Sangat') ? '#b91c1c' : '#15803d'
                                }}>
                                  {m.status_bb_u || '-'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 20px' }}>
                                <span style={{
                                  padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                  background: m.status_tb_u?.includes('Pendek') ? '#fee2e2' : '#dcfce7',
                                  color: m.status_tb_u?.includes('Pendek') ? '#b91c1c' : '#15803d'
                                }}>
                                  {m.status_tb_u || '-'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
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
