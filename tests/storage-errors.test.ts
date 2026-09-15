import { expect, test } from 'bun:test'
import { StorageManager } from '../src/utils/storage'

test('settings and language writes report storage failures to callers', async () => {
  const previous = globalThis.chrome
  globalThis.chrome = { storage: { sync: {
    set: async () => { throw new Error('storageError') },
    remove: async () => { throw new Error('storageError') },
  } } } as unknown as typeof chrome
  try {
    await expect(StorageManager.saveSettings({ autofillInlineMenu: false, clipboardFallback: true })).rejects.toThrow('storageError')
    await expect(StorageManager.saveLanguage('en-US')).rejects.toThrow('storageError')
    await expect(StorageManager.removeLanguage()).rejects.toThrow('storageError')
  } finally { globalThis.chrome = previous }
})
