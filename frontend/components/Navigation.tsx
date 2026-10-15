'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartColumn, House } from 'lucide-react';

const LINKS = [
  { href: '/', label: 'Public Feedback', Icon: House },
  { href: '/govt', label: 'Dashboard', Icon: ChartColumn },
];

// trailingSlash export serves /govt/ as well as /govt
const isCurrent = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname.replace(/\/$/, '') === href;

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="fixed top-4 right-4 z-50 sm:top-6 sm:right-6">
      <ul className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-lg">
        {LINKS.map(({ href, label, Icon }) => {
          const current = isCurrent(pathname, href);
          return (
            <li key={href} className="group relative">
              <Link
                href={href}
                aria-label={label}
                aria-current={current ? 'page' : undefined}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  current
                    ? 'bg-[#091F2F] text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#091F2F]'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </Link>
              {/* Visible name on hover or keyboard focus */}
              <span
                aria-hidden="true"
                className="font-ui pointer-events-none absolute top-full right-0 mt-2 rounded-md bg-[#091F2F] px-2 py-1 text-xs font-semibold whitespace-nowrap text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
              >
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
