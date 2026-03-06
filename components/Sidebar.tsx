'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/composer', label: 'Composer' },
  { href: '/discover', label: 'Discover' },
  { href: '/templates', label: 'Templates' },
  { href: '/style-center', label: 'Style Center' },
  { href: '/scheduler', label: 'Scheduler' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/settings', label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-52 shrink-0 bg-layer flex flex-col h-full border-r border-rim">
      <div className="px-5 py-6 border-b border-rim">
        <span className="font-display text-base text-ink tracking-tight">
          LinkedIn <span className="text-gold">Agent</span>
        </span>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded text-sm transition-colors ${
                active
                  ? 'bg-gold/10 text-gold border-l-2 border-gold pl-[10px]'
                  : 'text-ink-3 hover:text-ink-2 hover:bg-well/60 border-l-2 border-transparent pl-[10px]'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-5 py-4 border-t border-rim">
        <p className="text-ink-3 text-xs">Local only</p>
      </div>
    </aside>
  )
}
