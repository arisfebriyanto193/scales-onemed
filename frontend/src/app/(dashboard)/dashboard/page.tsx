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
  sd_plus3: number;
}

export default function DashboardPage() {
  const [stats, setStats]   = useState<Stats | null>(null);
  const [bbRef, setBbRef]   = useState<GrowthRef[]>([]);
  const [tbRef, setTbRef]   = useState<GrowthRef[]>([]);
  const [loading, setLoading] = useState(true);

  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [selectedChildNik, setSelectedChildNik] = useState<string>('');
  const [detailData, setDetailData] = useState<{ child: any, measurements: any[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/growth-chart?jenis_kelamin=Laki-laki&tipe=BB_U'),
      api.get('/dashboard/growth-chart?jenis_kelamin=Laki-laki&tipe=TB_U'),
      api.get('/children'),
    ]).then(([s, bb, tb, childrenRes]) => {
      setStats(s.data.data);
      setBbRef(bb.data.data.referensi || []);
      setTbRef(tb.data.data.referensi || []);
      setChildrenList(childrenRes.data.data || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedChildNik) {
      setDetailData(null);
      return;
    }
    setDetailLoading(true);
    setDetailError('');
    api.get(`/children/public/by-nik/${selectedChildNik}`)
      .then(res => setDetailData(res.data.data))
      .catch(err => setDetailError(err.response?.data?.message || 'Gagal memuat data anak.'))
      .finally(() => setDetailLoading(false));
  }, [selectedChildNik]);

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
        { label: '+3 SD', data: refs.map(r => r.sd_plus3), borderColor: '#ef4444', borderWidth: 1, borderDash: [4,3], pointRadius: 0, fill: false },
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

      {/* Detail Anak Section */}
      <div style={{ marginTop: '32px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>
          Data Pertumbuhan Anak
        </h2>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px', color: '#475569' }}>
            Pilih Anak untuk Melihat Detail:
          </label>
          <select 
            className="input-penting" 
            style={{ maxWidth: '400px', width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            value={selectedChildNik}
            onChange={(e) => setSelectedChildNik(e.target.value)}
          >
            <option value="">-- Pilih Anak --</option>
            {childrenList.map((c) => (
              <option key={c.nik} value={c.nik}>
                {c.nama_anak} ({c.nik})
              </option>
            ))}
          </select>
        </div>

        {selectedChildNik && (
          <div>
            {detailLoading ? (
              <div style={{ padding: '20px', color: '#64748b' }}>Memuat riwayat...</div>
            ) : detailError ? (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px' }}>{detailError}</div>
            ) : detailData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Profil Anak */}
                <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
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

                {/* Grafik Anak */}
                {detailData.measurements.length > 0 && (
                  <div style={{ border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px', background: '#ffffff' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>Grafik Pertumbuhan Anak</h4>
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
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#ffffff' }}>
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
        )}
      </div>
    </div>
  );
}
