import puppeteer from 'puppeteer'
import { mkdir } from 'fs/promises'

const OUT = 'screenshots'
await mkdir(OUT, { recursive: true })

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })

// Seed demo data
await page.goto('http://localhost:5173/app.html', { waitUntil: 'networkidle0' })

// Inject DB data
await page.evaluate(async () => {
  const now = Date.now()
  const feeds = [
    { id: 'bbc', title: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', unreadCount: 9, addedAt: now - 6000 },
    { id: 'guardian', title: 'The Guardian', url: 'https://www.theguardian.com/world/rss', unreadCount: 6, addedAt: now - 5000 },
    { id: 'techcrunch', title: 'TechCrunch', url: 'https://techcrunch.com/feed/', unreadCount: 11, addedAt: now - 4000 },
    { id: 'ars', title: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', unreadCount: 4, addedAt: now - 3000 },
    { id: 'wired', title: 'Wired', url: 'https://www.wired.com/feed/rss', unreadCount: 5, addedAt: now - 2000 },
    { id: 'verge', title: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', unreadCount: 7, addedAt: now - 1000 },
  ]
  const articles = [
    { id: 'bbc:1', feedId: 'bbc', feedTitle: 'BBC News', title: 'US and China reach landmark trade agreement after months of talks', summary: 'The two largest economies have agreed to reduce tariffs on key goods in a deal described as a significant step toward stabilising global trade.', url: 'https://bbc.com/1', publishedAt: now - 600000, isRead: false, isSaved: false, cachedAt: now, content: '<p>The United States and China have reached a landmark trade agreement, pledging to reduce tariffs on hundreds of goods in a deal that negotiators say could reshape the global economic order.</p><p>After eighteen months of on-and-off negotiations, officials from both sides signed a preliminary accord in Geneva on Friday, committing to a phased reduction of duties on electronics, agricultural products, and manufactured goods over the next three years.</p><h2>What the deal covers</h2><p>The agreement includes commitments from Beijing to purchase an additional $200 billion in US agricultural exports annually, while Washington will ease restrictions on certain Chinese technology companies currently subject to export controls.</p><p>"This is a significant step toward a more stable and predictable trading relationship," said the US Trade Representative at a press conference. "It will create jobs on both sides of the Pacific."</p><h2>Market reaction</h2><p>Global stock markets surged on the news, with the S&P 500 gaining 2.3% and the Shanghai Composite rising 1.8%. The US dollar strengthened against major currencies as investors priced in the prospect of reduced economic uncertainty.</p><p>Analysts cautioned, however, that the deal still needs to clear several domestic political hurdles before it can be fully implemented.</p>' },
    { id: 'bbc:2', feedId: 'bbc', feedTitle: 'BBC News', title: 'Scientists discover potential new treatment for Alzheimer\'s disease', summary: 'Researchers have identified a protein that may slow the progression of the disease, offering hope for millions of patients worldwide.', url: 'https://bbc.com/2', publishedAt: now - 2400000, isRead: false, isSaved: true, cachedAt: now },
    { id: 'bbc:3', feedId: 'bbc', feedTitle: 'BBC News', title: 'Record temperatures expected across Europe this summer', summary: 'Meteorologists warn that several countries could see their hottest June on record amid a persistent heatwave.', url: 'https://bbc.com/3', publishedAt: now - 5400000, isRead: true, isSaved: false, cachedAt: now },
    { id: 'techcrunch:1', feedId: 'techcrunch', feedTitle: 'TechCrunch', title: 'OpenAI unveils new reasoning model with dramatic performance gains', summary: 'The company claims the new model outperforms GPT-4o on math, science, and coding benchmarks by a significant margin.', url: 'https://techcrunch.com/1', publishedAt: now - 1200000, isRead: false, isSaved: false, cachedAt: now },
    { id: 'techcrunch:2', feedId: 'techcrunch', feedTitle: 'TechCrunch', title: 'Stripe raises $1.1B in secondary share sale at $91B valuation', summary: 'The fintech giant continues to delay a public offering while rewarding employees and early investors with liquidity.', url: 'https://techcrunch.com/2', publishedAt: now - 3600000, isRead: false, isSaved: false, cachedAt: now },
    { id: 'guardian:1', feedId: 'guardian', feedTitle: 'The Guardian', title: 'UK announces sweeping reforms to housing planning laws', summary: 'The government plans to fast-track approvals for new homes in a bid to address the chronic shortage of affordable housing.', url: 'https://guardian.com/1', publishedAt: now - 900000, isRead: false, isSaved: false, cachedAt: now },
    { id: 'ars:1', feedId: 'ars', feedTitle: 'Ars Technica', title: 'NASA\'s Artemis III moon landing faces further delays, sources say', summary: 'The crewed lunar mission originally planned for 2026 is unlikely to launch before 2028 due to spacesuit and lander issues.', url: 'https://arstechnica.com/1', publishedAt: now - 1800000, isRead: false, isSaved: false, cachedAt: now },
    { id: 'wired:1', feedId: 'wired', feedTitle: 'Wired', title: 'The quiet rise of AI-generated scientific papers', summary: 'A growing number of peer-reviewed studies are showing signs of machine-generated text, raising questions about research integrity.', url: 'https://wired.com/1', publishedAt: now - 7200000, isRead: false, isSaved: false, cachedAt: now },
    { id: 'verge:1', feedId: 'verge', feedTitle: 'The Verge', title: 'Apple\'s WWDC 2026: everything announced in one place', summary: 'From iOS 20 to a redesigned Mac Pro, here is a complete roundup of every product and software update revealed at this year\'s developer conference.', url: 'https://theverge.com/1', publishedAt: now - 4200000, isRead: false, isSaved: false, cachedAt: now },
  ]
  await new Promise((resolve, reject) => {
    const req = indexedDB.open('PlumeRSS')
    req.onsuccess = e => {
      const db = e.target.result
      const tx1 = db.transaction('feeds', 'readwrite')
      feeds.forEach(f => tx1.objectStore('feeds').put(f))
      tx1.oncomplete = () => {
        const tx2 = db.transaction('articles', 'readwrite')
        articles.forEach(a => tx2.objectStore('articles').put(a))
        tx2.oncomplete = resolve
        tx2.onerror = reject
      }
      tx1.onerror = reject
    }
    req.onerror = reject
  })
})

await page.reload({ waitUntil: 'networkidle0' })
await new Promise(r => setTimeout(r, 1500))

// Screenshot 1: All Unread overview
await page.screenshot({ path: `${OUT}/01-all-unread-dark.png` })
console.log('1/4 done')

// Screenshot 2: Telex feed + open article (full content)
await page.click('.feed-name')
await new Promise(r => setTimeout(r, 500))
const articleRows = await page.$$('.article-row')
if (articleRows[0]) await articleRows[0].click()
await new Promise(r => setTimeout(r, 500))
await page.screenshot({ path: `${OUT}/02-telex-article-dark.png` })
console.log('2/4 done')

// Screenshot 3: Light theme
await page.click('.icon-btn[title*="light"], .icon-btn[title*="Switch"]')
await new Promise(r => setTimeout(r, 300))
await page.screenshot({ path: `${OUT}/03-telex-article-light.png` })
console.log('3/4 done')

// Screenshot 4: Feed search / discover
await page.click('.icon-btn[title*="light"], .icon-btn[title*="Switch"]')
await new Promise(r => setTimeout(r, 300))
const addInput = await page.$('.add-feed input')
if (addInput) {
  await addInput.focus()
  await new Promise(r => setTimeout(r, 500))
  await page.screenshot({ path: `${OUT}/04-discover.png` })
}
console.log('4/4 done')

await browser.close()
console.log('Screenshots saved to screenshots/')
