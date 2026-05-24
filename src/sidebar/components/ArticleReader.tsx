import { useState, useEffect } from 'react'
import browser from 'webextension-polyfill'
import { toggleArticleSaved } from '../../storage/db'
import type { Article } from '../../types'

interface Props {
  article: Article
  onBack: () => void
}

export function ArticleReader({ article, onBack }: Props) {
  const [content, setContent] = useState(article.content ?? '')
  const [saved, setSaved] = useState(article.isSaved)
  const [fetching, setFetching] = useState(false)
  const [ttsActive, setTtsActive] = useState(false)

  useEffect(() => {
    setContent(article.content ?? '')
    setSaved(article.isSaved)
  }, [article])

  async function handleFetchFull() {
    setFetching(true)
    await browser.runtime.sendMessage({ type: 'FETCH_FULL_CONTENT', articleId: article.id, articleUrl: article.url })
    setFetching(false)
  }

  async function handleToggleSaved() {
    await toggleArticleSaved(article.id)
    setSaved(s => !s)
  }

  function handleTts() {
    if (ttsActive) {
      window.speechSynthesis.cancel()
      setTtsActive(false)
      return
    }
    const text = new DOMParser().parseFromString(content || article.title, 'text/html').body.textContent ?? ''
    const utter = new SpeechSynthesisUtterance(text)
    utter.onend = () => setTtsActive(false)
    window.speechSynthesis.speak(utter)
    setTtsActive(true)
  }

  return (
    <div className="article-reader">
      <header className="toolbar">
        <button className="icon-btn" onClick={onBack}>←</button>
        <div className="toolbar-actions">
          <button className="icon-btn" onClick={handleTts} title={ttsActive ? 'Stop TTS' : 'Read aloud'}>
            {ttsActive ? '⏹' : '🔊'}
          </button>
          <button className="icon-btn" onClick={handleToggleSaved} title={saved ? 'Unsave' : 'Save'}>
            {saved ? '★' : '☆'}
          </button>
          <a href={article.url} target="_blank" rel="noreferrer" className="icon-btn" title="Open in tab">↗</a>
        </div>
      </header>

      <div className="reader-content">
        <p className="reader-feed">{article.feedTitle}</p>
        <h1 className="reader-title">{article.title}</h1>
        {article.author && <p className="reader-author">{article.author}</p>}

        {content ? (
          <div className="reader-body" dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <div className="reader-no-content">
            <p>No full content cached.</p>
            <button onClick={handleFetchFull} disabled={fetching}>
              {fetching ? 'Fetching…' : 'Fetch full article'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
