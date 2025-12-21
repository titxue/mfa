import React, { useState, useRef } from 'react'
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
import { parseQRCodeFromFile } from '@/utils/qr-parser'
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
  const qrInputRef = useRef<HTMLInputElement>(null)

  // 处理扫描二维码
  const handleScanQRCode = () => {
    qrInputRef.current?.click()
  }

  const handleQRFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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
      // 重置文件输入
      if (qrInputRef.current) {
        qrInputRef.current.value = ''
      }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
        <p className="text-xs text-muted-foreground text-center -mt-2">
          {t('form.scanQRCodeDesc')}
        </p>

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
      </DialogContent>
    </Dialog>
  )
}
