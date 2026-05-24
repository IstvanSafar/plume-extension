export interface Feed {
  id: string
  url: string
  title: string
  description?: string
  iconUrl?: string
  unreadCount: number
  lastFetchedAt?: number
  addedAt: number
}

export interface Article {
  id: string
  feedId: string
  feedTitle: string
  title: string
  url: string
  author?: string
  publishedAt: number
  summary?: string
  content?: string
  imageUrl?: string
  isRead: boolean
  isSaved: boolean
  cachedAt: number
}

export type SyncStatus = 'idle' | 'syncing' | 'error'

export interface BackgroundMessage {
  type: 'SYNC_ALL' | 'SYNC_FEED' | 'FETCH_FULL_CONTENT' | 'MARK_READ' | 'SHUFFLE'
  feedId?: string
  articleId?: string
  articleUrl?: string
  langs?: string[]
}

export interface BackgroundResponse {
  ok: boolean
  error?: string
  data?: unknown
}
