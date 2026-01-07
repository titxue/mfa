import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Download } from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'
import { toast } from 'sonner'
import { generateOtpauthURI, generateQRDataURL, downloadQRCodeImage } from '@/utils/qr-generator'

interface QRCodeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountName: string
  accountSecret: string
}

/**
 * 二维码展示模态框
 */
export function QRCodeModal({
  open,
  onOpenChange,
  accountName,
  accountSecret
}: QRCodeModalProps) {
  const { t } = useI18n()
  const [qrDataURL, setQrDataURL] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // 当 Modal 打开时生成二维码
  useEffect(() => {
    if (!open) return

    const generateQR = async () => {
      setLoading(true)
      setQrDataURL('')

      try {
        const uri = generateOtpauthURI(accountName, accountSecret)
        const dataURL = await generateQRDataURL(uri)
        setQrDataURL(dataURL)
      } catch (error) {
        console.error('QR generation error:', error)
        toast.error(t('toast.qr_generate_failed'))
      } finally {
        setLoading(false)
      }
    }

    generateQR()
  }, [open, accountName, accountSecret, t])

  // 下载二维码
  const handleDownload = () => {
    if (!qrDataURL) return
    downloadQRCodeImage(qrDataURL, accountName)
    toast.success(t('toast.qr_download_success'))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('qr.modal_title')}</DialogTitle>
          <DialogDescription>
            {t('qr.modal_description')}
          </DialogDescription>
        </DialogHeader>

        {/* 二维码展示区域 */}
        <div className="flex flex-col items-center justify-center py-6">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {t('toast.qr_scanning')}
              </p>
            </div>
          ) : qrDataURL ? (
            <div className="flex flex-col items-center gap-4">
              <img
                src={qrDataURL}
                alt="QR Code"
                className="w-[300px] h-[300px] rounded-lg border border-border"
              />
              <p className="text-sm text-muted-foreground text-center max-w-[300px]">
                {accountName}
              </p>
            </div>
          ) : null}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            {t('button.close')}
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!qrDataURL}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            {t('qr.download_button')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
