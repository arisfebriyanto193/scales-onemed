'use client';
import Sidebar from '@/components/Sidebar';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const BREADCRUMB: Record<string, string> = {
  '/dashboard':       'Dashboard',
  '/data-anak':       'Data Anak',
  '/data-pengukuran': 'Data Pengukuran',
  '/cek-status-gizi': 'Cek Status Gizi',
};

const IconBell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ nama_lengkap?: string; username?: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('penting_token');
    if (!token) { router.replace('/login'); return; }
    const u = localStorage.getItem('penting_user');
    if (u) setUser(JSON.parse(u));
  }, [router]);

  const breadcrumb = BREADCRUMB[pathname] || 'Dashboard';
  const initials = (user?.nama_lengkap || user?.username || 'P')[0].toUpperCase();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        marginLeft: '240px',
        flex: 1,
        background: '#f8fafb',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Top Header */}
        <header style={{
          background: '#ffffff',
          borderBottom: '1px solid #e8edf2',
          padding: '0 28px',
          height: '60px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Posyandu</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
              {breadcrumb}
            </span>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Divider */}
            <div style={{ width: '1px', height: '28px', background: '#e8edf2' }}/>

            {/* User info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px', height: '34px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.85rem',
                boxShadow: '0 2px 8px rgba(13,148,136,0.35)',
              }}>
                {initials}
              </div>
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>
                  {user?.nama_lengkap || user?.username || 'Pengguna'}
                </p>
                <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '1px' }}>Petugas Posyandu</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ padding: '28px', flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
