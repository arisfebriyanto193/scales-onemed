'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { href: '/dashboard',           label: 'Dashboard',        icon: '📊' },
  { href: '/data-anak',           label: 'Data Anak',        icon: '👤' },
  { href: '/data-pengukuran',     label: 'Data Pengukuran',  icon: '📋' },
  { href: '/cek-status-gizi',     label: 'Cek Status Gizi',  icon: '🏥' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('penting_token');
    localStorage.removeItem('penting_user');
    router.push('/login');
  };

  return (
    <aside style={{
      width: '220px',
      minHeight: '100vh',
      background: 'white',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid #f1f5f9',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: '#2563eb',
            borderRadius: '9px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6 2 3 7 3 12c0 3.5 2 6.5 5 8.5"/>
              <path d="M12 2c6 0 9 5 9 10 0 3.5-2 6.5-5 8.5"/>
              <path d="M12 22v-8"/>
              <path d="M8 14c1.5-1 2.5-2.5 4-2.5s2.5 1.5 4 2.5"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>Penting</span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '9px',
                marginBottom: '4px',
                background: active ? '#2563eb' : 'transparent',
                color: active ? 'white' : '#475569',
                fontSize: '0.875rem',
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}>
                <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid #f1f5f9' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '9px 12px',
            borderRadius: '9px',
            border: 'none',
            background: 'transparent',
            color: '#ef4444',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
