'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Line } from 'react-chartjs-2';
import api from '@/lib/api';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function CekDataAnak() {
  const router = useRouter();
  const [nik, setNik] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<{ child: any, measurements: any[] } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nik) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await api.get(`/children/public/by-nik/${nik}`);
      setData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mencari data anak. Pastikan NIK benar.');
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: data?.measurements.map(m => {
      const date = new Date(m.tanggal_kunjungan);
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }) || [],
    datasets: [
      {
        label: 'Berat Badan (kg)',
        data: data?.measurements.map(m => m.berat_badan) || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        yAxisID: 'y',
        tension: 0.3,
      },
      {
        label: 'Tinggi Badan (cm)',
        data: data?.measurements.map(m => m.tinggi_badan) || [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        yAxisID: 'y1',
        tension: 0.3,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      y: { type: 'linear' as const, display: true, position: 'left' as const, title: { display: true, text: 'Berat (kg)' } },
      y1: { type: 'linear' as const, display: true, position: 'right' as const, grid: { drawOnChartArea: false }, title: { display: true, text: 'Tinggi (cm)' } },
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafb', padding: '40px 20px', fontFamily: 'inherit' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ height: '40px', borderRadius: '8px', overflow: 'hidden' }}>
              <img src="/loogo.jpeg" alt="Logo" style={{ height: '100%', width: 'auto', objectFit: 'contain' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>PENTING</h1>
              <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>SISTEM POSYANDU</p>
            </div>
          </div>
          <button onClick={() => router.push('/login')} className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem' }}>
            Kembali ke Login
          </button>
        </div>

        {/* Search Box */}
        <div style={{ background: '#fff', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>Cek Data Pertumbuhan Anak</h2>
          <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '0.95rem' }}>Masukkan Nomor Induk Kependudukan (NIK) anak untuk melihat riwayat pertumbuhan dan grafik pengukuran Posyandu.</p>
          
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Masukkan NIK Anak..."
              value={nik}
              onChange={e => setNik(e.target.value.replace(/\D/g, ''))} // Hanya angka
              maxLength={16}
              style={{ flex: 1, minWidth: '200px', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
              required
            />
            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0 24px', height: '48px', borderRadius: '10px', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {loading ? 'Mencari...' : 'Cari Data'}
            </button>
          </form>

          {error && (
            <div style={{ marginTop: '16px', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* Result */}
        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUp 0.4s ease-out' }}>
            {/* Profil Anak */}
            <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Profil Anak</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>NAMA ANAK</p>
                  <p style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>{data.child.nama_anak}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>NIK</p>
                  <p style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 500 }}>{data.child.nik}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>NAMA ORANG TUA</p>
                  <p style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 500 }}>{data.child.nama_orang_tua}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>TANGGAL LAHIR</p>
                  <p style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 500 }}>
                    {new Date(data.child.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>JENIS KELAMIN</p>
                  <p style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 500 }}>{data.child.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
                </div>
              </div>
            </div>

            {/* Grafik */}
            {data.measurements.length > 0 && (
              <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>Grafik Pertumbuhan</h3>
                <div style={{ height: '350px', position: 'relative' }}>
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>
            )}

            {/* Riwayat Pengukuran */}
            <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>Riwayat Pengukuran</h3>
              {data.measurements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b' }}>
                  Belum ada riwayat pengukuran untuk anak ini.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafb', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '12px', color: '#475569', fontWeight: 600 }}>Tanggal</th>
                      <th style={{ padding: '12px', color: '#475569', fontWeight: 600 }}>Usia</th>
                      <th style={{ padding: '12px', color: '#475569', fontWeight: 600 }}>BB (kg)</th>
                      <th style={{ padding: '12px', color: '#475569', fontWeight: 600 }}>TB (cm)</th>
                      <th style={{ padding: '12px', color: '#475569', fontWeight: 600 }}>Status BB/U</th>
                      <th style={{ padding: '12px', color: '#475569', fontWeight: 600 }}>Status TB/U</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.measurements.map((m, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px' }}>{new Date(m.tanggal_kunjungan).toLocaleDateString('id-ID')}</td>
                        <td style={{ padding: '12px' }}>{m.usia_bulan} bulan</td>
                        <td style={{ padding: '12px', fontWeight: 500, color: '#3b82f6' }}>{m.berat_badan}</td>
                        <td style={{ padding: '12px', fontWeight: 500, color: '#10b981' }}>{m.tinggi_badan}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                            background: m.status_bb_u?.includes('Kurang') || m.status_bb_u?.includes('Sangat') ? '#fee2e2' : '#dcfce7',
                            color: m.status_bb_u?.includes('Kurang') || m.status_bb_u?.includes('Sangat') ? '#b91c1c' : '#15803d'
                          }}>
                            {m.status_bb_u || '-'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
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
              )}
            </div>
          </div>
        )}

      </div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
