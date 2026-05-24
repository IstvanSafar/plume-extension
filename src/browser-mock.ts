const browser = {
  runtime: {
    sendMessage: async () => ({ ok: false, error: 'Not available in dev mode' }),
    getURL: (path: string) => path,
  },
  alarms: { create: () => {}, onAlarm: { addListener: () => {} } },
  action: { onClicked: { addListener: () => {} } },
  tabs: { query: async () => [], create: async () => {}, update: async () => {} },
}
export default browser
