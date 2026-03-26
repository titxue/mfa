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
  const intervalRef = useRef<number | undefined>(undefined)
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

  // 使用低频 interval 刷新剩余秒数，跨越 30 秒边界时再生成新验证码
  useEffect(() => {
    // 重置 step 标记，确保依赖变化时重新生成验证码
    lastStepRef.current = -1

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

    // 每 250ms 刷新一次 UI，避免每帧更新造成不必要开销
    intervalRef.current = window.setInterval(updateTimer, 250)

    return () => {
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
