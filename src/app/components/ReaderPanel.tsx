import { useState, useEffect } from 'react'
import { toggleArticleSaved, updateArticleContent } from '../../storage/db'
import { getSettings, saveSettings } from '../../storage/settings'
import { TTS_VOICES } from '../../explore/feeds'
import type { Article } from '../../types'

interface Props {
  article: Article | null
}

export function ReaderPanel({ article }: Props) {
  const [saved, setSaved] = useState(false)
  const [content, setContent] = useState('')
  const [fetching, setFetching] = useState(false)
  const [ttsActive, setTtsActive] = useState(false)
  const [ttsLang, setTtsLang] = useState('en-US')
  const [fontSize, setFontSize] = useState(15)

  useEffect(() => {
    getSettings().then(s => { setTtsLang(s.ttsLang); setFontSize(s.fontSize) })
  }, [])

  useEffect(() => {
    window.speechSynthesis.cancel()
    setTtsActive(false)
    if (!article) return
    setSaved(article.isSaved)
    setContent(article.content ?? '')
  }, [article])

  async function handleToggleSaved() {
    if (!article) return
    await toggleArticleSaved(article.id)
    setSaved(s => !s)
  }

  async function handleFetchFull() {
    if (!article) return
    setFetching(true)
    try {
      const res = await fetch(article.url)
      const html = await res.text()
      const doc = new DOMParser().parseFromString(html, 'text/html')
      // Set base URL so relative links resolve correctly
      const base = doc.createElement('base')
      base.href = article.url
      doc.head.prepend(base)
      const { Readability } = await import('@mozilla/readability')
      const parsed = new Readability(doc).parse()
      if (parsed?.content) {
        setContent(parsed.content)
        await updateArticleContent(article.id, parsed.content)
      }
    } finally {
      setFetching(false)
    }
  }

  function handleTts() {
    if (ttsActive) { window.speechSynthesis.cancel(); setTtsActive(false); return }
    const raw = content
      ? new DOMParser().parseFromString(content, 'text/html').body.textContent ?? ''
      : article?.title ?? ''
    const utter = new SpeechSynthesisUtterance(raw)
    utter.lang = ttsLang
    utter.onend = () => setTtsActive(false)
    window.speechSynthesis.speak(utter)
    setTtsActive(true)
  }

  async function handleTtsLangChange(lang: string) {
    setTtsLang(lang)
    await saveSettings({ ttsLang: lang })
  }

  async function changeFontSize(delta: number) {
    const next = Math.max(12, Math.min(22, fontSize + delta))
    setFontSize(next)
    await saveSettings({ fontSize: next })
  }

  // Keyboard: o = open original
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'o' && article) window.open(article.url, '_blank')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [article])

  if (!article) {
    return (
      <main className="reader-panel empty-reader">
        <div className="empty-reader-hint">
          <p>Select an article to read</p>
          <p className="kbd-hint">j / k — navigate &nbsp;·&nbsp; m — mark read &nbsp;·&nbsp; o — open original</p>
        </div>
      </main>
    )
  }

  return (
    <main className="reader-panel">
      <header className="reader-toolbar">
        <div className="reader-meta">
          <span className="reader-feed-tag">{article.feedTitle}</span>
          <span className="reader-date">{new Date(article.publishedAt).toLocaleString(undefined, {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}</span>
        </div>
        <div className="reader-actions">
          <button className="icon-btn font-btn" onClick={() => changeFontSize(-1)} title="Smaller">A-</button>
          <button className="icon-btn font-btn" onClick={() => changeFontSize(1)} title="Larger">A+</button>
          <select className="tts-lang-select" value={ttsLang} onChange={e => handleTtsLangChange(e.target.value)} title="TTS language">
            {TTS_VOICES.map(v => <option key={v.code} value={v.code}>{v.label}</option>)}
          </select>
          <button className="icon-btn" onClick={handleTts} title={ttsActive ? 'Stop' : 'Read aloud'}>
            {ttsActive ? '⏹' : '🔊'}
          </button>
          <button className="icon-btn" onClick={handleToggleSaved} title={saved ? 'Unsave' : 'Save'}>
            {saved ? '★' : '☆'}
          </button>
          <a href={article.url} target="_blank" rel="noreferrer" className="icon-btn" title="Open original (o)">↗</a>
        </div>
      </header>

      <div className="reader-content">
        <h1 className="reader-title">{article.title}</h1>
        {article.author && <p className="reader-author">by {article.author}</p>}

        {content ? (
          <div className="reader-body" style={{ fontSize }} dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <div className="reader-no-content">
            {article.summary && (
              <p className="reader-summary" style={{ fontSize }}>{article.summary.replace(/<[^>]+>/g, '')}</p>
            )}
            <button className="fetch-btn" onClick={handleFetchFull} disabled={fetching}>
              {fetching ? 'Fetching…' : 'Load full article'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
