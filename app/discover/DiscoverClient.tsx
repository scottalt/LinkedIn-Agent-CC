'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DiscoverItem } from '@/lib/discover/sources'
import { SegmentedControl } from '@/components/SegmentedControl'

function SourceBadge({ type, source }: { type: DiscoverItem['type']; source: string }) {
  if (type === 'reddit') {
    return (
      <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
        {source}
      </span>
    )
  }
  return (
    <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
      {source}
    </span>
  )
}

function ItemCard({ item }: { item: DiscoverItem }) {
  const router = useRouter()

  const handleWrite = () => {
    const topic = `${item.title}\n\nSource: ${item.url}`
    router.push(`/composer?topic=${encodeURIComponent(topic)}`)
  }

  return (
    <div className="bg-layer border border-rim rounded-lg p-4 hover:border-groove transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <SourceBadge type={item.type} source={item.source} />
            {item.date && <span className="text-[10px] text-ink-3">{item.date}</span>}
          </div>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-ink hover:text-gold transition-colors line-clamp-2 font-medium leading-snug"
          >
            {item.title}
          </a>
          {item.type === 'reddit' && (
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-ink-3">
              {item.score !== undefined && (
                <span>{item.score.toLocaleString()} pts</span>
              )}
              {item.comments !== undefined && (
                <span>{item.comments.toLocaleString()} comments</span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={handleWrite}
          className="shrink-0 text-xs text-gold border border-gold/30 hover:bg-gold/10 rounded px-2.5 py-1.5 font-medium transition-colors whitespace-nowrap"
        >
          Write about this
        </button>
      </div>
    </div>
  )
}

type Filter = 'all' | 'reddit' | 'news'

export default function DiscoverClient({ items }: { items: DiscoverItem[] }) {
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = items.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'reddit') return item.type === 'reddit'
    return item.type === 'news'
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SegmentedControl<Filter>
          options={[
            { value: 'all', label: 'All' },
            { value: 'reddit', label: 'Reddit' },
            { value: 'news', label: 'News' },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <span className="text-xs text-ink-3">{filtered.length} items · refreshes every 30 min</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-layer border border-rim rounded-lg p-8 text-center text-sm text-ink-3">
          No items found. Check back soon.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
