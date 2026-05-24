import browser from 'webextension-polyfill'

export interface Settings {
  ttsLang: string
  exploreLangs: string[]
  pruneDays: number
  unreadOnly: boolean
  fontSize: number
  theme: 'dark' | 'light'
}

const DEFAULTS: Settings = {
  ttsLang: 'en-US',
  exploreLangs: ['en', 'hu'],
  pruneDays: 30,
  unreadOnly: false,
  fontSize: 15,
  theme: 'dark',
}

export async function getSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get('settings')
  return { ...DEFAULTS, ...(stored.settings as Partial<Settings> ?? {}) }
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await browser.storage.local.set({ settings: { ...current, ...patch } })
}
