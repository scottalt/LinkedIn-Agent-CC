'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/composer', label: 'Composer' },
  { href: '/templates', label: 'Templates' },
  { href: '/style-center', label: 'Style Center' },
  { href: '/scheduler', label: 'Scheduler' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/settings', label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-52 shrink-0 bg-zinc-900 flex flex-col h-full">
      <div className="px-5 py-6 border-b border-zinc-800">
        <span className="text-white font-semibold text-sm tracking-wide">LinkedIn Agent</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded text-sm transition-colors ${
                active
                  ? 'bg-zinc-700 text-white font-medium'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-5 py-4 border-t border-zinc-800">
        <p className="text-zinc-600 text-xs">Local only</p>
      </div>
    </aside>
  )
}
