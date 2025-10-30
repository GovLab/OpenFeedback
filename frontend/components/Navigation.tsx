'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Public Feedback', icon: '🏠' },
    { href: '/demo', label: 'Demo', icon: '🔬' },
    { href: '/govt', label: 'Dashboard', icon: '📊' },
  ];

  return (
    <nav className="fixed bottom-6 right-6 z-50">
      <div className="bg-white rounded-full shadow-lg border border-gray-200 px-4 py-2 flex items-center gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              pathname === link.href
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            title={link.label}
          >
            <span className="hidden sm:inline">{link.label}</span>
            <span className="sm:hidden">{link.icon}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

