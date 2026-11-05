import { useState, useEffect, useRef, useCallback } from 'react'
import type { Account, TOTPAlgorithm } from '@/types'
import { TOTP } from '@/utils/totp'

interface TOTPCodes {
  [accountName: string]: string
}

interface RemainingSeconds {
  [accountName: string]: number
}

interface Credential {
  name: string
  secret: string
  type: Account['type']
  algorithm: TOTPAlgorithm
  digits: number
  period: number
}

/**
 * TOTP Hook - 管理验证码生成和定时更新
 * 每个账户可以有独立的算法（SHA1/SHA256/SHA512）、位数（6/8）与步长（默认 30 秒）
 */
export function useTOTP(accounts: Account[]) {
  // 验证码与列表顺序、网站配置无关；保存回读的新对象也不应清空验证码。
  const credentials = JSON.stringify(
    accounts.map(({ name, secret, type, algorithm, digits, period }): Credential => ({
      name,
      secret,
      type: type || 'totp',
      algorithm: algorithm || 'SHA1',
      digits: digits || (type === 'steam' ? 5 : 6),
      period: period || 30
    })).sort((a, b) => a.name.localeCompare(b.name))
  )
  const [codes, setCodes] = useState<TOTPCodes>({})
  const [remainings, setRemainings] = useState<RemainingSeconds>({})
  const [remaining, setRemaining] = useState(30)
  const timeoutRef = useRef<number | undefined>(undefined)
  const generation = useRef(0)
  const stepsRef = useRef<Record<string, number>>({})

  // 生成所有账户的验证码
  const generateCodes = useCallback(async () => {
    const id = ++generation.current
    const newCodes: TOTPCodes = {}
    const newRemainings: RemainingSeconds = {}
    const now = Date.now()

    for (const { name, secret, type, algorithm, digits, period } of JSON.parse(credentials) as Credential[]) {
      newRemainings[name] = period - (Math.floor(now / 1000) % period)
      try {
        newCodes[name] = await TOTP.generateTOTP(secret, period, type, undefined, { algorithm, digits })
      } catch (error) {
        newCodes[name] = '-'.repeat(digits)
      }
    }

    if (id === generation.current) {
      setCodes(newCodes)
      setRemainings(newRemainings)
    }
  }, [credentials])

  // 调度到下一个整秒执行
  const scheduleNext = () => {
    const now = Date.now()
    const delay = 1000 - (now % 1000)
    timeoutRef.current = window.setTimeout(updateTimer, delay)
  }

  const updateTimer = () => {
    const now = Date.now()
    const list = JSON.parse(credentials) as Credential[]
    const steps: Record<string, number> = {}
    const newRemainings: RemainingSeconds = {}
    let stepChanged = false
    for (const { name, period } of list) {
      const step = Math.floor(now / 1000 / period)
      if (stepsRef.current[name] !== step) stepChanged = true
      steps[name] = step
      newRemainings[name] = period - (Math.floor(now / 1000) % period)
    }
    stepsRef.current = steps
    setRemainings(newRemainings)
    setRemaining(30 - (Math.floor(now / 1000) % 30))

    if (stepChanged) generateCodes()

    scheduleNext()
  }

  // 自适应定时更新：只在每秒整点执行，零无用调用
  useEffect(() => {
    // 重置 step 标记，确保依赖变化时重新生成验证码
    generation.current++
    stepsRef.current = {}
    setCodes({})
    setRemainings({})

    // 立即执行一次初始化
    updateTimer()

    const resume = () => {
      if (document.visibilityState !== 'visible') return
      clearTimeout(timeoutRef.current)
      stepsRef.current = {}
      updateTimer()
    }
    window.addEventListener('focus', resume)
    document.addEventListener('visibilitychange', resume)

    return () => {
      generation.current++
      window.removeEventListener('focus', resume)
      document.removeEventListener('visibilitychange', resume)
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [generateCodes])

  return {
    codes,
    remaining,
    remainings,
    regenerate: generateCodes
  }
}
