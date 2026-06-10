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
          font: { family: "'Inter', sans-serif", size: 13 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { family: "'Inter', sans-serif", size: 13 },
        bodyFont: { family: "'Inter', sans-serif", size: 13 },
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: "'Inter', sans-serif" } }
      },
      y: { 
        type: 'linear' as const, 
        display: true, 
        position: 'left' as const, 
        title: { display: true, text: 'Berat Badan (kg)', font: { family: "'Inter', sans-serif", size: 12, weight: 'bold' as const } },
        grid: { color: '#f1f5f9' },
        border: { display: false }
      },
      y1: { 
        type: 'linear' as const, 
        display: true, 
        position: 'right' as const, 
        grid: { drawOnChartArea: false }, 
        title: { display: true, text: 'Tinggi Badan (cm)', font: { family: "'Inter', sans-serif", size: 12, weight: 'bold' as const } },
        border: { display: false }
      },
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-blue-100 selection:text-blue-900 pb-20 relative z-0">
      {/* Decorative background gradients */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-blue-50 via-emerald-50/30 to-slate-50 -z-10" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/5 blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-400/5 blur-[120px] -z-10 pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-12 gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden p-2">
              <img src="/loogo.jpeg" alt="Logo Posyandu" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">PENTING</h1>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Sistem Posyandu</p>
            </div>
          </div>
          <button 
            onClick={() => router.push('/login')} 
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all focus:outline-none focus:ring-4 focus:ring-slate-100 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Login
          </button>
        </header>

        {/* Search Box Section */}
        <div className="bg-white/70 backdrop-blur-xl border border-white shadow-xl shadow-slate-200/40 rounded-[2rem] p-6 sm:p-10 mb-10 transition-all">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Pantau Pertumbuhan <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">Anak Anda</span>
            </h2>
            <p className="text-slate-500 text-lg mb-8 leading-relaxed max-w-2xl">
              Masukkan Nomor Induk Kependudukan (NIK) anak untuk melihat riwayat pertumbuhan, status gizi, dan grafik pengukuran Posyandu secara detail.
            </p>
            
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <CreditCard className="h-6 w-6" />
                </div>
                <input
                  type="text"
                  placeholder="Masukkan 16 digit NIK Anak..."
                  value={nik}
                  onChange={e => setNik(e.target.value.replace(/\D/g, ''))}
                  maxLength={16}
                  className="w-full pl-14 pr-5 py-4 bg-white/50 backdrop-blur-sm border-2 border-slate-200 rounded-2xl text-slate-900 text-lg font-medium focus:outline-none focus:ring-0 focus:border-blue-500 transition-all placeholder:text-slate-400 placeholder:font-normal shadow-sm"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={loading || nik.length < 16} 
                className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white text-lg font-semibold rounded-2xl hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20 sm:w-auto w-full group"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>Cari Data</span>
                  </>
                )}
              </button>
            </form>

            {error && (
              <div className="mt-6 flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 animate-in" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Result Sections */}
        {data && (
          <div className="space-y-8" style={{ animation: 'fadeInUp 0.5s ease-out forwards' }}>
            {/* Profil Anak Card */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-slate-200/40">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Baby className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Profil Anak</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500">
                    <User className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Nama Anak</span>
                  </div>
                  <p className="text-base font-bold text-slate-900">{data.child.nama_anak}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">NIK</span>
                  </div>
                  <p className="text-base font-semibold text-slate-900">{data.child.nik}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Nama Orang Tua</span>
                  </div>
                  <p className="text-base font-semibold text-slate-900">{data.child.nama_orang_tua}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Tanggal Lahir</span>
                  </div>
                  <p className="text-base font-semibold text-slate-900">
                    {new Date(data.child.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Jenis Kelamin</span>
                  </div>
                  <div className="mt-1">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                      data.child.jenis_kelamin === 'L' 
                        ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                        : 'bg-pink-50 text-pink-700 border border-pink-100'
                    }`}>
                      {data.child.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grafik Card */}
            {data.measurements.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-slate-200/40">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <Activity className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Grafik Pertumbuhan</h3>
                </div>
                <div className="h-[400px] w-full">
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>
            )}

            {/* Riwayat Pengukuran Card */}
            <div className="bg-white border border-slate-100 rounded-[2rem] shadow-xl shadow-slate-200/40 overflow-hidden">
              <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center gap-3">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Riwayat Pengukuran</h3>
              </div>
              
              {data.measurements.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-5">
                    <Activity className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="text-xl font-bold text-slate-900 mb-2">Belum ada riwayat</p>
                  <p className="text-slate-500">Anak ini belum memiliki data pengukuran yang tercatat.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-50/80 uppercase font-bold tracking-wider">
                      <tr>
                        <th className="px-6 py-5 whitespace-nowrap">Tanggal</th>
                        <th className="px-6 py-5 whitespace-nowrap">Usia</th>
                        <th className="px-6 py-5 whitespace-nowrap">Berat Badan</th>
                        <th className="px-6 py-5 whitespace-nowrap">Tinggi Badan</th>
                        <th className="px-6 py-5 whitespace-nowrap">Status Kesehatan</th>
                        <th className="px-6 py-5 whitespace-nowrap">Status Gizi (BB/U)</th>
                        <th className="px-6 py-5 whitespace-nowrap">Status Tinggi (TB/U)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.measurements.map((m, i) => (
                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-5 font-bold text-slate-900 whitespace-nowrap">
                            {new Date(m.tanggal_kunjungan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-5 font-medium text-slate-600 whitespace-nowrap">
                            {m.usia_bulan} bulan
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-blue-50 text-blue-700 border border-blue-100">
                              {m.berat_badan} kg
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {m.tinggi_badan} cm
                            </span>
                          </td>
                          <td className="px-6 py-5 font-medium text-slate-600 whitespace-nowrap">
                            {m.status_kesehatan || '-'}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className={`inline-flex px-3 py-1.5 rounded-xl text-xs font-bold ${
                              m.status_bb_u?.includes('Kurang') || m.status_bb_u?.includes('Sangat') 
                                ? 'bg-red-50 text-red-700 border border-red-100' 
                                : m.status_bb_u?.includes('Lebih') || m.status_bb_u?.includes('Risiko')
                                ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                                : 'bg-green-50 text-green-700 border border-green-100'
                            }`}>
                              {m.status_bb_u || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className={`inline-flex px-3 py-1.5 rounded-xl text-xs font-bold ${
                              m.status_tb_u?.includes('Pendek') 
                                ? 'bg-red-50 text-red-700 border border-red-100' 
                                : m.status_tb_u?.includes('Tinggi')
                                ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                                : 'bg-green-50 text-green-700 border border-green-100'
                            }`}>
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
      `}</style>
    </div>
  );
}
