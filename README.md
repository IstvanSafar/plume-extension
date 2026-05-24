# Plume RSS Reader

A clean, privacy-first RSS and Atom feed reader browser extension for Chrome, Edge, and Firefox.

![Plume RSS Reader](public/icons/promo-1400x560.png)

## Features

- Subscribe to any RSS or Atom feed by URL or site name
- Smart feed discovery — paste any website and Plume finds the feed automatically
- Search for feeds by name with built-in Feedly-powered suggestions
- Clean three-column layout: feeds · article list · reader
- Load full article content from the source website with one click
- Dark and light theme
- Keyboard navigation: `j/k` navigate, `m` mark read, `o` open original
- Save articles for later
- Automatic background sync every 30 minutes
- Explore mode — discover sources like BBC, The Guardian, TechCrunch, and more
- No account required, no tracking, no ads

## Privacy

All data is stored locally in your browser. Nothing is sent to any external server except the feed URLs you subscribe to. See [PRIVACY.md](PRIVACY.md) for details.

## Install

- **Microsoft Edge Add-ons:** *(coming soon)*
- **Firefox Add-ons:** *(coming soon)*
- **Chrome Web Store:** *(coming soon)*

## Development

```bash
npm install
npm run dev        # dev server at localhost:5173/app.html
npm run build      # production build → dist/
```

Or double-click `build.cmd` on Windows.

### Load unpacked in Edge / Chrome

1. Run `npm run build`
2. Go to `edge://extensions/` or `chrome://extensions/`
3. Enable Developer mode
4. Click "Load unpacked" and select the `dist/` folder

### Load in Firefox

1. Run `npm run build`
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on" and select `dist/manifest.json`

## Tech stack

- React 19 + TypeScript + Vite
- Dexie.js (IndexedDB)
- fast-xml-parser (RSS/Atom parsing)
- @mozilla/readability (full article extraction)
- webextension-polyfill (MV3 cross-browser)

## License

MIT
