import type { Feed } from '../types'

export function exportOpml(feeds: Feed[]): string {
  const outlines = feeds.map(f =>
    `    <outline text="${esc(f.title)}" title="${esc(f.title)}" type="rss" xmlUrl="${esc(f.url)}" htmlUrl="${esc(f.url)}"/>`
  ).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
  <head><title>Plume RSS Subscriptions</title></head>
  <body>
${outlines}
  </body>
</opml>`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function importOpml(xml: string): { title: string; url: string }[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const results: { title: string; url: string }[] = []
  for (const el of doc.querySelectorAll('outline')) {
    const url = el.getAttribute('xmlUrl')
    if (!url) continue
    const title = el.getAttribute('title') ?? el.getAttribute('text') ?? url
    results.push({ title, url })
  }
  return results
}
