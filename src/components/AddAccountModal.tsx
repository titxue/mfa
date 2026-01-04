import React, { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { QrCode } from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'
import { toast } from 'sonner'
import { parseQRCodeFromFile, parseOtpauthURI } from '@/utils/qr-parser'
import { cn } from '@/utils/cn'
import type { Account } from '@/types'

interface AddAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (account: Account) => Promise<{ success: boolean; message?: string }>
}

/**
 * 添加账户模态框
 */
export function AddAccountModal({ open, onOpenChange, onAdd }: AddAccountModalProps) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [secret, setSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const qrInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  // 处理扫描二维码
  const handleScanQRCode = () => {
    qrInputRef.current?.click()
  }

  // 统一的 QR 图片处理函数
  const processQRImage = async (file: File) => {
    if (scanning) return  // 防止重复处理

    setScanning(true)
    toast.loading(t('toast.qr_scanning'))

    try {
      const result = await parseQRCodeFromFile(file)

      // 自动填充表单
      setName(result.issuer ? `${result.issuer} ${result.name}` : result.name)
      setSecret(result.secret)

      toast.dismiss()
      toast.success(t('toast.qr_success'))
    } catch (error) {
      toast.dismiss()
      const errorMessage = (error as Error).message

      if (errorMessage.includes('No QR code found')) {
        toast.error(t('toast.qr_no_code'))
      } else if (errorMessage.includes('Invalid otpauth')) {
        toast.error(t('toast.qr_invalid_format'))
      } else {
        toast.error(t('toast.qr_parse_failed'))
      }
    } finally {
      setScanning(false)
    }
  }

  const handleQRFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    await processQRImage(file)

    // 重置文件输入
    if (qrInputRef.current) {
      qrInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !secret.trim()) {
      toast.error(t('toast.fill_all_fields'))
      return
    }

    setLoading(true)

    try {
      const result = await onAdd({
        name: name.trim(),
        secret: secret.trim().toUpperCase().replace(/\s/g, '')
      })

      if (result.success) {
        toast.success(`${name}`)
        setName('')
        setSecret('')
        onOpenChange(false)
      } else {
        toast.error(t(result.message as any))
      }
    } catch (error) {
      toast.error(t('error.init_failed'))
    } finally {
      setLoading(false)
    }
  }

  // 拖拽进入
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    dragCounterRef.current++

    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }

  // 拖拽悬停
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  // 拖拽离开
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    dragCounterRef.current--

    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }

  // 文件放下
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsDragging(false)
    dragCounterRef.current = 0

    const files = e.dataTransfer.files
    if (files.length === 0) return

    const file = files[0]

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error(t('toast.qr_invalid_file_type'))
      return
    }

    await processQRImage(file)
  }

  // 模态框关闭处理
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)

    if (!newOpen) {
      setIsDragging(false)
      dragCounterRef.current = 0
    }
  }

  // 监听粘贴事件
  useEffect(() => {
    if (!open) return  // 仅在模态框打开时监听

    const handlePaste = async (e: ClipboardEvent) => {
      // 排除 Input/Textarea 中的粘贴操作
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      const items = e.clipboardData?.items
      if (!items) return

      // 优先检查文本类型（otpauth:// URI）
      for (let i = 0; i < items.length; i++) {
        const item = items[i]

        if (item.type === 'text/plain') {
          e.preventDefault()

          item.getAsString(async (text) => {
            const trimmedText = text.trim()

            // 检查是否是 otpauth:// URI
            if (trimmedText.startsWith('otpauth://totp/')) {
              if (scanning) return  // 防止重复处理

              setScanning(true)

              try {
                const result = parseOtpauthURI(trimmedText)

                // 自动填充表单
                setName(result.issuer ? `${result.issuer} ${result.name}` : result.name)
                setSecret(result.secret)

                toast.success(t('toast.token_parse_success'))
              } catch (error) {
                const errorMessage = (error as Error).message

                if (errorMessage.includes('Invalid otpauth')) {
                  toast.error(t('toast.qr_invalid_format'))
                } else {
                  toast.error(t('toast.qr_parse_failed'))
                }
              } finally {
                setScanning(false)
              }
            }
          })
          return
        }
      }

      // 查找图片类型
      for (let i = 0; i < items.length; i++) {
        const item = items[i]

        if (item.type.startsWith('image/')) {
          e.preventDefault()

          const blob = item.getAsFile()
          if (!blob) continue

          // 转换为 File 对象
          const file = new File([blob], 'pasted-image.png', {
            type: blob.type
          })

          await processQRImage(file)
          break
        }
      }
    }

    window.addEventListener('paste', handlePaste)

    return () => {
      window.removeEventListener('paste', handlePaste)
    }
  }, [open, scanning])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          isDragging && "ring-2 ring-primary ring-offset-2 bg-primary/5"
        )}
      >
        <DialogHeader>
          <DialogTitle>{t('form.title')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('form.accountInfo')}
          </DialogDescription>
        </DialogHeader>

        {/* 扫描二维码按钮 */}
        <Button
          type="button"
          variant="outline"
          onClick={handleScanQRCode}
          disabled={scanning}
          className="w-full"
        >
          <QrCode className="w-4 h-4 mr-2" />
          {t('form.scanQRCode')}
        </Button>
        <div className="text-xs text-muted-foreground text-center -mt-2 space-y-0.5">
          <p>{t('form.scanQRCodeDesc')}</p>
          <p className="text-muted-foreground/70">{t('form.pasteQRCodeHint')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{t('form.accountName')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('form.accountNamePlaceholder')}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('form.accountNameDesc')}
            </p>
          </div>

          <div>
            <Label htmlFor="secret">{t('form.secretKey')}</Label>
            <Input
              id="secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder={t('form.secretKeyPlaceholder')}
              className="mt-2 font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('form.secretKeyDesc')}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {t('button.cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {t('button.add')}
            </Button>
          </div>
        </form>

        {/* 隐藏的文件输入 */}
        <input
          ref={qrInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleQRFileSelect}
        />

        {/* 拖拽 Overlay - 放在最后，使用固定定位 */}
        {isDragging && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <QrCode className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-base font-medium">{t('form.dropImageHere')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('form.dropImageDesc')}
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
