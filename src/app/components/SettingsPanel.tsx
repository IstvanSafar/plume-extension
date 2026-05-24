import { useState, useEffect, useRef } from 'react'
import browser from 'webextension-polyfill'
import { getSettings, saveSettings } from '../../storage/settings'
import { EXPLORE_LANGUAGES, TTS_VOICES } from '../../explore/feeds'
import { exportOpml, importOpml } from '../../explore/opml'
import { getFeeds, upsertFeed, getArticleCount, pruneOldArticles, clearAllData } from '../../storage/db'
import type { Feed } from '../../types'

interface Props {
  onClose: () => void
  onFeedsChanged: () => void
  onDataCleared?: () => Promise<void>
}

function generateId(url: string): string {
  let hash = 0
  for (let i = 0; i < url.length; i++) hash = (Math.imul(31, hash) + url.charCodeAt(i)) | 0
  return Math.abs(hash).toString(36)
}

export function SettingsPanel({ onClose, onFeedsChanged, onDataCleared }: Props) {
  const [ttsLang, setTtsLang] = useState('en-US')
  const [exploreLangs, setExploreLangs] = useState<string[]>(['en', 'hu'])
  const [pruneDays, setPruneDays] = useState(30)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [articleCount, setArticleCount] = useState(0)
  const [importing, setImporting] = useState(false)
  const [pruning, setPruning] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSettings().then(s => {
      setTtsLang(s.ttsLang)
      setExploreLangs(s.exploreLangs)
      setPruneDays(s.pruneDays)
      setUnreadOnly(s.unreadOnly)
    })
    getArticleCount().then(setArticleCount)
  }, [])

  async function handleSave() {
    await saveSettings({ ttsLang, exploreLangs, pruneDays, unreadOnly })
    onClose()
  }

  function toggleLang(code: string) {
    setExploreLangs(prev => prev.includes(code) ? prev.filter(l => l !== code) : [...prev, code])
  }

  async function handleExport() {
    const feeds = await getFeeds()
    const opml = exportOpml(feeds)
    const blob = new Blob([opml], { type: 'text/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'plume-feeds.opml'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const xml = await file.text()
      const entries = importOpml(xml)
      for (const { title, url } of entries) {
        const id = generateId(url)
        const feed: Feed = { id, url, title, unreadCount: 0, addedAt: Date.now() }
        await upsertFeed(feed)
      }
      onFeedsChanged()
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handlePruneNow() {
    setPruning(true)
    await pruneOldArticles(pruneDays)
    setArticleCount(await getArticleCount())
    setPruning(false)
  }

  return (
    <div className="settings-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="settings-panel">
        <header className="settings-header">
          <span>Settings</span>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </header>

        <section className="settings-section">
          <h3>Reading</h3>
          <label className="settings-row">
            <input type="checkbox" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)} />
            Show only unread articles in feed view
          </label>
        </section>

        <section className="settings-section">
          <h3>TTS Language</h3>
          <select value={ttsLang} onChange={e => setTtsLang(e.target.value)} className="settings-select">
            {TTS_VOICES.map(v => <option key={v.code} value={v.code}>{v.label}</option>)}
          </select>
        </section>

        <section className="settings-section">
          <h3>Explore / Shuffle Languages</h3>
          <p className="settings-hint">Which languages to include in the random article shuffle.</p>
          <div className="lang-grid">
            {EXPLORE_LANGUAGES.map(l => (
              <label key={l.code} className="lang-check">
                <input type="checkbox" checked={exploreLangs.includes(l.code)} onChange={() => toggleLang(l.code)} />
                {l.label}
              </label>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h3>Cache</h3>
          <p className="settings-hint">Cached articles: <strong>{articleCount}</strong></p>
          <label className="settings-row" style={{ marginBottom: 10 }}>
            Keep articles for
            <select value={pruneDays} onChange={e => setPruneDays(Number(e.target.value))} className="settings-select-inline">
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </label>
          <button className="settings-btn" onClick={handlePruneNow} disabled={pruning}>
            {pruning ? 'Clearing…' : 'Clear old articles now'}
          </button>
        </section>

        <section className="settings-section">
          <h3>OPML</h3>
          <div className="opml-btns">
            <button className="settings-btn" onClick={handleExport}>Export feeds.opml</button>
            <button className="settings-btn" onClick={() => fileRef.current?.click()} disabled={importing}>
              {importing ? 'Importing…' : 'Import .opml file'}
            </button>
            <input ref={fileRef} type="file" accept=".opml,text/xml" style={{ display: 'none' }} onChange={handleImport} />
          </div>
        </section>

        <section className="settings-section">
          <h3>Danger Zone</h3>
          {!confirmClear ? (
            <button className="settings-btn danger-btn" onClick={() => setConfirmClear(true)}>
              Clear all cached articles
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p className="settings-hint" style={{ color: 'var(--danger)' }}>
                Delete all cached articles? Feeds are kept, articles reload on next sync.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="settings-btn danger-btn"
                  disabled={clearing}
                  onClick={async () => {
                    setClearing(true)
                    await clearAllData()
                    setArticleCount(0)
                    setClearing(false)
                    setConfirmClear(false)
                    await onDataCleared?.()
                  }}
                >
                  {clearing ? 'Clearing…' : 'Yes, delete all'}
                </button>
                <button className="settings-btn" onClick={() => setConfirmClear(false)}>Cancel</button>
              </div>
            </div>
          )}
        </section>

        <footer className="settings-footer">
          <span className="settings-version">Plume {browser.runtime.getManifest().version}</span>
          <button className="settings-save" onClick={handleSave}>Save & Close</button>
        </footer>
      </div>
    </div>
  )
}
