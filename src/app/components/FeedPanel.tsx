import { useState, useEffect, useRef } from 'react'
import { searchFeedlySuggestions, type FeedSuggestion } from '../../utils/feedDiscovery'
import { EXPLORE_FEEDS, EXPLORE_LANGUAGES } from '../../explore/feeds'
import type { Feed } from '../../types'
import type { ArticleFilter } from '../../sidebar/hooks/useArticles'

interface Props {
  feeds: Feed[]
  syncing: boolean
  activeFilter: ArticleFilter
  shuffling: boolean
  shuffleError: string
  totalUnread: number
  onAddFeed: (url: string) => Promise<void>
  onDeleteFeed: (feedId: string) => Promise<void>
  onSyncAll: () => Promise<void>
  onShuffle: () => void
  onOpenFeed: (feed: Feed) => void
  onOpenUnread: () => void
  onOpenSaved: () => void
  onOpenSettings: () => void
  onMarkAllRead: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

export function FeedPanel({ feeds, syncing, activeFilter, shuffling, shuffleError, totalUnread, onAddFeed, onDeleteFeed, onSyncAll, onShuffle, onOpenFeed, onOpenUnread, onOpenSaved, onOpenSettings, onMarkAllRead, theme, onToggleTheme }: Props) {
  const [addUrl, setAddUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState<FeedSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showDiscovery, setShowDiscovery] = useState(false)
  const [discoverLang, setDiscoverLang] = useState('en')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const q = addUrl.trim()
    if (!q) { setSuggestions([]); setShowSuggestions(false); return }
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const results = await searchFeedlySuggestions(q)
      setSuggestions(results)
      setShowSuggestions(results.length > 0)
      setShowDiscovery(false)
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [addUrl])

  function closeSearch() {
    setShowSuggestions(false)
    setShowDiscovery(false)
    setAddUrl('')
    setSuggestions([])
    setError('')
  }

  async function handleAdd(url = addUrl) {
    const trimmed = url.trim()
    if (!trimmed) return
    setAdding(true)
    setError('')
    try {
      await onAddFeed(trimmed)
      closeSearch()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load feed.')
    } finally {
      setAdding(false)
    }
  }

  async function handlePickSuggestion(url: string) {
    await handleAdd(url)
  }

  const isActive = (f: ArticleFilter) => JSON.stringify(activeFilter) === JSON.stringify(f)

  return (
    <aside className="feed-panel">
      <header className="panel-header">
        <span className="app-title">Plume</span>
        <button className="icon-btn" onClick={onSyncAll} disabled={syncing} title="Sync all">
          <span className={syncing ? 'spin' : ''}>↻</span>
        </button>
        <button className="icon-btn" onClick={onToggleTheme} title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
        <button className="icon-btn" onClick={onOpenSettings} title="Settings">⚙</button>
      </header>

      <nav className="special-nav">
        <button className={`nav-btn ${isActive({ type: 'unread' }) ? 'active' : ''}`} onClick={onOpenUnread}>
          <span>All Unread</span>
          {totalUnread > 0 && <span className="badge">{totalUnread}</span>}
        </button>
        <button className={`nav-btn ${isActive({ type: 'saved' }) ? 'active' : ''}`} onClick={onOpenSaved}>
          Saved
        </button>
        <button className={`nav-btn shuffle-btn ${activeFilter.type === 'explore' ? 'active' : ''}`} onClick={onShuffle} disabled={shuffling}>
          {shuffling ? <span className="spin">↻</span> : '🔀'} Shuffle
        </button>
        {shuffleError && <p className="add-error">{shuffleError}</p>}
        {totalUnread > 0 && (
          <button className="nav-btn mark-all-btn" onClick={onMarkAllRead} title="Mark all as read">
            ✓ Mark all read
          </button>
        )}
      </nav>

      <div className="add-feed">
        <input
          type="text"
          placeholder="URL or site name…"
          value={addUrl}
          onChange={e => { setAddUrl(e.target.value); setError('') }}
          onFocus={() => { if (!addUrl.trim()) setShowDiscovery(true) }}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') closeSearch() }}
        />
        <button onClick={() => handleAdd()} disabled={adding || !addUrl.trim()}>
          {adding ? '…' : 'Add'}
        </button>
        {error && <p className="add-error">{error}</p>}
      </div>

      {showSuggestions ? (
        <>
          <div className="suggestions-header">
            <span>Search results</span>
            <button className="icon-btn" onClick={closeSearch}>✕</button>
          </div>
          <ul className="feed-list">
            {suggestions.map(s => (
              <li key={s.url} className="feed-item suggestion-item" onClick={() => handlePickSuggestion(s.url)}>
                {s.iconUrl
                  ? <img src={s.iconUrl} alt="" className="feed-icon" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  : <span className="feed-icon-placeholder">◉</span>
                }
                <div className="suggestion-info">
                  <span className="suggestion-title">{s.title || s.url}</span>
                  {s.website && <span className="suggestion-subs">{s.website.replace(/^https?:\/\//, '')}</span>}
                  {s.subscribers > 0 && <span className="suggestion-subs">{s.subscribers.toLocaleString()} followers</span>}
                </div>
                {adding ? <span className="spin" style={{ fontSize: 12 }}>↻</span> : <span className="suggestion-add">+</span>}
              </li>
            ))}
          </ul>
        </>
      ) : showDiscovery ? (
        <>
          <div className="suggestions-header">
            <span>Discover</span>
            <button className="icon-btn" onClick={closeSearch}>✕</button>
          </div>
          <div className="discover-langs">
            {EXPLORE_LANGUAGES.map(l => (
              <button key={l.code} className={`discover-lang-btn${discoverLang === l.code ? ' active' : ''}`} onClick={() => setDiscoverLang(l.code)}>
                {l.label}
              </button>
            ))}
          </div>
          <ul className="feed-list">
            {EXPLORE_FEEDS.filter(f => f.lang === discoverLang).map(f => (
              <li key={f.url} className="feed-item suggestion-item" onClick={() => handlePickSuggestion(f.url)}>
                <img src={`https://www.google.com/s2/favicons?domain=${new URL(f.url).origin}&sz=32`} alt="" className="feed-icon"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <div className="suggestion-info">
                  <span className="suggestion-title">{f.title}</span>
                  <span className="suggestion-subs">{new URL(f.url).hostname}</span>
                </div>
                {adding ? <span className="spin" style={{ fontSize: 12 }}>↻</span> : <span className="suggestion-add">+</span>}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <ul className="feed-list">
            {feeds.map(feed => {
              const active = activeFilter.type === 'feed' && activeFilter.feedId === feed.id
              return (
                <li key={feed.id} className={`feed-item ${active ? 'active' : ''}`}>
                  {feed.iconUrl
                    ? <img src={feed.iconUrl} alt="" className="feed-icon" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <span className="feed-icon-placeholder">◉</span>
                  }
                  <button className="feed-name" onClick={() => onOpenFeed(feed)}>{feed.title}</button>
                  {feed.unreadCount > 0 && <span className="badge">{feed.unreadCount}</span>}
                  <button className="icon-btn danger" onClick={() => onDeleteFeed(feed.id)} title="Remove">✕</button>
                </li>
              )
            })}
          </ul>
          {feeds.length === 0 && <p className="hint">Add your first RSS feed above.</p>}
        </>
      )}
    </aside>
  )
}
