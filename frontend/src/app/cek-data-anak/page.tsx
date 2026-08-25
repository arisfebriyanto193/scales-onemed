'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Line } from 'react-chartjs-2';
import api from '@/lib/api';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { 
  Search, User, CreditCard, Users, Calendar, Activity, 
  ArrowLeft, AlertCircle, Baby 
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const IconChartLine = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

interface GrowthRef {
  usia_bulan: number;
  sd_minus3: number;
  sd_minus2: number;
  median: number;
  sd_plus2: number;
  sd_plus3: number;
}

export default function CekDataAnak() {
  const router = useRouter();
  const [nik, setNik] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<{ child: any, measurements: any[], bbRef: GrowthRef[], tbRef: GrowthRef[] } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nik || !tanggalLahir) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      // Step 1: Verify NIK & Tanggal Lahir (Get JWT Token)
      const verifyRes = await api.post(`/children/public/verify`, { nik, tanggal_lahir: tanggalLahir });
      const token = verifyRes.data.token;

      // Step 2: Fetch data using JWT token
      const res = await api.get(`/children/public/by-nik/${nik}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const child = res.data.data.child;
      const measurements = res.data.data.measurements || [];
      const genderStr = (child.jenis_kelamin === 'L' || child.jenis_kelamin === 'Laki-laki') ? 'Laki-laki' : 'Perempuan';

      // Step 3: Fetch WHO Growth chart references
      const [bbRes, tbRes] = await Promise.all([
        api.get(`/dashboard/growth-chart?jenis_kelamin=${genderStr}&tipe=BB_U`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        api.get(`/dashboard/growth-chart?jenis_kelamin=${genderStr}&tipe=TB_U`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setData({
        child,
        measurements,
        bbRef: bbRes.data.data.referensi || [],
        tbRef: tbRes.data.data.referensi || []
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mencari data anak. Pastikan NIK dan Tanggal Lahir benar.');
    } finally {
      setLoading(false);
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const cleanDate = dateString.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  return (
    <div style={{
      height: '100vh',
      overflowY: 'auto',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f0fdf4 100%)',
      fontFamily: 'inherit',
      color: 'var(--text-main)',
      paddingBottom: '80px',
      position: 'relative',
      zIndex: 0
    }}>
      <div style={{
        position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%',
        background: 'rgba(96, 165, 250, 0.1)' /* Tailwind blue-400 */, filter: 'blur(100px)', borderRadius: '50%', zIndex: -1, pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', top: '20%', right: '-10%', width: '40%', height: '40%',
        background: 'rgba(52, 211, 153, 0.1)' /* Tailwind emerald-400 */, filter: 'blur(100px)', borderRadius: '50%', zIndex: -1, pointerEvents: 'none'
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
            Masukkan NIK dan Tanggal Lahir anak untuk melihat riwayat pertumbuhan dan grafik pengukuran secara mudah dan cepat.
          </p>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '8px' }}>
                  NIK Anak (16 Digit)
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', pointerEvents: 'none' }}>
                    <CreditCard size={20} />
                  </div>
                  <input
                    type="text"
                    placeholder="Masukkan NIK Anak..."
                    value={nik}
                    onChange={e => setNik(e.target.value.replace(/\D/g, ''))}
                    maxLength={16}
                    style={{
                      width: '100%', padding: '16px 16px 16px 48px', background: 'rgba(255, 255, 255, 0.6)',
                      border: '2px solid var(--border)', borderRadius: '16px', fontSize: '1rem', fontWeight: 500,
                      outline: 'none', transition: 'all 0.2s', color: 'var(--text-main)'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'rgba(255, 255, 255, 0.6)'; }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '8px' }}>
                  Tanggal Lahir Anak
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', pointerEvents: 'none' }}>
                    <Calendar size={20} />
                  </div>
                  <input
                    type="date"
                    lang="id-ID"
                    value={tanggalLahir}
                    onChange={e => setTanggalLahir(e.target.value)}
                    style={{
                      width: '100%', padding: '16px 16px 16px 48px', background: 'rgba(255, 255, 255, 0.6)',
                      border: '2px solid var(--border)', borderRadius: '16px', fontSize: '1rem', fontWeight: 500,
                      outline: 'none', transition: 'all 0.2s', color: 'var(--text-main)'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'rgba(255, 255, 255, 0.6)'; }}
                    required
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading || !nik || !tanggalLahir} className="btn-primary" style={{
              padding: '0 32px', height: '56px', borderRadius: '16px', fontSize: '1.05rem', background: '#0f172a',
              boxShadow: '0 10px 25px -5px rgba(15,23,42,0.3)', transition: 'all 0.2s', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '8px'
            }}>
              {loading ? (
                <div style={{ width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Search size={20} /> Cari Data Anak
                </div>
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
                    <Calendar size={16} /> <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>TANGGAL LAHIR</span>
                  </div>
                  <p style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{formatDate(data.child.tanggal_lahir)}</p>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    <Users size={16} /> <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>NAMA ORANG TUA</span>
                  </div>
                  <p style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{data.child.nama_orang_tua}</p>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    <Activity size={16} /> <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>JENIS KELAMIN</span>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <span className="badge" style={{
                      background: data.child.jenis_kelamin === 'L' || data.child.jenis_kelamin === 'Laki-laki' ? '#eff6ff' : '#fdf2f8' /* Tailwind blue-50 : pink-50 */,
                      color: data.child.jenis_kelamin === 'L' || data.child.jenis_kelamin === 'Laki-laki' ? '#1d4ed8' : '#be185d' /* Tailwind blue-700 : pink-700 */,
                      border: `1px solid ${data.child.jenis_kelamin === 'L' || data.child.jenis_kelamin === 'Laki-laki' ? '#bfdbfe' : '#fbcfe8'}`,
                      padding: '6px 12px', fontSize: '0.8rem'
                    }}>
                      {data.child.jenis_kelamin === 'L' || data.child.jenis_kelamin === 'Laki-laki' ? 'Laki-laki' : 'Perempuan'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grafik Pertumbuhan */}
            {data.measurements.length > 0 && (
              <div className="card" style={{ padding: '32px', borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ padding: '10px', background: '#ecfdf5', color: '#10b981', borderRadius: '12px' }}>
                    <Activity size={24} />
                  </div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Grafik Pertumbuhan</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', minHeight: '380px' }}>
                  {/* BB */}
                  <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e8edf2', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <h3 style={{
                      fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px',
                      paddingBottom: '8px', borderBottom: '1px solid #e8edf2', color: '#0f172a',
                      display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0
                    }}>
                      <span style={{ color: '#2563eb', display: 'flex' }}><IconChartLine /></span>
                      Berat Badan (BB/U) - {data.child.nama_anak}
                    </h3>
                    <div style={{ flex: 1, position: 'relative', minHeight: '300px' }}>
                      {data.bbRef.length > 0 ? (
                        <Line
                          data={makeChart(
                            data.bbRef,
                            data.child.jenis_kelamin === 'L' || data.child.jenis_kelamin === 'Laki-laki' ? '#3b82f6' : '#ec4899',
                            true,
                            data.measurements,
                            data.child.nama_anak
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
                      Tinggi Badan (TB/U) - {data.child.nama_anak}
                    </h3>
                    <div style={{ flex: 1, position: 'relative', minHeight: '300px' }}>
                      {data.tbRef.length > 0 ? (
                        <Line
                          data={makeChart(
                            data.tbRef,
                            data.child.jenis_kelamin === 'L' || data.child.jenis_kelamin === 'Laki-laki' ? '#3b82f6' : '#ec4899',
                            false,
                            data.measurements,
                            data.child.nama_anak
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
                  <table className="table-penting" style={{ border: 'none', minWidth: '100%' }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th style={{ padding: '20px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Tanggal</th>
                        <th style={{ padding: '20px', fontSize: '0.8rem' }}>Usia</th>
                        <th style={{ padding: '20px', fontSize: '0.8rem' }}>Berat Badan</th>
                        <th style={{ padding: '20px', fontSize: '0.8rem' }}>Tinggi Badan</th>
                        <th style={{ padding: '20px', fontSize: '0.8rem' }}>Status Kesehatan</th>
                        <th style={{ padding: '20px', fontSize: '0.8rem' }}>Status Gizi (BB/U)</th>
                        <th style={{ padding: '20px', fontSize: '0.8rem' }}>Status Tinggi (TB/U)</th>
                        <th style={{ padding: '20px', fontSize: '0.8rem' }}>Indikasi Stunting</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.measurements.map((m, i) => (
                        <tr key={i} style={{ transition: 'background 0.2s', borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '20px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                            {formatDate(m.tanggal_kunjungan)}
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
                            }`} style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
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
                            }`} style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                              {m.status_tb_u || '-'}
                            </span>
                          </td>
                          <td style={{ padding: '20px' }}>
                            <span className={`badge ${
                              m.status_tb_u?.toLowerCase().includes('pendek')
                                ? 'badge-buruk'
                                : 'badge-normal'
                            }`} style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                              {m.status_tb_u?.toLowerCase().includes('pendek') ? 'Ya (Stunting)' : 'Tidak'}
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
