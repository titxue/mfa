import React from 'react'
import { Lock } from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'

/**
 * 空状态组件
 */
export function EmptyState() {
  const { t } = useI18n()

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 border-2 border-dashed rounded-lg border-muted-foreground/25">
      <Lock className="w-12 h-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {t('empty.no_accounts')}
      </h3>
      <p className="text-sm text-muted-foreground text-center">
        {t('empty.add_account_tip')}
      </p>
    </div>
  )
}
