import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/contexts/I18nContext'
import { toast } from 'sonner'
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
        toast.success(`✅ ${name}`)
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('form.title')}</DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  )
}
