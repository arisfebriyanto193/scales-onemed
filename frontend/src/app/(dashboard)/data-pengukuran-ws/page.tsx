'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface GrowthRef {
  usia_bulan: number;
  sd_minus3: number;
  sd_minus2: number;
  median: number;
  sd_plus2: number;
  sd_plus3: number;
}

function badgeStatus(status?: string) {
  if (!status) return 'badge-normal';
  const map: Record<string, string> = {
    'Gizi Baik/Normal' : 'badge-normal',
    'Berat Badan Normal': 'badge-normal',
    'Tinggi Normal'    : 'badge-normal',
    'Kurang Gizi'      : 'badge-kurang',
    'Pendek'           : 'badge-kurang',
    'Gizi Buruk'       : 'badge-buruk',
    'Sangat Pendek'    : 'badge-buruk',
    'Gizi Lebih'       : 'badge-lebih',
    'Tinggi'           : 'badge-lebih',
  };
  return map[status] || 'badge-normal';
}

const IconChartLine = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const chartOptions = (label: string) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const, labels: { font: { size: 10 }, usePointStyle: true, boxWidth: 6 } },
    title: { display: false },
  },
  scales: {
    x: { grid: { color: '#f1f5f9' }, title: { display: true, text: 'Usia (bulan)', font: { size: 10 } }, ticks: { font: { size: 9 } } },
    y: { grid: { color: '#f1f5f9' }, title: { display: true, text: label, font: { size: 10 } }, ticks: { font: { size: 9 } } },
  },
});

const makeChart = (refs: GrowthRef[], color: string, isWeight: boolean, childMeasurements?: any[], childName?: string) => {
  const labels = refs.map(r => r.usia_bulan);
  const pointStyle = isWeight ? 'circle' : 'triangle';
  const datasets: any[] = [
    { label: '-3 SD', data: refs.map(r => r.sd_minus3), borderColor: '#ef4444', borderWidth: 1, borderDash: [4,3], pointRadius: 0, fill: false, order: 2 },
    { label: '-2 SD', data: refs.map(r => r.sd_minus2), borderColor: '#f59e0b', borderWidth: 1.5, pointRadius: 0, fill: false, order: 2 },
    { label: 'Median', data: refs.map(r => r.median),   borderColor: color,     borderWidth: 2,   pointRadius: 0, pointStyle, backgroundColor: color, fill: false, order: 2 },
    { label: '+2 SD', data: refs.map(r => r.sd_plus2), borderColor: '#22c55e', borderWidth: 1.5, pointRadius: 0, fill: false, order: 2 },
    { label: '+3 SD', data: refs.map(r => r.sd_plus3), borderColor: '#ef4444', borderWidth: 1, borderDash: [4,3], pointRadius: 0, fill: false, order: 2 },
  ];

  if (childMeasurements && childName) {
    const childDataPoints = labels.map(usia => {
      const m = childMeasurements.find(meas => Math.round(meas.usia_bulan) === usia);
      return m ? (isWeight ? m.berat_badan : m.tinggi_badan) : null;
    });
    datasets[2].pointRadius = 0;
    datasets.push({
      label: childName,
      data: childDataPoints,
      borderColor: '#0f172a',
      backgroundColor: '#0f172a',
      borderWidth: 2.5,
      pointRadius: 6,
      pointHoverRadius: 8,
      pointStyle: pointStyle,
      fill: false,
      spanGaps: true,
      order: 1
    });
  }

  return { labels, datasets };
};

// ─── Tipe Data ────────────────────────────────────────────────
interface Measurement {
  id: number; child_id: number; nama_anak: string; tanggal_lahir: string;
  jenis_kelamin: string; tanggal_kunjungan: string; usia_bulan: number;
  usia_teks: string; berat_badan: number; tinggi_badan: number; catatan?: string;
  status_kesehatan?: string;
}
interface Child { id: number; nama_anak: string; }

const EMPTY = { child_id: '', tanggal_kunjungan: '', berat_badan: '', tinggi_badan: '', catatan: '', status_kesehatan_tipe: '', status_kesehatan_lainnya: '' };

