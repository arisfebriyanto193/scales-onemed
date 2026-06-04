'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
      background: '#2563eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px 36px',
        width: '100%',
        maxWidth: '380px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px', height: '52px',
            background: '#2563eb',
            borderRadius: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6 2 3 7 3 12c0 3.5 2 6.5 5 8.5"/>
              <path d="M12 2c6 0 9 5 9 10 0 3.5-2 6.5-5 8.5"/>
              <path d="M12 22v-8"/>
              <path d="M8 14c1.5-1 2.5-2.5 4-2.5s2.5 1.5 4 2.5"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b' }}>Penting</h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>Pencegahan Stunting Terintegrasi</p>
        </div>

        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '20px', color: '#1e293b' }}>Login</h2>

        {error && (
          <div style={{
            background: '#fee2e2', color: '#dc2626',
            padding: '10px 14px', borderRadius: '8px',
            fontSize: '0.85rem', marginBottom: '16px',
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
              Username
            </label>
            <input
              className="input-penting"
              type="text"
              placeholder="Masukkan username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="input-penting"
                type={showPass ? 'text' : 'password'}
                placeholder="Masukkan password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: '10px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#64748b'
                }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.8rem', color: '#2563eb', cursor: 'pointer' }}>
              Forgot Password?
            </span>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '11px', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? 'Memproses...' : 'Login'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '24px' }}>
          Sistem Posyandu — PENTING v1.0
        </p>
      </div>
    </div>
  );
}
