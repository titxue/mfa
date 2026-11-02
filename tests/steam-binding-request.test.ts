import { expect, test } from 'bun:test'
import { withBindingDeadline } from '../src/steam-link/request'

test('completed binding requests return without waiting for the deadline', async () => {
  expect(await withBindingDeadline(Promise.resolve('ok'), 1000, 'timeout')).toBe('ok')
})
test('permission and background hangs become actionable errors', async () => {
  await expect(withBindingDeadline(new Promise(() => {}), 5, 'permissionTimeout')).rejects.toThrow('permissionTimeout')
  await expect(withBindingDeadline(new Promise(() => {}), 5, 'requestTimeout')).rejects.toThrow('requestTimeout')
})
test('late completion cannot replace an already timed-out result', async () => {
  let finish!: (value: string) => void
  const operation = new Promise<string>(resolve => { finish = resolve })
  const result = withBindingDeadline(operation, 5, 'requestTimeout')
  await expect(result).rejects.toThrow('requestTimeout')
  finish('late')
  await expect(result).rejects.toThrow('requestTimeout')
})
