import { XMLParser } from 'fast-xml-parser'
import type { Feed, Article } from '../types'

export interface ParsedFeed {
  feed: Partial<Feed>
  articles: Omit<Article, 'feedId' | 'feedTitle'>[]
}

type ArticleBase = Omit<Article, 'feedId' | 'feedTitle' | 'isRead' | 'isSaved' | 'cachedAt'>

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  cdataPropName: '#cdata',
  trimValues: true,
  parseAttributeValue: false,
  isArray: (name) => ['item', 'entry', 'link'].includes(name),
})

function generateId(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (Math.imul(31, hash) + key.charCodeAt(i)) | 0
  return (hash >>> 0).toString(36)
}

function str(val: unknown): string {
  if (!val) return ''
  if (Array.isArray(val)) return str(val[0])
  if (typeof val === 'string') return val.trim()
  if (typeof val === 'number') return String(val)
  const v = val as Record<string, unknown>
  // fast-xml-parser puts CDATA in #cdata, text in #text
  return String(v['#cdata'] ?? v['#text'] ?? '').trim()
}

function faviconUrl(siteUrl: string): string | undefined {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(siteUrl).origin}&sz=32` }
  catch { return undefined }
}

function extractImageUrl(item: Record<string, unknown>): string | undefined {
  // <media:content url="..."> or <media:thumbnail url="...">
  const media = (item['media:content'] ?? item['media:thumbnail']) as Record<string, unknown> | undefined
  const mediaUrl = media?.['@url'] as string | undefined
  if (mediaUrl?.match(/\.(jpg|jpeg|png|webp|gif)/i)) return mediaUrl
  // <enclosure url="..." type="image/...">
  const enc = item['enclosure'] as Record<string, unknown> | undefined
  if (enc && String(enc['@type'] ?? '').startsWith('image/')) return enc['@url'] as string | undefined
  // First <img> in content
  const content = str(item['content:encoded'] ?? item['content'] ?? item['description'] ?? '')
  return content.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]
}

function makeArticle(base: ArticleBase): Omit<Article, 'feedId' | 'feedTitle'> {
  return { ...base, isRead: false, isSaved: false, cachedAt: Date.now() }
}

function parseRss(channel: Record<string, unknown>, feedUrl: string): ParsedFeed {
  const siteLink = str(channel['link'])
  const items = (channel['item'] as unknown[] | undefined) ?? []

  return {
    feed: {
      title: str(channel['title']) || feedUrl,
      description: str(channel['description']) || undefined,
      iconUrl: str((channel['image'] as Record<string, unknown> | undefined)?.['url']) ||
        faviconUrl(siteLink || feedUrl),
      lastFetchedAt: Date.now(),
    },
    articles: items.map(i => {
      const item = i as Record<string, unknown>
      const link = str(item['link']) || feedUrl
      const pubDate = str(item['pubDate'] ?? item['dc:date'] ?? '')
      const guid = str(item['guid'])
      return makeArticle({
        id: generateId(guid || link + pubDate),
        title: str(item['title']) || '(no title)',
        url: link,
        author: str(item['dc:creator'] ?? item['author'] ?? '') || undefined,
        publishedAt: pubDate ? new Date(pubDate).getTime() : Date.now(),
        summary: str(item['description']) || undefined,
        content: str(item['content:encoded'] ?? item['content'] ?? '') || undefined,
        imageUrl: extractImageUrl(item),
      })
    }),
  }
}

function parseAtom(feed: Record<string, unknown>, feedUrl: string): ParsedFeed {
  const links = (feed['link'] as unknown[] | undefined) ?? []
  const altLink = links.find((l) => (l as Record<string, unknown>)['@rel'] === 'alternate') as Record<string, unknown> | undefined
  const siteUrl = str(altLink?.['@href']) || feedUrl
  const entries = (feed['entry'] as unknown[] | undefined) ?? []

  return {
    feed: {
      title: str(feed['title']) || feedUrl,
      description: str(feed['subtitle']) || undefined,
      iconUrl: str(feed['icon']) || faviconUrl(siteUrl),
      lastFetchedAt: Date.now(),
    },
    articles: entries.map(e => {
      const entry = e as Record<string, unknown>
      const entryLinks = (entry['link'] as unknown[] | undefined) ?? []
      const altEntryLink = entryLinks.find((l) => (l as Record<string, unknown>)['@rel'] === 'alternate') as Record<string, unknown> | undefined
        ?? entryLinks[0] as Record<string, unknown> | undefined
      const link = str(altEntryLink?.['@href']) || feedUrl
      const published = str(entry['published'] ?? entry['updated'] ?? '')
      const authorObj = entry['author'] as Record<string, unknown> | undefined
      return makeArticle({
        id: generateId(str(entry['id']) || link + published),
        title: str(entry['title']) || '(no title)',
        url: link,
        author: str(authorObj?.['name'] ?? '') || undefined,
        publishedAt: published ? new Date(published).getTime() : Date.now(),
        summary: str(entry['summary']) || undefined,
        content: str(entry['content']) || undefined,
        imageUrl: extractImageUrl(entry),
      })
    }),
  }
}

export async function parseFeed(url: string): Promise<ParsedFeed> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const xml = await res.text()
  const doc = parser.parse(xml) as Record<string, unknown>

  // RSS 2.0
  const rss = doc['rss'] as Record<string, unknown> | undefined
  if (rss) return parseRss(rss['channel'] as Record<string, unknown>, url)

  // RDF/RSS 1.0
  const rdf = doc['rdf:RDF'] as Record<string, unknown> | undefined
  if (rdf) return parseRss(rdf, url)

  // Atom
  const feed = doc['feed'] as Record<string, unknown> | undefined
  if (feed) return parseAtom(feed, url)

  throw new Error('Unknown feed format')
}
