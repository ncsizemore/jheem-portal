'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function StateExplorerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAjph = pathname === '/ryan-white-state-level/explorer/ajph';
  const isCroi = pathname === '/ryan-white-state-level/explorer/croi';

  return (
    <div className="flex flex-col h-screen">
      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-1">
        <Link
          href="/ryan-white-state-level/explorer/ajph"
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            isAjph
              ? 'bg-hopkins-blue text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          AJPH Explorer
          <span className="ml-1.5 text-xs opacity-75">(11 States)</span>
        </Link>
        <Link
          href="/ryan-white-state-level/explorer/croi"
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            isCroi
              ? 'bg-hopkins-blue text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          CROI Explorer
          <span className="ml-1.5 text-xs opacity-75">(30 States)</span>
        </Link>
        <div className="flex-1" />
        <Link
          href="/ryan-white-state-level"
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          ← Back to Overview
        </Link>
      </div>

      {/* Explorer content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
