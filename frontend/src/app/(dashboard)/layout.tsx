'use client';
import Sidebar from '@/components/Sidebar';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const BREADCRUMB: Record<string, string> = {
  '/dashboard':         'Dashboard',
  '/data-anak':         'Data Anak',
  '/data-pengukuran':   'Data Pengukuran',
  '/cek-status-gizi':   'Cek Status Gizi',
};

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

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        marginLeft: '220px',
        flex: 1,
        background: '#f1f5f9',
        minHeight: '100vh',
      }}>
        {/* Top Header */}
        <header style={{
          background: 'white',
          borderBottom: '1px solid #e2e8f0',
          padding: '14px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Halaman</p>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
              / {breadcrumb}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: '#2563eb', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.9rem',
            }}>
              {(user?.nama_lengkap || user?.username || 'A')[0].toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                {user?.nama_lengkap || user?.username || 'Pengguna'}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Petugas Posyandu</p>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ padding: '24px 28px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
