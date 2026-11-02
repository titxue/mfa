import { expect, spyOn, test } from 'bun:test'
import { SteamLinkApi, type Requester } from '../src/steam-link/core'

// Exercise the real API's deadline with a short clock; never contact Steam.
async function withTransportDeadline(run: (activeTimers: Set<ReturnType<typeof setTimeout>>) => Promise<void>) {
  const originalSet = globalThis.setTimeout
  const originalClear = globalThis.clearTimeout
  const active = new Set<ReturnType<typeof setTimeout>>()
  const set = spyOn(globalThis, 'setTimeout').mockImplementation(((callback: (...args: any[]) => void, delay: number, ...args: any[]) => {
    let timer: ReturnType<typeof setTimeout>
    timer = originalSet(() => { active.delete(timer); callback(...args) }, delay === 15000 ? 20 : delay)
    active.add(timer)
    return timer
  }) as typeof setTimeout)
  const clear = spyOn(globalThis, 'clearTimeout').mockImplementation(timer => {
    active.delete(timer as ReturnType<typeof setTimeout>)
    originalClear(timer)
  })
  let watchdog: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([run(active), new Promise<never>((_resolve, reject) => {
      watchdog = originalSet(() => reject(new Error('Steam operation did not release its deadline')), 250)
    })])
  } finally {
    if (watchdog) originalClear(watchdog)
    set.mockRestore(); clear.mockRestore()
    for (const timer of active) originalClear(timer)
  }
}

const response = () => new Response(JSON.stringify({ response: { server_time: '1700000000' } }), { headers: { 'x-eresult': '1' } })

test('stalled response body aborts and releases the next serialized Steam operation', async () => {
  await withTransportDeadline(async active => {
    let calls = 0, aborted = false, failure: unknown
    const request: Requester = async (_url, init) => {
      if (++calls > 1) return response()
      return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(new TextEncoder().encode('{"response":'))
        init.signal!.addEventListener('abort', () => {
          aborted = true
          controller.error(new DOMException('Aborted', 'AbortError'))
        }, { once: true })
      } }), { headers: { 'x-eresult': '1' } })
    }
    const api = new SteamLinkApi(request)
    // The binding background chains operations after handling the prior rejection.
    const queued = api.time().catch(error => { failure = error }).then(() => api.time())
    expect(await queued).toBe(1700000000)
    expect(failure).toMatchObject({ code: 'network' })
    expect(aborted).toBe(true)
    expect(calls).toBe(2)
    expect(active.size).toBe(0)
  })
}, 1000)

test('failed body reading rejects promptly and a following Steam request can proceed', async () => {
  await withTransportDeadline(async active => {
    let calls = 0, failure: unknown
    const api = new SteamLinkApi(async () => {
      if (++calls > 1) return response()
      return new Response(new ReadableStream({ start(controller) { controller.error(new TypeError('Connection lost')) } }),
        { headers: { 'x-eresult': '1' } })
    })
    const queued = api.time().catch(error => { failure = error }).then(() => api.time())
    expect(await queued).toBe(1700000000)
    expect(failure).toMatchObject({ code: 'protocol' })
    expect(calls).toBe(2)
    expect(active.size).toBe(0)
  })
})

test('successful parsing and protocol or rate-limit errors all cancel their deadlines', async () => {
  await withTransportDeadline(async active => {
    const examples = [
      { make: response, error: undefined },
      { make: () => new Response('', { status: 429 }), error: { code: 'rateLimit', result: 429 } },
      { make: () => new Response('{}'), error: { code: 'protocol' } },
      { make: () => new Response('{}', { headers: { 'x-eresult': '5' } }), error: { code: 'steam', result: 5 } },
      { make: () => new Response('{', { headers: { 'x-eresult': '1' } }), error: { code: 'protocol' } },
    ]
    for (const example of examples) {
      const operation = new SteamLinkApi(async () => example.make()).time()
      if (example.error) await expect(operation).rejects.toMatchObject(example.error)
      else expect(await operation).toBe(1700000000)
      expect(active.size).toBe(0)
    }
  })
})