// ─── Field Wrapper ────────────────────────────────────────────
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  const parts = dateStr.substring(0, 10).split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
};

const Field = ({ label, children: fc }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: '14px' }}>
    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>
      {label}
    </label>
    {fc}
  </div>
);

// ─── Konfigurasi WebSocket Server ────────────────────────────
const WS_URL        = process.env.NEXT_PUBLIC_WS ?? 'ws://localhost:5000/ws';
const TOPIC_BERAT     = 'abcd/bb';
const TOPIC_TINGGI    = 'abcd/tb';
const TOPIC_IDCARD    = 'abcd/idcard';
const TOPIC_CHILDNAME = 'abcd/childname';

// ─── Notifikasi RFID ─────────────────────────────────────────
interface RfidNotif {
  type: 'found' | 'not_found';
  uid: string;
  childName?: string;
  childId?: number;
}

// ─── Hook: WebSocket untuk BB, TB & RFID ─────────────────────
function useScaleWS(
  enabled: boolean,
  onRfidFound: (childId: number, childName: string, uid: string) => void,
  onRfidNotFound: (uid: string) => void,
  sendChildNameFn: (name: string) => void
) {
  const [bb, setBb] = useState<string>('');
  const [tb, setTb] = useState<string>('');
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Expose send function for childname broadcast
  const sendChildName = useRef<(name: string) => void>(() => {});

  useEffect(() => {
    if (!enabled) {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      setWsStatus('disconnected');
      setBb(''); setTb('');
      return;
    }

    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      setWsStatus('connecting');

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      // Expose send function
      sendChildName.current = (name: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(`${TOPIC_CHILDNAME}|${name}`);
        }
      };

      ws.onopen = () => {
        if (destroyed) { ws.close(); return; }
        setWsStatus('connected');
        ws.send(JSON.stringify({ action: 'subscribe', topic: TOPIC_BERAT }));
        ws.send(JSON.stringify({ action: 'subscribe', topic: TOPIC_TINGGI }));
        ws.send(JSON.stringify({ action: 'subscribe', topic: TOPIC_IDCARD }));
      };

      ws.onmessage = async (event) => {
        if (destroyed) return;
        const raw: string = typeof event.data === 'string' ? event.data : '';

        // ── Format 1: "topic|value"
        if (raw.includes('|')) {
          const sepIdx = raw.indexOf('|');
          const topic  = raw.substring(0, sepIdx).trim();
          const value  = raw.substring(sepIdx + 1).trim();

          if (topic === TOPIC_BERAT) {
            const val = parseFloat(value);
            if (!isNaN(val)) setBb(val.toFixed(2));
          } else if (topic === TOPIC_TINGGI) {
            const val = parseFloat(value);
            if (!isNaN(val)) setTb(val.toFixed(1));
          } else if (topic === TOPIC_IDCARD) {
            // ── RFID: lookup anak berdasarkan UID ──────────
            const uid = value.toUpperCase();
            try {
              const res = await api.get(`/children/by-rfid/${uid}`);
              const child = res.data.data;
              onRfidFound(child.id, child.nama_anak, uid);
              // Kirim nama anak balik ke OLED via WS
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(`${TOPIC_CHILDNAME}|${child.nama_anak}`);
              }
            } catch {
              onRfidNotFound(uid);
              // Beritahu OLED kartu tidak dikenal
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(`${TOPIC_CHILDNAME}|Tidak Terdaftar`);
              }
            }
          }
          return;
        }

        // ── Format 2: JSON {"topic":"...", "payload":...}
        try {
          const msg = JSON.parse(raw);
          const topic   = msg.topic   ?? '';
          const payload = msg.payload ?? msg.value ?? null;
          if (payload === null) return;

          if (topic === TOPIC_BERAT) {
            const val = parseFloat(String(payload));
            if (!isNaN(val)) setBb(val.toFixed(2));
          } else if (topic === TOPIC_TINGGI) {
            const val = parseFloat(String(payload));
            if (!isNaN(val)) setTb(val.toFixed(1));
          } else if (topic === TOPIC_IDCARD) {
            const uid = String(payload).toUpperCase();
            try {
              const res = await api.get(`/children/by-rfid/${uid}`);
              const child = res.data.data;
              onRfidFound(child.id, child.nama_anak, uid);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(`${TOPIC_CHILDNAME}|${child.nama_anak}`);
              }
            } catch {
              onRfidNotFound(uid);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(`${TOPIC_CHILDNAME}|Tidak Terdaftar`);
              }
            }
          }
        } catch {
          // bukan JSON, abaikan
        }
      };

      ws.onerror = () => { if (!destroyed) setWsStatus('connecting'); };
      ws.onclose = () => {
        if (destroyed) return;
        setWsStatus('connecting');
        reconnectRef.current = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      destroyed = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, [enabled]);

  return { bb, tb, wsStatus };
}

