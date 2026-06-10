import Dexie, { type Table } from 'dexie'
import type { Feed, Article } from '../types'

class PlumeDatabase extends Dexie {
  feeds!: Table<Feed>
  articles!: Table<Article>

  constructor() {
    super('PlumeRSS')
    this.version(1).stores({
      feeds: 'id, addedAt',
      articles: 'id, feedId, publishedAt, isRead, isSaved, cachedAt',
    })
  }
}

export const db = new PlumeDatabase()

export async function getFeeds(): Promise<Feed[]> {
  return db.feeds.orderBy('addedAt').toArray()
}

export async function upsertFeed(feed: Feed): Promise<void> {
  await db.feeds.put(feed)
}

export async function deleteFeed(feedId: string): Promise<void> {
  await db.feeds.delete(feedId)
  await db.articles.where('feedId').equals(feedId).delete()
}

export async function getArticlesByFeed(feedId: string, unreadOnly = false): Promise<Article[]> {
  let col = db.articles.where('feedId').equals(feedId)
  if (unreadOnly) col = col.filter(a => !a.isRead) as typeof col
  return col.reverse().sortBy('publishedAt')
}

export async function getUnreadArticles(): Promise<Article[]> {
  return db.articles.filter(a => !a.isRead).reverse().sortBy('publishedAt')
}

export async function getSavedArticles(): Promise<Article[]> {
  return db.articles.filter(a => a.isSaved).reverse().sortBy('publishedAt')
}

export async function upsertArticles(articles: Article[]): Promise<void> {
  const ids = articles.map(a => a.id)
  const existing = await db.articles.bulkGet(ids)
  const existingMap = new Map(existing.filter(Boolean).map(a => [a!.id, a!]))
  const merged = articles.map(a => {
    const prev = existingMap.get(a.id)
    if (prev) {
      // Preserve feed attribution — never let a different feed claim an existing article.
      // Only update content fields and keep read/saved state.
      return { ...a, feedId: prev.feedId, feedTitle: prev.feedTitle, isRead: prev.isRead, isSaved: prev.isSaved }
    }
    return a
  })
  await db.articles.bulkPut(merged)
}

export async function markArticleRead(articleId: string): Promise<void> {
  await db.articles.update(articleId, { isRead: true })
}

export async function markAllReadInFeed(feedId: string): Promise<void> {
  await db.articles.where('feedId').equals(feedId).modify({ isRead: true })
  await updateFeedUnreadCount(feedId)
}

export async function markAllReadGlobal(): Promise<void> {
  await db.articles.toCollection().modify({ isRead: true })
}

export async function toggleArticleSaved(articleId: string): Promise<void> {
  const article = await db.articles.get(articleId)
  if (article) await db.articles.update(articleId, { isSaved: !article.isSaved })
}

export async function updateArticleContent(articleId: string, content: string): Promise<void> {
  await db.articles.update(articleId, { content })
}

export async function updateFeedUnreadCount(feedId: string): Promise<void> {
  const count = await db.articles.where('feedId').equals(feedId).filter(a => !a.isRead).count()
  await db.feeds.update(feedId, { unreadCount: count })
}

export async function recalcAllUnreadCounts(): Promise<void> {
  const feeds = await db.feeds.toArray()
  await Promise.all(feeds.map(f => updateFeedUnreadCount(f.id)))
}

export async function searchArticles(query: string): Promise<Article[]> {
  const q = query.toLowerCase()
  return db.articles
    .filter(a => a.title.toLowerCase().includes(q) || (a.summary ?? '').toLowerCase().includes(q))
    .reverse()
    .sortBy('publishedAt')
}

export async function getArticleCount(): Promise<number> {
  return db.articles.count()
}

export async function pruneOldArticles(keepDays = 30): Promise<void> {
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000
  await db.articles.where('cachedAt').below(cutoff).filter(a => !a.isSaved).delete()
}

export async function clearAllData(): Promise<void> {
  await db.articles.clear()
  await db.feeds.toCollection().modify({ unreadCount: 0 })
}
