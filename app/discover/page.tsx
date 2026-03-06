import { fetchDiscoverItems } from '@/lib/discover/sources'
import DiscoverClient from './DiscoverClient'

export default async function DiscoverPage() {
  const items = await fetchDiscoverItems()
  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-ink">Discover</h1>
        <p className="text-sm text-ink-3 mt-0.5">Trending topics from cybersecurity communities and news feeds.</p>
      </div>
      <DiscoverClient items={items} />
    </div>
  )
}
