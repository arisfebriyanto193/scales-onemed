'use client';
import { useEffect, useState } from 'react';
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
}

export default function DashboardPage() {
  const [stats, setStats]   = useState<Stats | null>(null);
  const [bbRef, setBbRef]   = useState<GrowthRef[]>([]);
  const [tbRef, setTbRef]   = useState<GrowthRef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/growth-chart?jenis_kelamin=Laki-laki&tipe=BB_U'),
      api.get('/dashboard/growth-chart?jenis_kelamin=Laki-laki&tipe=TB_U'),
    ]).then(([s, bb, tb]) => {
      setStats(s.data.data);
      setBbRef(bb.data.data.referensi || []);
      setTbRef(tb.data.data.referensi || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const chartOptions = (label: string) => ({
    responsive: true,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 11 } } },
      title: { display: false },
    },
    scales: {
      x: { grid: { color: '#f1f5f9' }, title: { display: true, text: 'Usia (bulan)' } },
      y: { grid: { color: '#f1f5f9' }, title: { display: true, text: label } },
    },
  });

  const makeChart = (refs: GrowthRef[], color: string) => {
    const labels = refs.map(r => r.usia_bulan);
    return {
      labels,
      datasets: [
        { label: '-3 SD', data: refs.map(r => r.sd_minus3), borderColor: '#ef4444', borderWidth: 1, borderDash: [4,3], pointRadius: 0, fill: false },
        { label: '-2 SD', data: refs.map(r => r.sd_minus2), borderColor: '#f59e0b', borderWidth: 1.5, pointRadius: 0, fill: false },
        { label: 'Median', data: refs.map(r => r.median),   borderColor: color,     borderWidth: 2,   pointRadius: 0, fill: false },
        { label: '+2 SD', data: refs.map(r => r.sd_plus2), borderColor: '#22c55e', borderWidth: 1.5, pointRadius: 0, fill: false },
      ],
    };
  };

  const statCards = [
    { label: 'Total Anak', value: stats?.total_anak ?? '-', icon: <IconBaby />, color: '#ffffff', iconBg: '#eff6ff', iconColor: '#2563eb' },
    { label: 'Total Pengukuran', value: stats?.total_pengukuran ?? '-', icon: <IconRuler />, color: '#ffffff', iconBg: '#f5f3ff', iconColor: '#7c3aed' },
    { label: 'Terindikasi Stunting', value: stats?.total_stunting ?? '-', icon: <IconWarning />, color: '#ffffff', iconBg: '#fef2f2', iconColor: '#dc2626' },
    { label: 'Gizi Baik/Normal', value: stats?.total_normal ?? '-', icon: <IconCheck />, color: '#ffffff', iconBg: '#f0fdf4', iconColor: '#16a34a' },
  ];

  return (
    <div className="page-content" style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '20px', color: '#1e293b' }}>
        Grafik Pertumbuhan Bayi
      </h1>

      {/* Stat Cards */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {statCards.map(c => (
          <div key={c.label} className="stat-card" style={{ background: c.color, border: '1px solid #e8edf2' }}>
            <div className="stat-icon" style={{ background: c.iconBg, color: c.iconColor }}>{c.icon}</div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>{c.label}</p>
              <p style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>
                {loading ? '...' : c.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Growth Charts */}
      <div className="chart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* BB */}
        <div className="card">
          <h3 style={{
            fontSize: '0.95rem', fontWeight: 700, marginBottom: '16px',
            paddingBottom: '12px', borderBottom: '1px solid #e8edf2', color: '#0f172a',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span style={{ color: '#2563eb', display: 'flex' }}><IconChartLine /></span>
            Berat Badan Bayi
          </h3>
          {loading ? (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              Memuat grafik...
            </div>
          ) : bbRef.length > 0 ? (
            <Line data={makeChart(bbRef, '#ec4899')} options={chartOptions('Berat Badan (kg)')} height={220} />
          ) : (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              Data referensi belum tersedia. Jalankan migrasi database terlebih dahulu.
            </div>
          )}
        </div>

        {/* TB */}
        <div className="card">
          <h3 style={{
            fontSize: '0.95rem', fontWeight: 700, marginBottom: '16px',
            paddingBottom: '12px', borderBottom: '1px solid #e8edf2', color: '#0f172a',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span style={{ color: '#2563eb', display: 'flex' }}><IconChartLine /></span>
            Tinggi Badan Bayi
          </h3>
          {loading ? (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              Memuat grafik...
            </div>
          ) : tbRef.length > 0 ? (
            <Line data={makeChart(tbRef, '#3b82f6')} options={chartOptions('Tinggi Badan (cm)')} height={220} />
          ) : (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              Data referensi belum tersedia.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
