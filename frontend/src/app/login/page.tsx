'use client';
import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);
const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconEye = ({ show }: { show: boolean }) => show ? (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Mode Suspense (0 = nonaktif, 1 = aktif)
  const suspend_status = 0; 
  // Batas waktu penguncian
  const lockTime = new Date('2026-06-08T14:00:00+07:00').getTime();
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [timeOffset, setTimeOffset] = useState(0);

  useEffect(() => {
    if (suspend_status === 1) {
      // Ambil waktu dari server agar tidak bisa diakali dengan mengubah jam PC
      const fetchServerTime = async () => {
        try {
          // Menggunakan API internal kita sendiri agar stabil dan terhindar dari CORS/error koneksi
          const res = await fetch('/api/time', { cache: 'no-store' });
          const data = await res.json();
          const serverTime = data.time;
          const localTime = new Date().getTime();
          setTimeOffset(serverTime - localTime); // Selisih waktu server dan lokal
        } catch (error) {
          console.error('Gagal mengambil waktu server:', error);
        }
      };
      fetchServerTime();
    }
  }, [suspend_status]);

  useEffect(() => {
    if (suspend_status === 1) {
      const checkTime = () => {
        // Waktu saat ini berdasarkan device + selisih waktu dari server
        const now = new Date().getTime() + timeOffset;
        const diff = lockTime - now;
        if (diff <= 0) {
          setIsLocked(true);
          setTimeLeft(0);
        } else {
          setIsLocked(false);
          setTimeLeft(diff);
        }
      };
      
      checkTime();
      const interval = setInterval(checkTime, 1000);
      return () => clearInterval(interval);
    }
  }, [lockTime, suspend_status, timeOffset]);

  const formatTime = (ms: number) => {
    const hours = Math.floor((ms / (1000 * 60 * 60)));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours} jam ${minutes} menit ${seconds} detik`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setError('Web terkunci. Waktu telah habis.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      const { token, user } = res.data.data;
      localStorage.setItem('penting_token', token);
      localStorage.setItem('penting_user', JSON.stringify(user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login gagal. Periksa username dan password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafb',
      display: 'flex',
    }}>
      {/* Left Panel — branding */}
      <div style={{
        display: 'none',
        width: '45%',
        background: 'linear-gradient(145deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
        padding: '60px',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
      className="login-panel-left"
      >
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '300px', height: '300px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
        }}/>
        <div style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: '240px', height: '240px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }}/>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
            <div style={{
              width: '44px', height: '44px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18M3 12h18"/>
              </svg>
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '1.1rem' }}>PENTING</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', letterSpacing: '0.06em' }}>SISTEM POSYANDU</div>
            </div>
          </div>

          <h2 style={{ color: 'white', fontSize: '2rem', fontWeight: 800, lineHeight: 1.3, marginBottom: '16px' }}>
            Pencegahan Stunting<br/>Terintegrasi
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem', lineHeight: 1.7, maxWidth: '320px' }}>
            Sistem monitoring pertumbuhan anak berbasis teknologi untuk mendukung program pencegahan stunting di Posyandu.
          </p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.12)',
          borderRadius: '14px',
          padding: '20px 24px',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', lineHeight: 1.6 }}>
            "Dengan pemantauan rutin dan data yang akurat, kita bisa mencegah stunting sejak dini."
          </p>
          
        </div>
      </div>

      {/* Right Panel — login form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          {/* Mobile logo */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{
              width: '54px', height: '54px',
              background: '#2563eb',
              borderRadius: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
              boxShadow: '0 8px 24px rgba(13,148,136,0.3)',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18M3 12h18"/>
              </svg>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              Selamat Datang
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Masuk ke Sistem Posyandu PENTING
            </p>
          </div>

          {/* Mode Suspense Warnings */}
          {suspend_status === 1 && (
            isLocked ? (
              <div style={{
                background: '#fee2e2',
                color: '#b91c1c',
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '20px',
                textAlign: 'center',
                border: '1px solid #fecaca'
              }}>
                Web terkunci
              </div>
            ) : (
              <div style={{
                background: '#fef9c3',
                color: '#854d0e',
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '20px',
                textAlign: 'center',
                border: '1px solid #fef08a'
              }}>
                Web tersedia {formatTime(timeLeft)} lagi
              </div>
            )
          )}

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              marginBottom: '20px',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '7px', color: '#374151' }}>
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '13px', top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8', display: 'flex',
                }}>
                  <IconUser />
                </span>
                <input
                  className="input-penting"
                  type="text"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoFocus
                  disabled={isLocked}
                  style={{ paddingLeft: '42px' }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '7px', color: '#374151' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '13px', top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8', display: 'flex',
                }}>
                  <IconLock />
                </span>
                <input
                  className="input-penting"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={isLocked}
                  style={{ paddingLeft: '42px', paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#94a3b8', display: 'flex', padding: '2px',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#2563eb'}
                  onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                >
                  <IconEye show={showPass} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem', justifyContent: 'center' }}
              disabled={loading || isLocked}
            >
              {loading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ animation: 'spin 0.8s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Memproses...
                </>
              ) : isLocked ? 'Terkunci' : 'Masuk'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '28px' }}>
            &copy; {new Date().getFullYear()} PENTING — Sistem Posyandu v1.0
          </p>
        </div>
      </div>

      {/* Responsive tweak */}
      <style>{`
        @media (min-width: 768px) {
          .login-panel-left { display: flex !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
