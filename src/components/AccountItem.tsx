import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ProgressRing } from './ProgressRing'
import { TOTP } from '@/utils/totp'
import { fillCodeInActiveTab } from '@/utils/page-analyzer'
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { QRCodeModal } from './QRCodeModal'
import type { Account } from '@/types'

interface AccountItemProps {
  name: string
  code: string
  remaining: number
  secret: string
  type?: Account['type']
  saving?: boolean
  onDelete: (name: string) => Promise<boolean>
  onEdit: (name: string) => void
}

/**
 * 账户卡片组件
 */
export function AccountItem({ name, code, remaining, secret, type, onDelete, onEdit, saving = false }: AccountItemProps) {
  const { t } = useI18n()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)

  // 点击账户卡片 - 自动填充或复制验证码
  const handleClick = async () => {
    const result = await fillCodeInActiveTab(code)

    if (result.status === 'filled') {
      toast.success(t('toast.code_filled'))
    } else if (result.status === 'copied') {
      toast.success(t('toast.code_copied'))
    } else if (result.status === 'no-field') {
      toast.error(t('toast.no_otp_field'))
    } else {
      toast.error(t('toast.fill_failed'))
    }
  }

  // 点击编辑菜单项
  const handleEditClick = () => {
    onEdit(name)
  }

  // 点击删除菜单项
  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  // 确认删除
  const handleDelete = async () => {
    if (await onDelete(name)) setShowDeleteDialog(false)
  }

  return (
    <>
      {/* The following dialogs own the modal pointer lock, not the transient menu. */}
      <ContextMenu modal={false}>
        <ContextMenuTrigger>
          <Card
            className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
            onClick={handleClick}
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
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setShowQRModal(true)}>{t('qr.modal_title')}</ContextMenuItem>
          <ContextMenuItem disabled={saving} onClick={handleEditClick}>
            {t('button.edit')}
          </ContextMenuItem>
          <ContextMenuItem disabled={saving} onClick={handleDeleteClick} className="text-destructive">
            {t('button.delete')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* QR 码模态框 */}
      <QRCodeModal
        open={showQRModal}
        onOpenChange={setShowQRModal}
        accountName={name}
        accountSecret={secret}
        accountType={type}
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
            <AlertDialogAction disabled={saving} onClick={event => { event.preventDefault(); void handleDelete() }}>
              {t('button.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
