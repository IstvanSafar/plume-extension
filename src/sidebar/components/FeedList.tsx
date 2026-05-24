import { useState } from 'react'
import type { Feed } from '../../types'

interface Props {
  feeds: Feed[]
  syncing: boolean
  onAddFeed: (url: string) => Promise<void>
  onDeleteFeed: (feedId: string) => Promise<void>
  onSyncAll: () => Promise<void>
  onOpenFeed: (feed: Feed) => void
  onOpenUnread: () => void
  onOpenSaved: () => void
}

export function FeedList({ feeds, syncing, onAddFeed, onDeleteFeed, onSyncAll, onOpenFeed, onOpenUnread, onOpenSaved }: Props) {
  const [addUrl, setAddUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd() {
    const url = addUrl.trim()
    if (!url) return
    setAdding(true)
    setError('')
    try {
      await onAddFeed(url)
      setAddUrl('')
    } catch {
      setError('Could not load feed. Check the URL.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="feed-list">
      <header className="toolbar">
        <span className="app-title">Plume</span>
        <button className="icon-btn" onClick={onSyncAll} disabled={syncing} title="Sync all">
          {syncing ? '⏳' : '↻'}
        </button>
      </header>

      <div className="special-feeds">
        <button className="special-btn" onClick={onOpenUnread}>All Unread</button>
        <button className="special-btn" onClick={onOpenSaved}>Saved</button>
      </div>

      <div className="add-feed">
        <input
          type="url"
          placeholder="RSS feed URL…"
          value={addUrl}
          onChange={e => setAddUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} disabled={adding || !addUrl.trim()}>
          {adding ? '…' : 'Add'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      <ul className="feeds">
        {feeds.map(feed => (
          <li key={feed.id} className="feed-item">
            {feed.iconUrl && <img src={feed.iconUrl} alt="" className="feed-icon" />}
            <button className="feed-title" onClick={() => onOpenFeed(feed)}>
              {feed.title}
              {feed.unreadCount > 0 && <span className="badge">{feed.unreadCount}</span>}
            </button>
            <button className="icon-btn danger" onClick={() => onDeleteFeed(feed.id)} title="Remove">✕</button>
          </li>
        ))}
      </ul>

      {feeds.length === 0 && (
        <p className="empty">No feeds yet. Add an RSS URL above.</p>
      )}
    </div>
  )
}
