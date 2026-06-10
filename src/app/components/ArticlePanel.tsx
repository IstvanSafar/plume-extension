import { useState, useEffect, useRef } from 'react'
import { useArticles } from '../../sidebar/hooks/useArticles'
import { searchArticles, markAllReadInFeed } from '../../storage/db'
import type { Article } from '../../types'
import type { ArticleFilter } from '../../sidebar/hooks/useArticles'

interface Props {
  filter: ArticleFilter
  label: string
  selectedId?: string
  unreadOnly: boolean
  onOpenArticle: (article: Article) => void
  onUnreadChanged?: () => void
  onToggleUnreadOnly?: () => void
}

export function ArticlePanel({ filter, label, selectedId, unreadOnly, onOpenArticle, onUnreadChanged, onToggleUnreadOnly }: Props) {
  const { articles, articlesKey, syncing, error, markRead, syncFeed, reload } = useArticles(filter, onUnreadChanged)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Article[] | null>(null)
  const [searching, setSearching] = useState(false)
  // Snapshot of articles when the feed/filter was opened, so marking read doesn't remove items mid-session
  const [snapshot, setSnapshot] = useState<Article[]>([])
  const snapshotKeyRef = useRef('')
  const listRef = useRef<HTMLUListElement>(null)
  const selectedIndexRef = useRef(-1)

  const filterKey = JSON.stringify(filter)

  // Clear snapshot immediately when filter changes (prevents previous feed's articles flashing)
  useEffect(() => {
    setSnapshot([])
    snapshotKeyRef.current = ''
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  // Populate/update snapshot when articles load — guard against stale articles from previous filter
  useEffect(() => {
    if (articles.length === 0) return
    if (articlesKey !== filterKey) return  // articles haven't reloaded for current filter yet
    const key = filterKey + ':' + unreadOnly
    if (snapshotKeyRef.current !== key) {
      snapshotKeyRef.current = key
      setSnapshot(unreadOnly ? articles.filter(a => !a.isRead) : articles)
    } else if (!unreadOnly) {
      setSnapshot(articles)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles, articlesKey, filterKey, unreadOnly])

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults(null); return }
    setSearching(true)
    setSearchResults(await searchArticles(q.trim()))
    setSearching(false)
  }

  function handleOpenArticle(article: Article) {
    markRead(article.id)
    // Update isRead in snapshot in-place so the article stays visible but shows as read
    setSnapshot(prev => prev.map(a => a.id === article.id ? { ...a, isRead: true } : a))
    onOpenArticle(article)
  }

  const displayArticles = searchResults ?? snapshot

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Skip if user is typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        const next = Math.min(selectedIndexRef.current + 1, displayArticles.length - 1)
        selectedIndexRef.current = next
        if (displayArticles[next]) onOpenArticle(displayArticles[next])
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = Math.max(selectedIndexRef.current - 1, 0)
        selectedIndexRef.current = prev
        if (displayArticles[prev]) onOpenArticle(displayArticles[prev])
      } else if (e.key === 'm') {
        const current = displayArticles[selectedIndexRef.current]
        if (current) {
          markRead(current.id)
          setSnapshot(prev => prev.map(a => a.id === current.id ? { ...a, isRead: true } : a))
        }
      } else if (e.key === 'o') {
        const current = displayArticles[selectedIndexRef.current]
        if (current) window.open(current.url, '_blank')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [displayArticles, markRead, onOpenArticle])

  // Keep selectedIndex in sync
  useEffect(() => {
    selectedIndexRef.current = displayArticles.findIndex(a => a.id === selectedId)
  }, [selectedId, displayArticles])

  async function handleMarkAllRead() {
    if (filter.type === 'feed') {
      await markAllReadInFeed(filter.feedId)
      setSnapshot(prev => prev.map(a => ({ ...a, isRead: true })))
      await reload()
      onUnreadChanged?.()
    }
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <section className="article-panel">
      <header className="panel-header">
        <span className="panel-title">{searchQuery ? `"${searchQuery}"` : label}</span>
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {onToggleUnreadOnly && (
            <button
              className={`icon-btn${unreadOnly ? ' active' : ''}`}
              onClick={onToggleUnreadOnly}
              title={unreadOnly ? 'Showing unread only — click to show all' : 'Showing all — click to show unread only'}
            >
              {unreadOnly ? '🔵' : '○'}
            </button>
          )}
          {filter.type === 'feed' && !searchQuery && (
            <>
              <button className="icon-btn" onClick={handleMarkAllRead} title="Mark all read in this feed">✓</button>
              <button className="icon-btn" onClick={syncFeed} disabled={syncing} title="Refresh">
                <span className={syncing ? 'spin' : ''}>↻</span>
              </button>
            </>
          )}
        </div>
      </header>

      <div className="search-bar">
        <input
          type="search"
          placeholder="Search… (j/k navigate, m mark read, o open)"
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {error && <p className="panel-error">{error}</p>}

      <ul className="article-list" ref={listRef}>
        {(syncing || searching) && displayArticles.length === 0 && (
          <li className="loading-row">Loading…</li>
        )}
        {displayArticles.map(article => (
          <li
            key={article.id}
            className={`article-row ${article.isRead ? 'read' : ''} ${selectedId === article.id ? 'selected' : ''}`}
            onClick={() => handleOpenArticle(article)}
          >
            <div className="article-row-top">
              <span className="article-feed-tag">{article.feedTitle}</span>
              <span className="article-date">{formatDate(article.publishedAt)}</span>
            </div>
            <p className="article-row-title">{article.title}</p>
            {article.summary && (
              <p className="article-row-summary">{article.summary.replace(/<[^>]+>/g, '').slice(0, 140)}…</p>
            )}
          </li>
        ))}
      </ul>

      {!syncing && !searching && displayArticles.length === 0 && !error && (
        <p className="hint">{searchQuery ? 'No results.' : unreadOnly ? 'All caught up!' : 'No articles here.'}</p>
      )}
    </section>
  )
}
