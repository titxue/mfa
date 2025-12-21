import React from 'react'
import { Settings, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/contexts/I18nContext'

interface HeaderProps {
  onAddAccount: () => void
  onOpenSettings: () => void
}

/**
 * 顶栏组件
 */
export function Header({ onAddAccount, onOpenSettings }: HeaderProps) {
  const { t } = useI18n()

  return (
    <header className="flex items-center justify-between p-5 border-b bg-background">
      <h1 className="text-xl font-semibold">{t('title')}</h1>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" onClick={onOpenSettings}>
          <Settings className="h-4 w-4" />
        </Button>
        <Button onClick={onAddAccount}>
          <Plus className="h-4 w-4 mr-2" />
          {t('addAccount')}
        </Button>
      </div>
    </header>
  )
}
