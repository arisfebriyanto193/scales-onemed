'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import api from '@/lib/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// SVG Icons
const IconBaby = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
  </svg>
);
const IconRuler = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
  </svg>
);
const IconWarning = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconCheck = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const IconChartLine = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

interface Stats {
  total_anak: number;
  total_pengukuran: number;
  total_stunting: number;
  total_normal: number;
}

interface GrowthRef {
  usia_bulan: number;
  sd_minus3: number;
  sd_minus2: number;
  median: number;
  sd_plus2: number;
  sd_plus3: number;
}

interface ChildDetail {
  id: number;
  nik: string;
  nama_anak: string;
  jenis_kelamin: string;
  status_keseluruhan: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats]   = useState<Stats | null>(null);
  const [bbRef, setBbRef]   = useState<GrowthRef[]>([]);
  const [tbRef, setTbRef]   = useState<GrowthRef[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for Gender Filter
  const [gender, setGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');

  // State for Modals
  const [modalType, setModalType] = useState<'stunting' | 'normal' | null>(null);
  const [modalData, setModalData] = useState<ChildDetail[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchDashboardData = (selectedGender: string) => {
    setLoading(true);
    Promise.all([
      api.get('/dashboard/stats'),
      api.get(`/dashboard/growth-chart?jenis_kelamin=${selectedGender}&tipe=BB_U`),
      api.get(`/dashboard/growth-chart?jenis_kelamin=${selectedGender}&tipe=TB_U`),
    ]).then(([s, bb, tb]) => {
      setStats(s.data.data);
      setBbRef(bb.data.data.referensi || []);
      setTbRef(tb.data.data.referensi || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData(gender);
  }, [gender]);

  const openModal = async (type: 'stunting' | 'normal') => {
    setModalType(type);
    setModalLoading(true);
    try {
      const res = await api.get(`/dashboard/stats/details?type=${type}`);
      setModalData(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const chartOptions = (label: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 10 }, usePointStyle: true, boxWidth: 6 } },
      title: { display: false },
    },
    scales: {
      x: { grid: { color: '#f1f5f9' /* Tailwind slate-100 */ }, title: { display: true, text: 'Usia (bulan)', font: { size: 10 } }, ticks: { font: { size: 9 } } },
      y: { grid: { color: '#f1f5f9' }, title: { display: true, text: label, font: { size: 10 } }, ticks: { font: { size: 9 } } },
    },
  });

  const makeChart = (refs: GrowthRef[], color: string, isWeight: boolean) => {
    const labels = refs.map(r => r.usia_bulan);
    const pointStyle = isWeight ? 'circle' : 'triangle';
    return {
      labels,
      datasets: [
        { label: '-3 SD', data: refs.map(r => r.sd_minus3), borderColor: '#ef4444' /* Tailwind red-500 */, borderWidth: 1, borderDash: [4,3], pointRadius: 0, fill: false },
        { label: '-2 SD', data: refs.map(r => r.sd_minus2), borderColor: '#f59e0b' /* Tailwind amber-500 */, borderWidth: 1.5, pointRadius: 0, fill: false },
        { label: 'Median', data: refs.map(r => r.median),   borderColor: color,     borderWidth: 2,   pointRadius: 3, pointStyle, backgroundColor: color, fill: false },
        { label: '+2 SD', data: refs.map(r => r.sd_plus2), borderColor: '#22c55e' /* Tailwind green-500 */, borderWidth: 1.5, pointRadius: 0, fill: false },
        { label: '+3 SD', data: refs.map(r => r.sd_plus3), borderColor: '#ef4444', borderWidth: 1, borderDash: [4,3], pointRadius: 0, fill: false },
      ],
    };
  };
  
  return (
    <div className="page-content" style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexShrink: 0 }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' /* Tailwind slate-800 */ }}>
          Dashboard Posyandu
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' /* Tailwind slate-600 */ }}>Filter Grafik:</label>
          <select 
            className="input-penting" 
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' /* Tailwind slate-300 */, background: '#fff', fontSize: '0.85rem' }}
            value={gender}
            onChange={(e) => setGender(e.target.value as 'Laki-laki' | 'Perempuan')}
          >
            <option value="Laki-laki">Laki-laki</option>
            <option value="Perempuan">Perempuan</option>
          </select>
        </div>
      </div>

      {/* Stat Cards - Reduced padding and text size */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '12px', flexShrink: 0 }}>
        
        {/* Total Anak */}
        <div onClick={() => router.push('/data-anak')} style={{ background: '#ffffff', border: '1px solid #e8edf2', padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px', background: '#eff6ff' /* Tailwind blue-50 */, color: '#2563eb' /* Tailwind blue-600 */ }}><IconBaby /></div>
          <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>Total Anak</p>
          <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{loading ? '...' : stats?.total_anak ?? '-'}</p>
        </div>

        {/* Total Pengukuran */}
        <div onClick={() => router.push('/data-pengukuran')} style={{ background: '#ffffff', border: '1px solid #e8edf2', padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px', background: '#f5f3ff' /* Tailwind violet-50 */, color: '#7c3aed' /* Tailwind violet-600 */ }}><IconRuler /></div>
          <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>Total Pengukuran</p>
          <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{loading ? '...' : stats?.total_pengukuran ?? '-'}</p>
        </div>

        {/* Terindikasi Stunting */}
        <div onClick={() => openModal('stunting')} style={{ background: '#ffffff', border: '1px solid #fecaca' /* Tailwind red-200 */, padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px', background: '#fef2f2' /* Tailwind red-50 */, color: '#dc2626' /* Tailwind red-600 */ }}><IconWarning /></div>
          <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>Terindikasi Stunting</p>
          <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{loading ? '...' : stats?.total_stunting ?? '-'}</p>
        </div>

        {/* Gizi Baik */}
        <div onClick={() => openModal('normal')} style={{ background: '#ffffff', border: '1px solid #bbf7d0' /* Tailwind green-200 */, padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px', background: '#f0fdf4' /* Tailwind green-50 */, color: '#16a34a' /* Tailwind green-600 */ }}><IconCheck /></div>
          <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>Gizi Baik/Normal</p>
          <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{loading ? '...' : stats?.total_normal ?? '-'}</p>
        </div>

      </div>

      {/* Growth Charts - Constrained height so they don't stretch */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1, minHeight: 0, paddingBottom: '8px' }}>
        {/* BB */}
        <div style={{ background: '#fff', borderRadius: '10px', padding: '12px', border: '1px solid #e8edf2', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h3 style={{
            fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px',
            paddingBottom: '8px', borderBottom: '1px solid #e8edf2', color: '#0f172a',
            display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0
          }}>
            <span style={{ color: '#2563eb', display: 'flex' }}><IconChartLine /></span>
            Berat Badan {gender === 'Laki-laki' ? 'Anak Laki-laki' : 'Anak Perempuan'} (BB/U)
          </h3>
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            {loading ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Memuat grafik...</div>
            ) : bbRef.length > 0 ? (
              <Line data={makeChart(bbRef, gender === 'Laki-laki' ? '#3b82f6' : '#ec4899', true)} options={chartOptions('Berat Badan (kg)')} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Data referensi belum tersedia.</div>
            )}
          </div>
        </div>

        {/* TB */}
        <div style={{ background: '#fff', borderRadius: '10px', padding: '12px', border: '1px solid #e8edf2', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h3 style={{
            fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px',
            paddingBottom: '8px', borderBottom: '1px solid #e8edf2', color: '#0f172a',
            display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0
          }}>
            <span style={{ color: '#2563eb', display: 'flex' }}><IconChartLine /></span>
            Tinggi Badan {gender === 'Laki-laki' ? 'Anak Laki-laki' : 'Anak Perempuan'} (TB/U)
          </h3>
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            {loading ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Memuat grafik...</div>
            ) : tbRef.length > 0 ? (
              <Line data={makeChart(tbRef, gender === 'Laki-laki' ? '#3b82f6' : '#ec4899', false)} options={chartOptions('Tinggi Badan (cm)')} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Data referensi belum tersedia.</div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Popup */}
      {modalType && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '600px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
            
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: modalType === 'stunting' ? '#fef2f2' : '#f0fdf4' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: modalType === 'stunting' ? '#b91c1c' : '#15803d', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {modalType === 'stunting' ? <IconWarning /> : <IconCheck />}
                Anak {modalType === 'stunting' ? 'Terindikasi Stunting' : 'Gizi Baik/Normal'}
              </h3>
              <button onClick={() => setModalType(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><IconClose /></button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              {modalLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Memuat data...</div>
              ) : modalData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Tidak ada data pada kategori ini.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '8px', color: '#475569' }}>NIK</th>
                      <th style={{ padding: '8px', color: '#475569' }}>Nama Anak</th>
                      <th style={{ padding: '8px', color: '#475569' }}>Jenis Kelamin</th>
                      <th style={{ padding: '8px', color: '#475569' }}>Status</th>
                      <th style={{ padding: '8px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalData.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 500 }}>{c.nik}</td>
                        <td style={{ padding: '10px 8px', fontWeight: 600, color: '#0f172a' }}>{c.nama_anak}</td>
                        <td style={{ padding: '10px 8px' }}>{c.jenis_kelamin}</td>
                        <td style={{ padding: '10px 8px' }}>
                          <span style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', background: modalType === 'stunting' ? '#fee2e2' : '#dcfce7', color: modalType === 'stunting' ? '#b91c1c' : '#15803d', fontWeight: 600 }}>
                            {c.status_keseluruhan}
                          </span>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          <button 
                            onClick={() => router.push(`/data-pengukuran?nik=${c.nik}`)}
                            style={{ background: '#eff6ff', color: '#2563eb', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Lihat
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
