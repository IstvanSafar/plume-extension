import { useState, useCallback, useEffect } from 'react'
import browser from 'webextension-polyfill'
import { FeedPanel } from './components/FeedPanel'
import { ArticlePanel } from './components/ArticlePanel'
import { ReaderPanel } from './components/ReaderPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { useFeeds } from '../sidebar/hooks/useFeeds'
import { getSettings, saveSettings } from '../storage/settings'
import { markAllReadGlobal, recalcAllUnreadCounts } from '../storage/db'
import type { Article, Feed } from '../types'
import type { ArticleFilter } from '../sidebar/hooks/useArticles'

export default function App() {
  const { feeds, syncing, addFeed, deleteFeed, syncAll, reload: reloadFeeds } = useFeeds()
  const [filter, setFilter] = useState<ArticleFilter>({ type: 'unread' })
  const [filterLabel, setFilterLabel] = useState('All Unread')
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [shuffling, setShuffling] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [shuffleError, setShuffleError] = useState<string>('')
  const [articlePanelKey, setArticlePanelKey] = useState(0)

  useEffect(() => {
    getSettings().then(s => {
      setUnreadOnly(s.unreadOnly)
      setTheme(s.theme)
      document.documentElement.dataset.theme = s.theme
    })
  }, [])

  const totalUnread = feeds.reduce((sum, f) => sum + (f.unreadCount ?? 0), 0)

  function openFeed(feed: Feed) {
    setFilter({ type: 'feed', feedId: feed.id })
    setFilterLabel(feed.title)
    setSelectedArticle(null)
  }

  function openSpecial(type: 'unread' | 'saved', label: string) {
    setFilter({ type })
    setFilterLabel(label)
    setSelectedArticle(null)
  }

  const handleMarkAllRead = useCallback(async () => {
    await markAllReadGlobal()
    await recalcAllUnreadCounts()
    await reloadFeeds()
  }, [reloadFeeds])

  const handleShuffle = useCallback(async () => {
    setShuffling(true)
    setShuffleError('')
    try {
      const { exploreLangs } = await getSettings()
      const resp = await browser.runtime.sendMessage({ type: 'SHUFFLE', langs: exploreLangs }) as { ok: boolean; data?: Article }
      if (resp.ok && resp.data) {
        setFilter({ type: 'explore' })
        setFilterLabel('Shuffle')
        setSelectedArticle(resp.data)
      } else {
        setShuffleError('No articles found. Check your explore language settings.')
      }
    } catch (e) {
      setShuffleError(String(e))
    } finally {
      setShuffling(false)
    }
  }, [])

  async function handleToggleUnreadOnly() {
    const next = !unreadOnly
    setUnreadOnly(next)
    await saveSettings({ unreadOnly: next })
  }

  async function handleToggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    await saveSettings({ theme: next })
  }

  async function handleSettingsClose() {
    setShowSettings(false)
    const s = await getSettings()
    setUnreadOnly(s.unreadOnly)
    setTheme(s.theme)
    document.documentElement.dataset.theme = s.theme
  }

  return (
    <div className="layout">
      <FeedPanel
        feeds={feeds}
        syncing={syncing}
        activeFilter={filter}
        shuffling={shuffling}
        shuffleError={shuffleError}
        totalUnread={totalUnread}
        onAddFeed={addFeed}
        onDeleteFeed={deleteFeed}
        onSyncAll={syncAll}
        onShuffle={handleShuffle}
        onOpenFeed={openFeed}
        onOpenUnread={() => openSpecial('unread', 'All Unread')}
        onOpenSaved={() => openSpecial('saved', 'Saved')}
        onOpenSettings={() => setShowSettings(true)}
        onMarkAllRead={handleMarkAllRead}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
      <ArticlePanel
        key={`${articlePanelKey}-${JSON.stringify(filter)}`}
        filter={filter}
        label={filterLabel}
        selectedId={selectedArticle?.id}
        unreadOnly={unreadOnly}
        onOpenArticle={setSelectedArticle}
        onUnreadChanged={reloadFeeds}
        onToggleUnreadOnly={handleToggleUnreadOnly}
      />
      <ReaderPanel article={selectedArticle} />

      {showSettings && (
        <SettingsPanel
          onClose={handleSettingsClose}
          onFeedsChanged={reloadFeeds}
          onDataCleared={async () => {
            await reloadFeeds()
            setSelectedArticle(null)
            setArticlePanelKey(k => k + 1)
          }}
        />
      )}
    </div>
  )
}
