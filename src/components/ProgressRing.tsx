import React from 'react'

interface ProgressRingProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
}

/**
 * SVG 进度环组件
 */
export function ProgressRing({
  value,
  max,
  size = 40,
  strokeWidth = 3
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progress = Math.max(0, Math.min(1, value / max))
  const strokeDashoffset = circumference * (1 - progress)

  // 根据剩余时间调整颜色
  const strokeColor = value <= 5 ? '#ef4444' : value <= 10 ? '#f59e0b' : '#10b981'

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg
        className="-rotate-90"
        width={size}
        height={size}
      >
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s ease'
          }}
        />
      </svg>
      {/* 中心文字 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold" style={{ color: strokeColor }}>
          {value}
        </span>
      </div>
    </div>
  )
}
