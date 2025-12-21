/**
 * 图标生成脚本
 * 使用 Canvas 生成 TOTP 扩展图标（16x16, 48x48, 128x128）
 */

import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'

// 检查是否安装了 canvas 包
let Canvas: any
try {
  Canvas = await import('canvas')
} catch (error) {
  console.error('❌ canvas 包未安装')
  console.log('请运行: bun add -d canvas')
  process.exit(1)
}

const { createCanvas } = Canvas

// 图标尺寸
const sizes = [16, 48, 128]

// 创建输出目录
if (!existsSync('./public/icons')) {
  await mkdir('./public/icons', { recursive: true })
}

// 生成图标
for (const size of sizes) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // 背景渐变
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, '#4f46e5') // indigo-600
  gradient.addColorStop(1, '#7c3aed') // violet-600
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  // 绘制圆角矩形背景
  const radius = size * 0.15
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(size - radius, 0)
  ctx.quadraticCurveTo(size, 0, size, radius)
  ctx.lineTo(size, size - radius)
  ctx.quadraticCurveTo(size, size, size - radius, size)
  ctx.lineTo(radius, size)
  ctx.quadraticCurveTo(0, size, 0, size - radius)
  ctx.lineTo(0, radius)
  ctx.quadraticCurveTo(0, 0, radius, 0)
  ctx.closePath()
  ctx.fill()

  // 绘制锁的符号（简化版）
  ctx.strokeStyle = '#ffffff'
  ctx.fillStyle = '#ffffff'
  ctx.lineWidth = Math.max(2, size / 24)

  // 锁身（矩形）
  const lockWidth = size * 0.4
  const lockHeight = size * 0.35
  const lockX = (size - lockWidth) / 2
  const lockY = size * 0.5

  ctx.fillRect(lockX, lockY, lockWidth, lockHeight)

  // 锁扣（圆弧）
  const arcRadius = size * 0.15
  const arcX = size / 2
  const arcY = lockY - arcRadius * 0.3

  ctx.beginPath()
  ctx.arc(arcX, arcY, arcRadius, Math.PI, 0, false)
  ctx.stroke()

  // 锁孔
  const keyholeRadius = size * 0.06
  const keyholeX = size / 2
  const keyholeY = lockY + lockHeight * 0.4

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(keyholeX, keyholeY, keyholeRadius, 0, Math.PI * 2)
  ctx.fill()

  // 保存图标
  const buffer = canvas.toBuffer('image/png')
  await writeFile(`./public/icons/icon${size}.png`, buffer)
  console.log(`✅ Generated icon${size}.png`)
}

console.log('✅ All icons generated successfully!')
console.log('📁 Icons saved to: ./public/icons/')
