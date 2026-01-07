import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ProgressRing } from './ProgressRing'
import { TOTP } from '@/utils/totp'
import { autoFillCode } from '@/utils/page-analyzer'
import { toast } from 'sonner'
import { useI18n } from '@/contexts/I18nContext'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { QRCodeModal } from './QRCodeModal'

interface AccountItemProps {
  name: string
  code: string
  remaining: number
  secret: string
  onDelete: (name: string) => void
}

/**
 * 账户卡片组件
 */
export function AccountItem({ name, code, remaining, secret, onDelete }: AccountItemProps) {
  const { t } = useI18n()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)

  // 点击账户卡片 - 自动填充或复制验证码
  const handleClick = async () => {
    const result = await autoFillCode(code)

    if (result.success) {
      if (result.message === 'Code filled successfully') {
        toast.success(t('toast.code_filled'))
      } else {
        toast.success(t('toast.code_copied'))
      }
    } else {
      toast.error(t('toast.fill_failed'))
    }
  }

  // 双击显示二维码
  const handleDoubleClick = () => {
    setShowQRModal(true)
  }

  // 右键点击 - 显示删除确认
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowDeleteDialog(true)
  }

  // 确认删除
  const handleDelete = () => {
    onDelete(name)
    setShowDeleteDialog(false)
  }

  return (
    <>
      <Card
        className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <CardContent className="p-6 flex items-center gap-4">
          <div className="flex-1 min-w-0 max-w-[220px]">
            <p className="text-sm font-medium text-primary mb-2 truncate">
              {name}
            </p>
            <p className="text-3xl font-mono font-bold tracking-wider">
              {TOTP.formatCode(code)}
            </p>
          </div>
          <div className="flex-shrink-0">
            <ProgressRing value={remaining} max={30} size={48} />
          </div>
        </CardContent>
      </Card>

      {/* QR 码模态框 */}
      <QRCodeModal
        open={showQRModal}
        onOpenChange={setShowQRModal}
        accountName={name}
        accountSecret={secret}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialog.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialog.delete_message', { name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('button.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t('button.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
