import { useState, useEffect, useRef } from 'react'
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
  const animationFrameRef = useRef<number>()

  // 生成所有账户的验证码
  const generateCodes = async () => {
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
  }

  // 使用 requestAnimationFrame 实现精确的定时更新
  useEffect(() => {
    let lastTimestamp = Date.now()

    const updateTimer = () => {
      const currentTimestamp = Date.now()
      const currentRemaining = TOTP.getRemainingSeconds()

      // 检测是否需要重新生成验证码（跨越30秒边界）
      if (Math.floor(lastTimestamp / 30000) !== Math.floor(currentTimestamp / 30000)) {
        generateCodes()
      }

      setRemaining(currentRemaining)
      lastTimestamp = currentTimestamp

      animationFrameRef.current = requestAnimationFrame(updateTimer)
    }

    // 立即生成一次验证码
    generateCodes()

    // 开始动画循环
    animationFrameRef.current = requestAnimationFrame(updateTimer)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [accounts])

  return {
    codes,
    remaining,
    regenerate: generateCodes
  }
}
