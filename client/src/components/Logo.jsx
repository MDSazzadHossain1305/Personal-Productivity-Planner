import { useId } from 'react';

// Bangla name, written as codes so it survives copy and paste: kaajkormo
export const BANGLA_NAME = '\u0995\u09BE\u099C\u0995\u09B0\u09CD\u09AE';

export function LogoMark({ className = 'h-9 w-9' }) {
  // every logo on the page gets its own gradient id, so hidden copies cannot break visible ones
  const gid = 'kk' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill={`url(#${gid})`} />
      <path d="M13 11v18" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M27 11l-9 9 9 9" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="29" cy="20" r="2.2" fill="#fde68a" />
    </svg>
  );
}

export default function Logo({ light = false, size = 'md' }) {
  const big = size === 'lg';
  return (
    <div className="flex items-center gap-3">
      <LogoMark className={big ? 'h-12 w-12' : 'h-9 w-9'} />
      <div className="leading-tight">
        <p className={`font-bold tracking-tight ${big ? 'text-2xl' : 'text-lg'} ${light ? 'text-white' : 'text-slate-900'}`}>
          Kaajkormo
        </p>
        <p className={`text-xs ${light ? 'text-indigo-200' : 'text-slate-500'}`}>
          {BANGLA_NAME} &middot; Plan your day
        </p>
      </div>
    </div>
  );
}