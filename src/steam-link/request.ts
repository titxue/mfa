/** Bound UI waits without retrying a potentially state-changing background operation. */
export async function withBindingDeadline<T>(operation: Promise<T>, milliseconds: number, code: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([operation, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(code)), milliseconds)
    })])
  } finally { if (timer) clearTimeout(timer) }
}
