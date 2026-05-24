import { useState } from 'react'
import { FeedList } from './components/FeedList'
import { ArticleList } from './components/ArticleList'
import { ArticleReader } from './components/ArticleReader'
import { useFeeds } from './hooks/useFeeds'
import type { Article, Feed } from '../types'
import type { ArticleFilter } from './hooks/useArticles'
import './App.css'

type View = 'feeds' | 'articles' | 'reader'

export default function App() {
  const { feeds, syncing, addFeed, deleteFeed, syncAll } = useFeeds()
  const [view, setView] = useState<View>('feeds')
  const [filter, setFilter] = useState<ArticleFilter>({ type: 'unread' })
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [filterLabel, setFilterLabel] = useState('Unread')

  function openFeed(feed: Feed) {
    setFilter({ type: 'feed', feedId: feed.id })
    setFilterLabel(feed.title)
    setView('articles')
  }

  function openSpecial(type: 'unread' | 'saved', label: string) {
    setFilter({ type })
    setFilterLabel(label)
    setView('articles')
  }

  function openArticle(article: Article) {
    setSelectedArticle(article)
    setView('reader')
  }

  function goBack() {
    if (view === 'reader') setView('articles')
    else setView('feeds')
  }

  return (
    <div className="app">
      {view === 'feeds' && (
        <FeedList
          feeds={feeds}
          syncing={syncing}
          onAddFeed={addFeed}
          onDeleteFeed={deleteFeed}
          onSyncAll={syncAll}
          onOpenFeed={openFeed}
          onOpenUnread={() => openSpecial('unread', 'Unread')}
          onOpenSaved={() => openSpecial('saved', 'Saved')}
        />
      )}
      {view === 'articles' && (
        <ArticleList
          filter={filter}
          label={filterLabel}
          onBack={goBack}
          onOpenArticle={openArticle}
        />
      )}
      {view === 'reader' && selectedArticle && (
        <ArticleReader
          article={selectedArticle}
          onBack={goBack}
        />
      )}
    </div>
  )
}
