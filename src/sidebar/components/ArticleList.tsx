import { useArticles } from '../hooks/useArticles'
import type { Article } from '../../types'
import type { ArticleFilter } from '../hooks/useArticles'

interface Props {
  filter: ArticleFilter
  label: string
  onBack: () => void
  onOpenArticle: (article: Article) => void
}

export function ArticleList({ filter, label, onBack, onOpenArticle }: Props) {
  const { articles, syncing, error, markRead, syncFeed } = useArticles(filter)

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  return (
    <div className="article-list">
      <header className="toolbar">
        <button className="icon-btn" onClick={onBack}>←</button>
        <span className="screen-title">{label}</span>
        {filter.type === 'feed' && (
          <button className="icon-btn" onClick={syncFeed} disabled={syncing} title="Refresh">
            {syncing ? '⏳' : '↻'}
          </button>
        )}
      </header>

      {error && <p className="error" style={{ padding: '8px 12px' }}>{error}</p>}
      {syncing && articles.length === 0 && <p className="empty">Loading articles…</p>}

      <ul className="articles">
        {articles.map(article => (
          <li
            key={article.id}
            className={`article-item ${article.isRead ? 'read' : ''}`}
            onClick={() => { markRead(article.id); onOpenArticle(article) }}
          >
            {article.imageUrl && (
              <img src={article.imageUrl} alt="" className="article-thumb" />
            )}
            <div className="article-meta">
              <span className="article-feed">{article.feedTitle}</span>
              <span className="article-date">{formatDate(article.publishedAt)}</span>
            </div>
            <p className="article-title">{article.title}</p>
            {article.summary && (
              <p className="article-summary">{article.summary.slice(0, 120)}…</p>
            )}
          </li>
        ))}
      </ul>

      {!syncing && articles.length === 0 && !error && (
        <p className="empty">No articles found.</p>
      )}
    </div>
  )
}