// ─── Komponen Utama ───────────────────────────────────────────
export default function DataPengukuranPage() {
  const router = useRouter();

  // useEffect(() => {
  //   const userStr = localStorage.getItem('penting_user');
  //   if (userStr) {
  //     try {
  //       const user = JSON.parse(userStr);
  //       if (user.role === 'admin') {
  //         router.replace('/dashboard');
  //       }
  //     } catch (e) {}
  //   }
  // }, [router]);

  const [data, setData]         = useState<Measurement[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<'add' | 'edit' | null>(null);
  const [form, setForm]         = useState({ ...EMPTY });
  const [editId, setEditId]     = useState<number | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [detailModal, setDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<{ child: any, measurements: any[], bbRef: GrowthRef[], tbRef: GrowthRef[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const openDetail = async (childId: number) => {
    setDetailModal(true);
    setDetailLoading(true);
    setDetailError('');
    setDetailData(null);
    try {
      const [childRes, measRes] = await Promise.all([
        api.get(`/children/${childId}`),
        api.get(`/measurements/child/${childId}`)
      ]);
      const child = childRes.data.data;
      const measurements = measRes.data.data || [];
      const genderStr = (child.jenis_kelamin === 'L' || child.jenis_kelamin === 'Laki-laki') ? 'Laki-laki' : 'Perempuan';

      const [bbRes, tbRes] = await Promise.all([
        api.get(`/dashboard/growth-chart?jenis_kelamin=${genderStr}&tipe=BB_U`),
        api.get(`/dashboard/growth-chart?jenis_kelamin=${genderStr}&tipe=TB_U`)
      ]);

      setDetailData({
        child,
        measurements,
        bbRef: bbRes.data.data.referensi || [],
        tbRef: tbRes.data.data.referensi || []
      });
    } catch (err: any) {
      setDetailError(err.response?.data?.message || 'Gagal mengambil data detail anak.');
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Mode Auto/Manual ─────────────────────────────────────────
  const [inputMode, setInputMode] = useState<'manual' | 'auto'>('manual');
  const isAuto = inputMode === 'auto' && modal !== null;

  // ── RFID Notification ────────────────────────────────────────
  const [rfidNotif, setRfidNotif] = useState<RfidNotif | null>(null);
  const rfidTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRfidFound = (childId: number, childName: string, uid: string) => {
    // Auto-pilih anak di form
    setForm(prev => ({ ...prev, child_id: String(childId) }));
    setRfidNotif({ type: 'found', uid, childName, childId });
    if (rfidTimerRef.current) clearTimeout(rfidTimerRef.current);
    rfidTimerRef.current = setTimeout(() => setRfidNotif(null), 6000);
  };

  const handleRfidNotFound = (uid: string) => {
    setRfidNotif({ type: 'not_found', uid });
    if (rfidTimerRef.current) clearTimeout(rfidTimerRef.current);
    rfidTimerRef.current = setTimeout(() => setRfidNotif(null), 10000);
  };

  // ── WebSocket ────────────────────────────────────────────────
  const { bb: wsBb, tb: wsTb, wsStatus } = useScaleWS(
    isAuto,
    handleRfidFound,
    handleRfidNotFound,
    () => {}
  );

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

  // Cleanup RFID timer
  useEffect(() => () => { if (rfidTimerRef.current) clearTimeout(rfidTimerRef.current); }, []);

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
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    setForm({ ...EMPTY, tanggal_kunjungan: todayStr });
    setEditId(null);
    setError('');
    setInputMode('manual');
    setRfidNotif(null);
    setModal('add');
  };

  const openEdit = (m: Measurement) => {
    const isLainnya = m.status_kesehatan && !['Sehat', 'Sedang Sakit'].includes(m.status_kesehatan);
    setForm({
      child_id: String(m.child_id),
      tanggal_kunjungan: m.tanggal_kunjungan?.substring(0, 10) || '',
      berat_badan: String(m.berat_badan),
      tinggi_badan: String(m.tinggi_badan),
      catatan: m.catatan || '',
      status_kesehatan_tipe: isLainnya ? 'Lainnya' : (m.status_kesehatan || ''),
      status_kesehatan_lainnya: isLainnya ? (m.status_kesehatan || '') : '',
    });
    setEditId(m.id);
    setError('');
    setInputMode('manual');
    setRfidNotif(null);
    setModal('edit');
  };

  const closeModal = () => {
    setModal(null);
    setInputMode('manual');
    setRfidNotif(null);
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
        status_kesehatan:  form.status_kesehatan_tipe === 'Lainnya' ? form.status_kesehatan_lainnya : form.status_kesehatan_tipe || null,
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

  // ─── Status WS badge ─────────────────────────────────────────
  const wsBadge = () => {
    let statusKey = wsStatus as string;
    if (wsStatus === 'connected' && (!wsBb || !wsTb)) statusKey = 'waiting_data';

    const map: Record<string, { bg: string; color: string; dot: string; text: string }> = {
      connecting:   { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b', text: 'Menyambungkan ke server...' },
      waiting_data: { bg: '#e0f2fe', color: '#0369a1', dot: '#38bdf8', text: 'Terhubung — Menunggu timbangan & RFID...' },
      connected:    { bg: '#d1fae5', color: '#065f46', dot: '#10b981', text: 'Timbangan terhubung — Menerima data' },
      disconnected: { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444', text: 'Server tidak terhubung' },
    };
    const cm = map[statusKey];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px',
        background: cm.bg, color: cm.color, padding: '8px 12px',
        borderRadius: '8px', fontSize: '0.8rem', fontWeight: 500, marginBottom: '8px' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: cm.dot,
          display: 'inline-block',
          ...(statusKey !== 'connected' && statusKey !== 'disconnected' ? { animation: 'pulse 1.2s infinite' } : {}) }} />
        📡 Status Alat: {cm.text}
      </div>
    );
  };

  // ─── RFID Notification Banner ─────────────────────────────────
  const rfidBanner = () => {
    if (!rfidNotif) return null;

    if (rfidNotif.type === 'found') {
      return (
        <div style={{
          background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '10px',
          padding: '10px 14px', marginBottom: '10px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', gap: '8px',
          animation: 'slideIn 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46' }}>
            <span style={{ fontSize: '1.2rem' }}>🎫</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                Kartu teridentifikasi!
              </div>
              <div style={{ fontSize: '0.8rem', color: '#047857' }}>
                <strong>{rfidNotif.childName}</strong> otomatis dipilih · UID: {rfidNotif.uid}
              </div>
            </div>
          </div>
          <button onClick={() => setRfidNotif(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46', fontSize: '1rem', padding: 0 }}>✕</button>
        </div>
      );
    }

    // not_found
    return (
      <div style={{
        background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px',
        padding: '10px 14px', marginBottom: '10px', animation: 'slideIn 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ color: '#92400e' }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '4px' }}>
              ⚠️ Kartu RFID tidak terdaftar
            </div>
            <div style={{ fontSize: '0.8rem', marginBottom: '8px' }}>
              UID: <code style={{ background: '#fde68a', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>
                {rfidNotif.uid}
              </code>
            </div>
            <button
              onClick={() => router.push(`/data-anak?rfid_uid=${rfidNotif.uid}`)}
              style={{
                background: '#d97706', color: '#fff', border: 'none', borderRadius: '7px',
                padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px'
              }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Daftarkan Anak dengan Kartu Ini
            </button>
          </div>
          <button onClick={() => setRfidNotif(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: '1rem', padding: 0 }}>✕</button>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="page-content" style={{ padding: '16px 24px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes slideIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes data-flash {
          0%   { box-shadow: 0 0 0 0 rgba(37,99,235,.4); }
          70%  { box-shadow: 0 0 0 6px rgba(37,99,235,0); }
          100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
        }
        .mode-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 8px 16px; border-radius: 8px; font-size: 0.83rem;
          font-weight: 600; border: 1.5px solid transparent;
          cursor: pointer; transition: all .18s; font-family: inherit;
        }
        .mode-btn.active-manual { background: #1e293b; color: #fff; border-color: #1e293b; }
        .mode-btn.active-auto   { background: #2563eb; color: #fff; border-color: #2563eb; box-shadow: 0 3px 10px rgba(37,99,235,0.25); }
        .mode-btn.inactive      { background: #f8fafb; color: #64748b; border-color: #e8edf2; }
        .mode-btn.inactive:hover { background: #f1f5f9; color: #374151; }
        .auto-field input[type="number"] {
          background: #eff6ff !important; color: #1d4ed8 !important;
          font-weight: 700 !important; border-color: #93c5fd !important; cursor: not-allowed;
        }
        .auto-field input.has-data { animation: data-flash 0.6s ease; }
      `}</style>

      <div style={{ marginBottom: '12px', flexShrink: 0 }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>Data Pengukuran</h1>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '1px' }}>Riwayat pengukuran berat dan tinggi badan anak</p>
      </div>

      <div className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 20px' }}>
        <div className="toolbar-mobile" style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
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

        <div className="table-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto' }}>
          <table className="table-penting" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                <th>Nama Anak</th>
                <th>Usia</th>
                <th>Jenis Kelamin</th>
                <th>Berat Badan</th>
                <th>Tinggi Badan</th>
                <th>Tgl Kunjungan</th>
                <th>Status Kesehatan</th>
                <th style={{ textAlign: 'center', width: '120px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Belum ada data pengukuran.</td></tr>
              ) : data.map((m, i) => (
                <tr key={m.id}>
                  <td style={{ textAlign: 'center' }}>{i + 1}</td>
                  <td>
                    <div 
                      className="name-detail-link"
                      style={{ fontWeight: 600, cursor: 'pointer', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => openDetail(m.child_id)}
                      title="Klik untuk lihat detail lengkap"
                    >
                      <span>{m.nama_anak}</span>
                      
                    </div>
                  </td>
                  <td><span className="badge badge-normal">{m.usia_teks}</span></td>
                  <td>
                    <span className={`badge ${m.jenis_kelamin === 'Laki-laki' ? 'badge-normal' : 'badge-lebih'}`}>
                      {m.jenis_kelamin === 'Laki-laki' ? '♂' : '♀'} {m.jenis_kelamin}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{m.berat_badan} kg</td>
                  <td style={{ fontWeight: 600 }}>{m.tinggi_badan} cm</td>
                  <td>{formatDate(m.tanggal_kunjungan)}</td>
                  <td>{m.status_kesehatan || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        onClick={() => openEdit(m)}>Edit</button>
                      <button className="btn-danger" style={{ padding: '5px 10px', fontSize: '0.75rem', whiteSpace: 'nowrap' }} onClick={() => handleDelete(m.id)}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Modal Add / Edit ──────────────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>

            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>
              {modal === 'add' ? '+ Tambah Pengukuran' : 'Edit Pengukuran'}
            </h3>

            {/* ── Toggle Auto / Manual ── */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px',
              padding: '10px', background: '#f8fafc', borderRadius: '12px',
              border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b',
                alignSelf: 'center', marginRight: 4 }}>Mode Input:</span>
              <button className={`mode-btn ${inputMode === 'manual' ? 'active-manual' : 'inactive'}`}
                onClick={() => setInputMode('manual')}> Manual</button>
              <button className={`mode-btn ${inputMode === 'auto' ? 'active-auto' : 'inactive'}`}
                onClick={() => setInputMode('auto')}> Auto (IoT)</button>
            </div>

            {/* Status WS */}
            {isAuto && wsBadge()}

            {/* ── RFID Banner ── */}
            {isAuto && rfidBanner()}

            {/* Error */}
            {error && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px',
                borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px' }}>{error}</div>
            )}

            {/* Nama Anak */}
            <Field label="Nama Anak *">
              <select className="input-penting" value={form.child_id}
                onChange={e => setForm({ ...form, child_id: e.target.value })}
                style={isAuto && rfidNotif?.type === 'found' ? {
                  borderColor: '#10b981', background: '#f0fdf4', fontWeight: 700
                } : {}}>
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
              {isAuto && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: '8px', padding: '9px 12px', fontSize: '0.8rem',
                  color: '#15803d', marginBottom: '10px', display: 'flex',
                  alignItems: 'center', gap: '6px' }}>
                  🔄 Data BB & TB diisi <strong>otomatis</strong> dari timbangan via WebSocket.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label={`Berat Badan (kg) *${isAuto ? ' 📡' : ''}`}>
                  <input
                    className={`input-penting${isAuto && form.berat_badan ? ' has-data' : ''}`}
                    type="number" step="0.01" min="0.01" max="200"
                    placeholder={isAuto ? 'Menunggu data...' : 'Contoh: 7.50'}
                    value={form.berat_badan}
                    readOnly={isAuto}
                    onChange={isAuto ? undefined : e => setForm({ ...form, berat_badan: e.target.value })}
                  />
                </Field>
                <Field label={`Tinggi Badan (cm) *${isAuto ? ' 📡' : ''}`}>
                  <input
                    className={`input-penting${isAuto && form.tinggi_badan ? ' has-data' : ''}`}
                    type="number" step="0.1" min="0.1" max="250"
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

            {/* Status Kesehatan */}
            <Field label="Status Kesehatan Anak">
              <select className="input-penting" value={form.status_kesehatan_tipe}
                onChange={e => setForm({ ...form, status_kesehatan_tipe: e.target.value })}>
                <option value="">-- Pilih Status --</option>
                <option value="Sehat">Sehat</option>
                <option value="Sedang Sakit">Sedang Sakit</option>
                <option value="Lainnya">Lainnya (Ketik Sendiri)</option>
              </select>
              {form.status_kesehatan_tipe === 'Lainnya' && (
                <input className="input-penting" style={{ marginTop: '8px' }} type="text"
                  placeholder="Ketik status kesehatan..."
                  value={form.status_kesehatan_lainnya}
                  onChange={e => setForm({ ...form, status_kesehatan_lainnya: e.target.value })} />
              )}
            </Field>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px',
              padding: '10px 12px', fontSize: '0.8rem', color: '#1d4ed8', marginBottom: '16px' }}>
              💡 Status gizi akan <strong>dihitung otomatis</strong> setelah data pengukuran disimpan.
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={closeModal}>Batal</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Pengukuran'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Detail Anak ─────────────────────────────────── */}
      {detailModal && (
        <div className="modal-overlay" onClick={() => setDetailModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: '95%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Detail & Riwayat Anak</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Informasi lengkap dan riwayat pertumbuhan anak</p>
              </div>
              <button onClick={() => setDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Memuat data anak...</div>
            ) : detailError ? (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px' }}>{detailError}</div>
            ) : detailData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Profil Anak Lengkap */}
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>NAMA ANAK</p>
                      <p style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 600, margin: 0 }}>{detailData.child.nama_anak}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>NIK</p>
                      <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500, fontFamily: 'monospace', margin: 0 }}>{detailData.child.nik}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>JENIS KELAMIN</p>
                      <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500, margin: 0 }}>
                        <span className={`badge ${detailData.child.jenis_kelamin === 'Laki-laki' ? 'badge-normal' : 'badge-lebih'}`} style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                          {detailData.child.jenis_kelamin === 'Laki-laki' ? '♂' : '♀'} {detailData.child.jenis_kelamin}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>TANGGAL LAHIR</p>
                      <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500, margin: 0 }}>
                        {detailData.child.tanggal_lahir ? new Date(detailData.child.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>ORANG TUA / WALI</p>
                      <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500, margin: 0 }}>{detailData.child.nama_orang_tua || '-'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>WILAYAH</p>
                      <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500, margin: 0 }}>{detailData.child.wilayah || '-'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>NO. TELEPON</p>
                      <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500, margin: 0 }}>{detailData.child.nomor_telepon || '-'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>RFID UID</p>
                      <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500, margin: 0 }}>
                        {detailData.child.rfid_uid ? (
                          <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>🃏 {detailData.child.rfid_uid}</span>
                        ) : '—'}
                      </p>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>ALAMAT</p>
                      <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500, margin: 0 }}>{detailData.child.alamat || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Grafik Pertumbuhan */}
                {detailData.measurements.length > 0 && (
                  <div style={{ border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>Grafik Pertumbuhan</h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', minHeight: '380px' }}>
                      {/* BB */}
                      <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e8edf2', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <h3 style={{
                          fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px',
                          paddingBottom: '8px', borderBottom: '1px solid #e8edf2', color: '#0f172a',
                          display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0
                        }}>
                          <span style={{ color: '#2563eb', display: 'flex' }}><IconChartLine /></span>
                          Berat Badan (BB/U) - {detailData.child.nama_anak}
                        </h3>
                        <div style={{ flex: 1, position: 'relative', minHeight: '300px' }}>
                          {detailData.bbRef && detailData.bbRef.length > 0 ? (
                            <Line
                              data={makeChart(
                                detailData.bbRef,
                                detailData.child.jenis_kelamin === 'L' || detailData.child.jenis_kelamin === 'Laki-laki' ? '#3b82f6' : '#ec4899',
                                true,
                                detailData.measurements,
                                detailData.child.nama_anak
                              )}
                              options={chartOptions('Berat Badan (kg)')}
                            />
                          ) : (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                              Data referensi belum tersedia.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* TB */}
                      <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e8edf2', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <h3 style={{
                          fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px',
                          paddingBottom: '8px', borderBottom: '1px solid #e8edf2', color: '#0f172a',
                          display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0
                        }}>
                          <span style={{ color: '#2563eb', display: 'flex' }}><IconChartLine /></span>
                          Tinggi Badan (TB/U) - {detailData.child.nama_anak}
                        </h3>
                        <div style={{ flex: 1, position: 'relative', minHeight: '300px' }}>
                          {detailData.tbRef && detailData.tbRef.length > 0 ? (
                            <Line
                              data={makeChart(
                                detailData.tbRef,
                                detailData.child.jenis_kelamin === 'L' || detailData.child.jenis_kelamin === 'Laki-laki' ? '#3b82f6' : '#ec4899',
                                false,
                                detailData.measurements,
                                detailData.child.nama_anak
                              )}
                              options={chartOptions('Tinggi Badan (cm)')}
                            />
                          ) : (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                              Data referensi belum tersedia.
                            </div>
                          )}
                        </div>
                      </div>
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
                              <td style={{ padding: '12px 20px' }}>{formatDate(m.tanggal_kunjungan)}</td>
                              <td style={{ padding: '12px 20px' }}>{m.usia_bulan} bln</td>
                              <td style={{ padding: '12px 20px', fontWeight: 500, color: '#3b82f6' }}>{m.berat_badan}</td>
                              <td style={{ padding: '12px 20px', fontWeight: 500, color: '#10b981' }}>{m.tinggi_badan}</td>
                              <td style={{ padding: '12px 20px', fontSize: '0.8rem', color: '#64748b' }}>{m.status_kesehatan || '-'}</td>
                              <td style={{ padding: '12px 20px' }}>
                                {m.status_bb_u || m.status_bb_umur ? (
                                  <span className={`badge ${badgeStatus(m.status_bb_u || m.status_bb_umur)}`} style={{ padding: '4px 10px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                    {m.status_bb_u || m.status_bb_umur}
                                  </span>
                                ) : '-'}
                              </td>
                              <td style={{ padding: '12px 20px' }}>
                                {m.status_tb_u || m.status_tb_umur ? (
                                  <span className={`badge ${badgeStatus(m.status_tb_u || m.status_tb_umur)}`} style={{ padding: '4px 10px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                    {m.status_tb_u || m.status_tb_umur}
                                  </span>
                                ) : '-'}
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
