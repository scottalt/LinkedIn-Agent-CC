export interface DiscoverItem {
  id: string
  title: string
  url: string
  source: string
  type: 'reddit' | 'news'
  score?: number
  comments?: number
  date?: string
}

function extractTag(xml: string, tag: string): string {
  const cdataMatch = new RegExp(`<${tag}>[^<]*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>[^<]*</${tag}>`).exec(xml)
  if (cdataMatch) return cdataMatch[1].trim()
  const plainMatch = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml)
  return plainMatch ? plainMatch[1].trim() : ''
}

async function fetchRSS(url: string, source: string, limit = 8): Promise<DiscoverItem[]> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 1800 },
      headers: { 'User-Agent': 'LinkedIn-Agent/1.0' },
    })
    if (!res.ok) return []
    const xml = await res.text()
    const itemBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, limit)
    return itemBlocks.map((match, i) => {
      const block = match[1]
      const title = extractTag(block, 'title')
      const link = extractTag(block, 'link') || extractTag(block, 'guid')
      const pubDate = extractTag(block, 'pubDate')
      return {
        id: `${source}-${i}-${Date.now()}`,
        title,
        url: link,
        source,
        type: 'news' as const,
        date: pubDate ? new Date(pubDate).toLocaleDateString() : undefined,
      }
    }).filter((item) => item.title && item.url)
  } catch {
    return []
  }
}

async function fetchReddit(subreddit: string, limit = 15): Promise<DiscoverItem[]> {
  try {
    const res = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`, {
      next: { revalidate: 1800 },
      headers: { 'User-Agent': 'LinkedIn-Agent/1.0 (content discovery)' },
    })
    if (!res.ok) return []
    const data = await res.json()
    const posts = data?.data?.children ?? []
    return posts
      .map((child: { data: { id: string; title: string; url: string; permalink: string; score: number; num_comments: number; stickied: boolean; is_self: boolean } }) => child.data)
      .filter((p: { stickied: boolean; score: number }) => !p.stickied && p.score > 20)
      .map((p: { id: string; title: string; url: string; permalink: string; score: number; num_comments: number; is_self: boolean }) => ({
        id: `reddit-${p.id}`,
        title: p.title,
        url: p.is_self ? `https://reddit.com${p.permalink}` : p.url,
        source: `r/${subreddit}`,
        type: 'reddit' as const,
        score: p.score,
        comments: p.num_comments,
      }))
  } catch {
    return []
  }
}

export async function fetchDiscoverItems(): Promise<DiscoverItem[]> {
  const [cybersecurity, netsec, krebs, thn, bleeping] = await Promise.all([
    fetchReddit('cybersecurity'),
    fetchReddit('netsec'),
    fetchRSS('https://krebsonsecurity.com/feed/', 'Krebs on Security'),
    fetchRSS('https://feeds.feedburner.com/TheHackersNews', 'The Hacker News'),
    fetchRSS('https://www.bleepingcomputer.com/feed/', 'BleepingComputer'),
  ])

  // Deduplicate reddit posts by title prefix, sort by score, cap at 12
  const redditMap = new Map<string, DiscoverItem>()
  for (const item of [...cybersecurity, ...netsec]) {
    const key = item.title.slice(0, 60).toLowerCase()
    const existing = redditMap.get(key)
    if (!existing || (item.score ?? 0) > (existing.score ?? 0)) {
      redditMap.set(key, item)
    }
  }
  const redditItems = [...redditMap.values()]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 12)

  const newsItems = [...krebs, ...thn, ...bleeping]

  return [...redditItems, ...newsItems]
}
