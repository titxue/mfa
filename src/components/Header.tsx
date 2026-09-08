import React from 'react'
import { Settings, Plus, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/contexts/I18nContext'
import { securityStrings } from '@/locales/security'

interface HeaderProps {
  onAddAccount: () => void
  onOpenSettings: () => void
  onLock?: () => void
}

/**
 * 顶栏组件
 */
export function Header({ onAddAccount, onOpenSettings, onLock }: HeaderProps) {
  const { t, locale } = useI18n()
  const lockLabel = securityStrings(locale).lock

  return (
    <header className="flex items-center justify-between gap-3 p-5 border-b bg-background">
      <h1 className="min-w-0 truncate text-xl font-semibold" title={t('title')}>{t('title')}</h1>
      <div className="flex shrink-0 items-center gap-2">
        {onLock && <Button variant="outline" size="icon" onClick={onLock} aria-label={lockLabel} title={lockLabel}>
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
        </Button>}
        <Button variant="outline" size="icon" onClick={onOpenSettings} aria-label={t('settings.title')} title={t('settings.title')}>
          <Settings className="h-4 w-4" />
        </Button>
        <Button className="gap-1.5 px-3" onClick={onAddAccount}>
          <Plus className="h-4 w-4" />
          {t('addAccount')}
        </Button>
      </div>
    </header>
  )
}
