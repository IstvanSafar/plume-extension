import browser from 'webextension-polyfill'
import { parseFeed } from './feedParser'
import { getFeeds, upsertFeed, upsertArticles, updateArticleContent, pruneOldArticles, updateFeedUnreadCount, recalcAllUnreadCounts } from '../storage/db'
import { getSettings } from '../storage/settings'
import { EXPLORE_FEEDS } from '../explore/feeds'
import type { BackgroundMessage, BackgroundResponse, Article } from '../types'

async function syncFeed(feedId: string): Promise<void> {
  const feeds = await getFeeds()
  const feed = feeds.find(f => f.id === feedId)
  if (!feed) return

  try {
    const { feed: meta, articles } = await parseFeed(feed.url)
    await upsertFeed({ ...feed, ...meta })
    await upsertArticles(articles.map(a => ({
      ...a,
      id: feed.id + ':' + a.id,   // feed-scoped ID — prevents cross-feed hash collisions
      feedId: feed.id,
      feedTitle: meta.title ?? feed.title,
    })))
    await updateFeedUnreadCount(feed.id)
  } catch (e) {
    console.error(`[Plume] Failed to sync feed ${feed.title}:`, e)
  }
}

async function syncAll(): Promise<void> {
  const feeds = await getFeeds()
  await Promise.allSettled(feeds.map(f => syncFeed(f.id)))
  const { pruneDays } = await getSettings() as { pruneDays?: number }
  await pruneOldArticles(pruneDays ?? 30)
  await recalcAllUnreadCounts()
}

async function fetchShuffle(langs: string[]): Promise<Article | null> {
  const pool = langs.length > 0 ? EXPLORE_FEEDS.filter(f => langs.includes(f.lang)) : EXPLORE_FEEDS
  if (pool.length === 0) return null
  // Shuffle pool order, try up to 3 feeds before giving up
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  for (const feed of shuffled.slice(0, 3)) {
    try {
      const { articles } = await parseFeed(feed.url)
      if (articles.length === 0) continue
      const item = articles[Math.floor(Math.random() * articles.length)]
      return { ...item, feedId: '_explore', feedTitle: feed.title, isRead: false, isSaved: false }
    } catch {
      continue
    }
  }
  return null
}

async function fetchFullContent(articleId: string, url: string): Promise<void> {
  try {
    const res = await fetch(url)
    const html = await res.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')

    const { Readability } = await import('@mozilla/readability')
    const reader = new Readability(doc)
    const parsed = reader.parse()
    if (parsed?.content) {
      await updateArticleContent(articleId, parsed.content)
    }
  } catch (e) {
    console.error('[Plume] Full content fetch failed:', e)
  }
}

browser.runtime.onMessage.addListener(async (msg: unknown): Promise<BackgroundResponse> => {
  const message = msg as BackgroundMessage
  try {
    if (message.type === 'SYNC_ALL') {
      await syncAll()
      return { ok: true }
    }
    if (message.type === 'SYNC_FEED' && message.feedId) {
      await syncFeed(message.feedId)
      return { ok: true }
    }
    if (message.type === 'FETCH_FULL_CONTENT' && message.articleId && message.articleUrl) {
      await fetchFullContent(message.articleId, message.articleUrl)
      return { ok: true }
    }
    if (message.type === 'SHUFFLE' && message.langs) {
      const article = await fetchShuffle(message.langs)
      return { ok: true, data: article }
    }
    return { ok: false, error: 'Unknown message type' }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
})

// Open the reader tab when the toolbar icon is clicked
browser.action.onClicked.addListener(() => {
  const url = browser.runtime.getURL('app.html')
  browser.tabs.query({ url }).then(tabs => {
    if (tabs.length > 0 && tabs[0].id != null) {
      browser.tabs.update(tabs[0].id, { active: true })
    } else {
      browser.tabs.create({ url })
    }
  })
})

// Periodic sync every 30 minutes
browser.alarms.create('sync', { periodInMinutes: 30 })
browser.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'sync') syncAll()
})
