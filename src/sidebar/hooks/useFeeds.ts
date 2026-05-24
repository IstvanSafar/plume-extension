import { useState, useEffect, useCallback } from 'react'
import browser from 'webextension-polyfill'
import { getFeeds, upsertFeed, deleteFeed as dbDeleteFeed } from '../../storage/db'
import { discoverFeedUrl } from '../../utils/feedDiscovery'
import type { Feed } from '../../types'

function generateFeedId(url: string): string {
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    hash = (Math.imul(31, hash) + url.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}

export function useFeeds() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [syncing, setSyncing] = useState(false)

  const reload = useCallback(async () => {
    setFeeds(await getFeeds())
  }, [])

  useEffect(() => { reload() }, [reload])

  const addFeed = useCallback(async (url: string) => {
    // Discover the actual feed URL (handles plain website URLs too)
    const feedUrl = await discoverFeedUrl(url)
    const id = generateFeedId(feedUrl)
    const newFeed: Feed = {
      id,
      url: feedUrl,
      title: feedUrl,
      unreadCount: 0,
      addedAt: Date.now(),
    }
    await upsertFeed(newFeed)
    await browser.runtime.sendMessage({ type: 'SYNC_FEED', feedId: id })
    await reload()
    await reload()
  }, [reload])

  const deleteFeed = useCallback(async (feedId: string) => {
    await dbDeleteFeed(feedId)
    await reload()
  }, [reload])

  const syncAll = useCallback(async () => {
    setSyncing(true)
    await browser.runtime.sendMessage({ type: 'SYNC_ALL' })
    await reload()
    setSyncing(false)
  }, [reload])

  return { feeds, syncing, addFeed, deleteFeed, syncAll, reload }
}
