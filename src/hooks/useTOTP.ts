import { useState, useEffect, useRef, useCallback } from 'react'
import type { Account } from '@/types'
import { TOTP } from '@/utils/totp'

interface TOTPCodes {
  [accountName: string]: string
}

/**
 * TOTP Hook - 管理验证码生成和定时更新
 */
export function useTOTP(accounts: Account[]) {
  const [codes, setCodes] = useState<TOTPCodes>({})
  const [remaining, setRemaining] = useState(30)
  const timeoutRef = useRef<number | undefined>(undefined)
  const intervalRef = useRef<number | undefined>(undefined)
  const lastStepRef = useRef<number>(-1)
  const generationIdRef = useRef(0)

  // 生成所有账户的验证码
  const generateCodes = useCallback(async () => {
    const currentGenerationId = ++generationIdRef.current
    const newCodes: TOTPCodes = {}

    for (const account of accounts) {
      try {
        const code = await TOTP.generateTOTP(account.secret)
        newCodes[account.name] = code
      } catch (error) {
        newCodes[account.name] = '------'
      }
    }

    // 避免异步竞态导致旧结果覆盖新结果
    if (generationIdRef.current === currentGenerationId) {
      setCodes(newCodes)
    }
  }, [accounts])

  // 使用秒级刷新策略：先对齐到下一秒边界，再每秒更新一次
  useEffect(() => {
    const updateTimer = () => {
      const currentStep = Math.floor(Date.now() / 30000)
      setRemaining(TOTP.getRemainingSeconds())

      if (lastStepRef.current !== currentStep) {
        lastStepRef.current = currentStep
        generateCodes()
      }
    }

    // 初始化：立即同步剩余时间与验证码
    updateTimer()

    // 对齐到下一秒边界，减少时间漂移
    const now = Date.now()
    const msToNextSecond = 1000 - (now % 1000)

    timeoutRef.current = window.setTimeout(() => {
      updateTimer()
      intervalRef.current = window.setInterval(updateTimer, 1000)
    }, msToNextSecond)

    return () => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current)
      }
      if (intervalRef.current !== undefined) {
        clearInterval(intervalRef.current)
      }
    }
  }, [generateCodes])

  return {
    codes,
    remaining,
    regenerate: generateCodes
  }
}
