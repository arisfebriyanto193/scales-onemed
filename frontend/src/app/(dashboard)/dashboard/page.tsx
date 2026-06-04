'use client';
import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import api from '@/lib/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

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
    { label: 'Total Anak', value: stats?.total_anak ?? '-', icon: '👶', color: '#eff6ff', iconBg: '#dbeafe' },
    { label: 'Total Pengukuran', value: stats?.total_pengukuran ?? '-', icon: '📏', color: '#f0fdf4', iconBg: '#dcfce7' },
    { label: 'Terindikasi Stunting', value: stats?.total_stunting ?? '-', icon: '⚠️', color: '#fff7ed', iconBg: '#fed7aa' },
    { label: 'Gizi Baik/Normal', value: stats?.total_normal ?? '-', icon: '✅', color: '#f0fdf4', iconBg: '#bbf7d0' },
  ];

  return (
    <div>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '20px', color: '#1e293b' }}>
        Grafik Pertumbuhan Bayi
      </h1>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {statCards.map(c => (
          <div key={c.label} className="stat-card" style={{ background: c.color }}>
            <div className="stat-icon" style={{ background: c.iconBg }}>{c.icon}</div>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* BB */}
        <div className="card">
          <h3 style={{
            fontSize: '0.95rem', fontWeight: 700, marginBottom: '16px',
            paddingBottom: '12px', borderBottom: '2px solid #f1f5f9', color: '#1e293b'
          }}>
            📊 Berat Badan Bayi
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
            paddingBottom: '12px', borderBottom: '2px solid #f1f5f9', color: '#1e293b'
          }}>
            📏 Tinggi Badan Bayi
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
