import React, { useState, useRef, useEffect } from 'react'
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
import type { Account, TOTPAlgorithm } from '@/types'

interface AccountItemProps {
  name: string
  code: string
  remaining: number
  secret: string
  type?: Account['type']
  algorithm?: TOTPAlgorithm
  digits?: 6 | 8
  period?: number
  saving?: boolean
  onDelete: (name: string) => Promise<boolean>
  onEdit: (name: string) => void
  dragState?: 'overlay' | 'placeholder'
}

/**
 * 账户卡片组件
 */
export function AccountItem({ name, code, remaining, secret, type, algorithm, digits, period, onDelete, onEdit, saving = false, dragState }: AccountItemProps) {
  const { t } = useI18n()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const filling = useRef(false)
  const generation = useRef(0)
  useEffect(() => () => { generation.current++ }, [name, secret, type, algorithm, digits, period])
  const interval = period ?? 30

  // 点击账户卡片 - 自动填充或复制验证码
  const handleClick = async () => {
    if (filling.current || dragState) return
    filling.current = true
    const id = generation.current
    try {
      const freshCode = await TOTP.generateTOTP(secret, interval, type, undefined, { algorithm, digits })
      if (id !== generation.current) return
      const result = await fillCodeInActiveTab(freshCode)
      if (id !== generation.current) return

      if (result.status === 'filled') {
        toast.success(t('toast.code_filled'))
      } else if (result.status === 'copied') {
        toast.success(t('toast.code_copied'))
      } else if (result.status === 'no-field') {
        toast.error(t('toast.no_otp_field'))
      } else {
        toast.error(t('toast.fill_failed'))
      }
    } catch {
      if (id === generation.current) toast.error(t('toast.fill_failed'))
    } finally { filling.current = false }
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
      {/* 菜单打开 Dialog 时，避免两个模态层的 pointer-events 清理互相覆盖。 */}
      <ContextMenu modal={false}>
        <ContextMenuTrigger>
          <Card
            className="account-card cursor-pointer"
            data-drag-state={dragState}
            onClick={handleClick}
          >
            <CardContent className="relative p-6 flex items-center gap-4">
              <div className="flex-1 min-w-0 max-w-[220px]">
                <p className="text-sm font-medium text-primary mb-2 truncate" title={name}>
                  {name}
                </p>
                <p className="text-3xl font-mono font-bold tracking-wider">
                  {TOTP.formatCode(code)}
                </p>
              </div>
              <div className="flex-shrink-0">
                <ProgressRing value={remaining} max={interval} size={48} />
              </div>
            </CardContent>
          </Card>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={() => setShowQRModal(true)}>
            {t('qr.show_button')}
          </ContextMenuItem>
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
        accountAlgorithm={algorithm}
        accountDigits={digits}
        accountPeriod={period}
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
