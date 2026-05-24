export interface ExploreFeed {
  title: string
  url: string
  lang: string
}

export const EXPLORE_FEEDS: ExploreFeed[] = [
  // English
  { title: 'BBC News',       url: 'https://feeds.bbci.co.uk/news/rss.xml',              lang: 'en' },
  { title: 'The Guardian',   url: 'https://www.theguardian.com/international/rss',       lang: 'en' },
  { title: 'Reuters',        url: 'https://feeds.reuters.com/reuters/topNews',           lang: 'en' },
  { title: 'Hacker News',    url: 'https://news.ycombinator.com/rss',                   lang: 'en' },
  { title: 'The Verge',      url: 'https://www.theverge.com/rss/index.xml',             lang: 'en' },
  { title: 'TechCrunch',     url: 'https://techcrunch.com/feed/',                       lang: 'en' },
  { title: 'r/worldnews',    url: 'https://www.reddit.com/r/worldnews/.rss',            lang: 'en' },
  { title: 'r/technology',   url: 'https://www.reddit.com/r/technology/.rss',           lang: 'en' },
  // Hungarian
  { title: 'Telex',          url: 'https://telex.hu/rss',                               lang: 'hu' },
  { title: '24.hu',          url: 'https://24.hu/feed/',                                lang: 'hu' },
  { title: 'Index.hu',       url: 'https://index.hu/24ora/rss/',                        lang: 'hu' },
  { title: 'HVG',            url: 'https://hvg.hu/rss',                                lang: 'hu' },
  // German
  { title: 'Der Spiegel',    url: 'https://www.spiegel.de/index.rss',                  lang: 'de' },
  { title: 'Die Zeit',       url: 'https://newsfeed.zeit.de/index',                    lang: 'de' },
  // French
  { title: 'Le Monde',       url: 'https://www.lemonde.fr/rss/une.xml',               lang: 'fr' },
  { title: 'Le Figaro',      url: 'https://lefigaro.fr/rss/figaro_actualites.xml',    lang: 'fr' },
  // Spanish
  { title: 'El País',        url: 'https://elpais.com/rss/elpais/portada.xml',        lang: 'es' },
  { title: 'El Mundo',       url: 'https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml', lang: 'es' },
]

export const EXPLORE_LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hu', label: 'Magyar' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
]

export const TTS_VOICES: { code: string; label: string }[] = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'hu-HU', label: 'Magyar' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'es-ES', label: 'Español' },
]
