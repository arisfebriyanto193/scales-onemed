'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafb',
      fontFamily: 'inherit',
      padding: '20px',
      textAlign: 'center'
    }}>
      {/* Icon Medis (First Aid Kit) */}
      <div style={{
        width: '86px', height: '86px',
        background: '#eff6ff',
        borderRadius: '24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#2563eb',
        marginBottom: '24px',
        boxShadow: '0 8px 24px rgba(37,99,235,0.12)'
      }}>
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="14" rx="2"/>
          <path d="M7 6V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/>
          <line x1="12" y1="10" x2="12" y2="16"/>
          <line x1="9" y1="13" x2="15" y2="13"/>
        </svg>
      </div>

      <h1 style={{ 
        fontSize: '5rem', 
        fontWeight: 800, 
        color: '#1e293b', 
        lineHeight: 1, 
        marginBottom: '16px',
        letterSpacing: '-2px'
      }}>
        404
      </h1>
      
      <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#334155', marginBottom: '12px' }}>
        Halaman Tidak Ditemukan
      </h2>
      
      <p style={{ color: '#64748b', maxWidth: '420px', lineHeight: 1.6, marginBottom: '36px', fontSize: '0.95rem' }}>
        Mohon maaf, halaman sistem, rekam medis, atau data yang Anda cari tidak tersedia atau mungkin telah dipindahkan.
      </p>

      <Link href="/dashboard" style={{
        background: '#2563eb',
        color: '#fff',
        padding: '14px 28px',
        borderRadius: '12px',
        fontWeight: 600,
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(37,99,235,0.35)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.25)';
      }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
