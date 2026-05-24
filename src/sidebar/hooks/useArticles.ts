import { useState, useEffect, useCallback, useRef } from 'react'
import browser from 'webextension-polyfill'
import {
  getArticlesByFeed,
  getUnreadArticles,
  getSavedArticles,
  searchArticles,
  markArticleRead as dbMarkRead,
  toggleArticleSaved as dbToggleSaved,
  updateFeedUnreadCount,
} from '../../storage/db'
import type { Article } from '../../types'

export type ArticleFilter = { type: 'feed'; feedId: string } | { type: 'unread' } | { type: 'saved' } | { type: 'search'; query: string } | { type: 'explore' }

export function useArticles(filter: ArticleFilter, onUnreadChanged?: () => void) {
  const [articles, setArticles] = useState<Article[]>([])
  const [articlesKey, setArticlesKey] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const genRef = useRef(0)
  // Stable string key — prevents re-renders from new object references for same filter
  const filterKey = JSON.stringify(filter)
  const filterRef = useRef(filter)
  filterRef.current = filter

  const reload = useCallback(async () => {
    const gen = ++genRef.current
    const f = filterRef.current
    let result: Article[]
    if (f.type === 'feed') result = await getArticlesByFeed(f.feedId)
    else if (f.type === 'unread') result = await getUnreadArticles()
    else if (f.type === 'saved') result = await getSavedArticles()
    else if (f.type === 'search') result = await searchArticles(f.query)
    else result = []
    if (gen === genRef.current) {
      setArticles(result)
      setArticlesKey(filterKey)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  useEffect(() => { reload() }, [reload])

  const syncFeed = useCallback(async () => {
    const f = filterRef.current
    if (f.type !== 'feed') return
    setSyncing(true)
    setError('')
    try {
      const resp = await browser.runtime.sendMessage({ type: 'SYNC_FEED', feedId: f.feedId }) as { ok: boolean; error?: string }
      if (!resp.ok) setError(resp.error ?? 'Sync failed')
    } catch (e) {
      setError(String(e))
    } finally {
      setSyncing(false)
      await reload()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, reload])


  const markRead = useCallback(async (articleId: string) => {
    await dbMarkRead(articleId)
    setArticles(prev => {
      const updated = prev.map(a => a.id === articleId ? { ...a, isRead: true } : a)
      // Update feed unread count after state change
      const article = prev.find(a => a.id === articleId)
      if (article?.feedId && article.feedId !== '_explore') {
        updateFeedUnreadCount(article.feedId).then(() => onUnreadChanged?.())
      } else {
        onUnreadChanged?.()
      }
      return updated
    })
  }, [onUnreadChanged])

  const toggleSaved = useCallback(async (articleId: string) => {
    await dbToggleSaved(articleId)
    setArticles(prev => prev.map(a => a.id === articleId ? { ...a, isSaved: !a.isSaved } : a))
  }, [])

  const fetchFullContent = useCallback(async (articleId: string, url: string) => {
    await browser.runtime.sendMessage({ type: 'FETCH_FULL_CONTENT', articleId, articleUrl: url })
    await reload()
  }, [reload])

  return { articles, articlesKey, syncing, error, markRead, toggleSaved, fetchFullContent, syncFeed, reload }
}
