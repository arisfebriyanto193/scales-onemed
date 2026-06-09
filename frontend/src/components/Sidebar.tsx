'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

// SVG Icons — no emoji
const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
);
const IconChild = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
  </svg>
);
const IconClipboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2h6a1 1 0 0 1 1 1v1H8V3a1 1 0 0 1 1-1z"/><rect x="4" y="4" width="16" height="18" rx="2"/>
    <line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="13" y2="15"/>
  </svg>
);
const IconActivity = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconLogout = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const NAV = [
  { href: '/dashboard',       label: 'Dashboard',       Icon: IconDashboard  },
  { href: '/data-anak',       label: 'Data Anak',       Icon: IconChild      },
  { href: '/data-pengukuran-ws', label: 'Data Pengukuran', Icon: IconClipboard  },
  { href: '/cek-status-gizi', label: 'Cek Status Gizi', Icon: IconActivity   },
  { href: '/kelola-user',     label: 'Kelola User',     Icon: IconUsers      },
];

export default function Sidebar({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const pathname = usePathname();
  const router   = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('penting_token');
    localStorage.removeItem('penting_user');
    router.push('/login');
  };

  return (
    <aside style={{
      width: '240px',
      minHeight: '100vh',
      background: '#ffffff',
      borderRight: '1px solid #e8edf2',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative', /* Changed to relative inside the container */
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
          {/* Custom Logo */}
          <div style={{
            height: '38px',
            borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}>
            <img src="/loogo.jpeg" alt="Logo" style={{ height: '100%', width: 'auto', objectFit: 'contain' }} />
          </div>

        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '14px 12px', overflowY: 'auto' }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px 10px' }}>
          MENU UTAMA
        </p>
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} onClick={onCloseMobile} style={{ textDecoration: 'none', display: 'block', marginBottom: '3px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                padding: '9px 12px',
                borderRadius: '9px',
                background: active ? '#eff6ff' : 'transparent',
                color: active ? '#2563eb' : '#475569',
                fontSize: '0.875rem',
                fontWeight: active ? 600 : 500,
                transition: 'background 0.12s, color 0.12s',
                borderLeft: active ? '3px solid #2563eb' : '3px solid transparent',
              }}>
                <Icon />
                <span>{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '12px', borderTop: '1px solid #f1f5f9' }}>
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
            color: '#64748b',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#fef2f2';
            e.currentTarget.style.color = '#dc2626';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          <IconLogout />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
