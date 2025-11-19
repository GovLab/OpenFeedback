'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Public Feedback', icon: '🏠' },
    { href: '/govt', label: 'Dashboard', icon: '📊' },
  ];

  return (
    <nav className="fixed top-6 right-6 z-50">
      <div className="flex items-center gap-1 bg-white rounded-full shadow-lg border p-1" style={{ borderColor: 'var(--boston-gray-light)' }}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`w-10 h-10 flex items-center justify-center rounded-full text-lg transition-all ${
              pathname === link.href
                ? 'text-white shadow-md'
                : 'text-gray-600 hover:text-white'
            }`}
            style={{
              backgroundColor: pathname === link.href ? 'var(--boston-charles-blue)' : 'transparent'
            }}
            onMouseEnter={(e) => {
              if (pathname !== link.href) {
                e.currentTarget.style.backgroundColor = 'var(--boston-gray-light)';
              }
            }}
            onMouseLeave={(e) => {
              if (pathname !== link.href) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
            title={link.label}
          >
            {link.icon}
          </Link>
        ))}
        
      </div>
    </nav>
  );
}

