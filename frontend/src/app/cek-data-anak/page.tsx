'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Line } from 'react-chartjs-2';
import api from '@/lib/api';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';
import { 
  Search, User, CreditCard, Users, Calendar, Activity, 
  ArrowLeft, AlertCircle, Baby 
} from 'lucide-react';

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
        tension: 0.4,
        pointBackgroundColor: '#3b82f6',
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Tinggi Badan (cm)',
        data: data?.measurements.map(m => m.tinggi_badan) || [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        yAxisID: 'y1',
        tension: 0.4,
        pointBackgroundColor: '#10b981',
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { family: "'Plus Jakarta Sans', 'Inter', sans-serif", size: 13 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { family: "'Plus Jakarta Sans', 'Inter', sans-serif", size: 13 },
        bodyFont: { family: "'Plus Jakarta Sans', 'Inter', sans-serif", size: 13 },
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: "'Plus Jakarta Sans', 'Inter', sans-serif" } }
      },
      y: { 
        type: 'linear' as const, 
        display: true, 
        position: 'left' as const, 
        title: { display: true, text: 'Berat Badan (kg)', font: { family: "'Plus Jakarta Sans', 'Inter', sans-serif", size: 12, weight: 'bold' as const } },
        grid: { color: '#f1f5f9' },
        border: { display: false }
      },
      y1: { 
        type: 'linear' as const, 
        display: true, 
        position: 'right' as const, 
        grid: { drawOnChartArea: false }, 
        title: { display: true, text: 'Tinggi Badan (cm)', font: { family: "'Plus Jakarta Sans', 'Inter', sans-serif", size: 12, weight: 'bold' as const } },
        border: { display: false }
      },
    }
  };
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f0fdf4 100%)',
      fontFamily: 'inherit',
      color: 'var(--text-main)',
      paddingBottom: '80px',
      position: 'relative',
      zIndex: 0
    }}>
      <div style={{
        position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%',
        background: 'rgba(96, 165, 250, 0.1)', filter: 'blur(100px)', borderRadius: '50%', zIndex: -1, pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', top: '20%', right: '-10%', width: '40%', height: '40%',
        background: 'rgba(52, 211, 153, 0.1)', filter: 'blur(100px)', borderRadius: '50%', zIndex: -1, pointerEvents: 'none'
      }} />

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>       
        {/* Header */}
        <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              height: '52px', width: '52px', borderRadius: '14px', background: '#fff',
              boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px'
            }}>
              <img src="/logo.jpeg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)', letterSpacing: '-0.5px' }}>PENTING</h1>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, margin: 0, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Sistem Posyandu</p>
            </div>
          </div>
          <button onClick={() => router.push('/login')} className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '12px' }}>
            <ArrowLeft size={16} /> Kembali ke Login
          </button>
        </header>

        {/* Search Box */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(16px)',
          border: '1px solid #ffffff', borderRadius: '24px', padding: '40px',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05)', marginBottom: '40px'
        }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-heading)', letterSpacing: '-0.5px' }}>
            Pantau Pertumbuhan <span style={{ background: 'linear-gradient(to right, #2563eb, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Anak Anda</span>
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: '32px', maxWidth: '700px', lineHeight: 1.6 }}>
            Masukkan Nomor Induk Kependudukan (NIK) anak untuk melihat riwayat pertumbuhan, status gizi, dan grafik pengukuran Posyandu secara detail.
          </p>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', pointerEvents: 'none' }}>
                <CreditCard size={22} />
              </div>
              <input
                type="text"
                placeholder="Masukkan 16 digit NIK Anak..."
                value={nik}
                onChange={e => setNik(e.target.value.replace(/\D/g, ''))}
                maxLength={16}
                style={{
                  width: '100%', padding: '18px 20px 18px 50px', background: 'rgba(255, 255, 255, 0.6)',
                  border: '2px solid var(--border)', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 500,
                  outline: 'none', transition: 'all 0.2s', color: 'var(--text-main)'
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#fff'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'rgba(255, 255, 255, 0.6)'; }}
                required
              />
            </div>
            <button type="submit" disabled={loading || nik.length < 16} className="btn-primary" style={{
              padding: '0 32px', height: '64px', borderRadius: '16px', fontSize: '1.1rem', background: '#0f172a',
              boxShadow: '0 10px 25px -5px rgba(15,23,42,0.3)', transition: 'all 0.2s', border: 'none'
            }}>
              {loading ? (
                <div style={{ width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <Search size={20} /> Cari Data
                </>
              )}
            </button>
          </form>

          {error && (
            <div style={{
              marginTop: '24px', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca',
              color: '#b91c1c', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px',
              animation: 'fadeInUp 0.3s ease-out'
            }}>
              <AlertCircle size={20} color="#ef4444" />
              <span style={{ fontWeight: 500 }}>{error}</span>
            </div>
          )}
        </div>

        {/* Results */}
        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeInUp 0.5s ease-out forwards' }}>
            
            {/* Profil Anak Card */}
            <div className="card" style={{ padding: '32px', borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ padding: '10px', background: 'var(--primary-50)', color: 'var(--primary)', borderRadius: '12px' }}>
                  <Baby size={24} />
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Profil Anak</h3>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '24px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    <User size={16} /> <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>NAMA ANAK</span>
                  </div>
                  <p style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{data.child.nama_anak}</p>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    <CreditCard size={16} /> <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>NIK</span>
                  </div>
                  <p style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{data.child.nik}</p>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    <Users size={16} /> <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>NAMA ORANG TUA</span>
                  </div>
                  <p style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{data.child.nama_orang_tua}</p>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    <Calendar size={16} /> <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>TANGGAL LAHIR</span>
                  </div>
                  <p style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                    {new Date(data.child.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    <Activity size={16} /> <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>JENIS KELAMIN</span>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <span className="badge" style={{
                      background: data.child.jenis_kelamin === 'L' ? '#eff6ff' : '#fdf2f8',
                      color: data.child.jenis_kelamin === 'L' ? '#1d4ed8' : '#be185d',
                      border: `1px solid ${data.child.jenis_kelamin === 'L' ? '#bfdbfe' : '#fbcfe8'}`,
                      padding: '6px 12px', fontSize: '0.8rem'
                    }}>
                      {data.child.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grafik Pertumbuhan */}
            {data.measurements.length > 0 && (
              <div className="card" style={{ padding: '32px', borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                  <div style={{ padding: '10px', background: '#ecfdf5', color: '#10b981', borderRadius: '12px' }}>
                    <Activity size={24} />
                  </div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Grafik Pertumbuhan</h3>
                </div>
                <div style={{ height: '400px', width: '100%' }}>
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>
            )}

            {/* Riwayat Pengukuran */}
            <div className="card" style={{ padding: 0, borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '32px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: '#f5f3ff', color: '#8b5cf6', borderRadius: '12px' }}>
                  <Calendar size={24} />
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Riwayat Pengukuran</h3>
              </div>
              
              {data.measurements.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                    <Activity size={40} color="#cbd5e1" />
                  </div>
                  <p style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-main)' }}>Belum ada riwayat</p>
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>Anak ini belum memiliki data pengukuran yang tercatat.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table-penting" style={{ border: 'none' }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th style={{ padding: '20px', fontSize: '0.8rem' }}>Tanggal</th>
                        <th style={{ padding: '20px', fontSize: '0.8rem' }}>Usia</th>
                        <th style={{ padding: '20px', fontSize: '0.8rem' }}>Berat Badan</th>
                        <th style={{ padding: '20px', fontSize: '0.8rem' }}>Tinggi Badan</th>
                        <th style={{ padding: '20px', fontSize: '0.8rem' }}>Status Kesehatan</th>
                        <th style={{ padding: '20px', fontSize: '0.8rem' }}>Status Gizi (BB/U)</th>
                        <th style={{ padding: '20px', fontSize: '0.8rem' }}>Status Tinggi (TB/U)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.measurements.map((m, i) => (
                        <tr key={i} style={{ transition: 'background 0.2s' }}>
                          <td style={{ padding: '20px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                            {new Date(m.tanggal_kunjungan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '20px', color: 'var(--text-muted)' }}>
                            {m.usia_bulan} bulan
                          </td>
                          <td style={{ padding: '20px' }}>
                            <span style={{ display: 'inline-flex', padding: '4px 12px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', border: '1px solid #bfdbfe' }}>
                              {m.berat_badan} kg
                            </span>
                          </td>
                          <td style={{ padding: '20px' }}>
                            <span style={{ display: 'inline-flex', padding: '4px 12px', background: '#ecfdf5', color: '#047857', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', border: '1px solid #a7f3d0' }}>
                              {m.tinggi_badan} cm
                            </span>
                          </td>
                          <td style={{ padding: '20px', color: 'var(--text-muted)' }}>
                            {m.status_kesehatan || '-'}
                          </td>
                          <td style={{ padding: '20px' }}>
                            <span className={`badge ${
                              m.status_bb_u?.includes('Kurang') || m.status_bb_u?.includes('Sangat') 
                                ? 'badge-buruk' 
                                : m.status_bb_u?.includes('Lebih') || m.status_bb_u?.includes('Risiko')
                                ? 'badge-kurang'
                                : 'badge-normal'
                            }`} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                              {m.status_bb_u || '-'}
                            </span>
                          </td>
                          <td style={{ padding: '20px' }}>
                            <span className={`badge ${
                              m.status_tb_u?.includes('Pendek') 
                                ? 'badge-buruk' 
                                : m.status_tb_u?.includes('Tinggi')
                                ? 'badge-kurang'
                                : 'badge-normal'
                            }`} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
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
        )}

      </div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
