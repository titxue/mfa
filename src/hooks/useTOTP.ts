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
  const lastStepRef = useRef<number>(-1)

  // 生成所有账户的验证码
  const generateCodes = useCallback(async () => {
    const newCodes: TOTPCodes = {}

    for (const account of accounts) {
      try {
        const code = await TOTP.generateTOTP(account.secret)
        newCodes[account.name] = code
      } catch (error) {
        newCodes[account.name] = '------'
      }
    }

    setCodes(newCodes)
  }, [accounts])

  // 调度到下一个整秒执行
  const scheduleNext = () => {
    const now = Date.now()
    const nextSecond = Math.ceil(now / 1000) * 1000
    const delay = nextSecond - now
    timeoutRef.current = window.setTimeout(updateTimer, delay)
  }

  const updateTimer = () => {
    const currentStep = Math.floor(Date.now() / 30000)
    setRemaining(TOTP.getRemainingSeconds())

    if (lastStepRef.current !== currentStep) {
      lastStepRef.current = currentStep
      generateCodes()
    }

    scheduleNext()
  }

  // 自适应定时更新：只在每秒整点执行，零无用调用
  useEffect(() => {
    // 重置 step 标记，确保依赖变化时重新生成验证码
    lastStepRef.current = -1

    // 立即执行一次初始化
    updateTimer()

    return () => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [generateCodes])

  return {
    codes,
    remaining,
    regenerate: generateCodes
  }
}
