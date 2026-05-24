const COMMON_PATHS = ['/feed', '/rss', '/rss.xml', '/atom.xml', '/feed.xml', '/index.xml', '/feeds']
const FEED_TYPES = ['application/rss+xml', 'application/atom+xml', 'application/xml', 'text/xml']

function isFeedType(ct: string): boolean {
  return FEED_TYPES.some(t => ct.includes(t))
}

async function checkIsFeed(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(4000) })
    if (!res.ok) return false
    return isFeedType(res.headers.get('content-type') ?? '')
  } catch {
    return false
  }
}

// Given any URL (website or direct feed URL), returns the RSS/Atom feed URL.
// Throws with a user-friendly message if no feed is found.
export async function discoverFeedUrl(rawUrl: string): Promise<string> {
  const url = /^https?:\/\//.test(rawUrl) ? rawUrl : `https://${rawUrl}`

  // Fetch the URL — if it's already a feed (by content-type), use it directly
  let html: string | null = null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const ct = res.headers.get('content-type') ?? ''
    if (isFeedType(ct)) return url
    html = await res.text()
  } catch (e) {
    if (html === null) throw new Error(`Could not reach ${url}`)
  }

  // Look for RSS autodiscovery <link rel="alternate"> in the page HTML
  if (html) {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    for (const link of doc.querySelectorAll<HTMLLinkElement>('link[rel~="alternate"]')) {
      const type = link.getAttribute('type') ?? ''
      const href = link.getAttribute('href') ?? ''
      if (href && (type.includes('rss') || type.includes('atom') || type.includes('xml'))) {
        return new URL(href, url).href
      }
    }
  }

  // Try Feedly search API and common paths in parallel
  const origin = new URL(url).origin
  const domain = new URL(url).hostname

  const [feedlyResult, ...pathResults] = await Promise.all([
    searchFeedly(domain),
    ...COMMON_PATHS.map(async p => ({ url: origin + p, ok: await checkIsFeed(origin + p) })),
  ])

  if (feedlyResult) return feedlyResult
  const foundPath = pathResults.find(r => r.ok)
  if (foundPath) return foundPath.url

  throw new Error('No RSS feed found. Try pasting the feed URL directly.')
}

export interface FeedSuggestion {
  url: string
  title: string
  subscribers: number
  iconUrl?: string
  website?: string
}

async function searchFeedly(query: string): Promise<string | null> {
  const results = await searchFeedlySuggestions(query)
  return results[0]?.url ?? null
}

export async function searchFeedlySuggestions(query: string): Promise<FeedSuggestion[]> {
  try {
    const res = await fetch(
      `https://cloud.feedly.com/v3/search/feeds?query=${encodeURIComponent(query)}&count=8`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return []
    const data = await res.json() as {
      results?: { feedId?: string; title?: string; subscribers?: number; iconUrl?: string; website?: string }[]
    }
    return (data.results ?? []).map(r => ({
      url: (r.feedId ?? '').startsWith('feed/') ? r.feedId!.slice(5) : (r.feedId ?? ''),
      title: r.title ?? '',
      subscribers: r.subscribers ?? 0,
      iconUrl: r.iconUrl,
      website: r.website,
    })).filter(r => r.url)
  } catch {
    return []
  }
}
