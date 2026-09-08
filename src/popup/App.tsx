import React, { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { AccountList } from '@/components/AccountList'
import { AddAccountModal } from '@/components/AddAccountModal'
import { SettingsModal } from '@/components/SettingsModal'
import { useAccounts } from '@/hooks/useAccounts'
import { useTOTP } from '@/hooks/useTOTP'
import type { Account } from '@/types'
import { UnlockScreen } from '@/components/PasswordProtection'
import { vaultRequest } from '@/utils/vault-client'
import { useI18n } from '@/contexts/I18nContext'
import { securityError } from '@/locales/security'
import { toast } from 'sonner'

/**
 * 主应用组件
 */
export function App() {
  const state = useAccounts()
  if (state.loading || state.locked) return <UnlockScreen loading={state.loading} error={state.error} reload={state.reload} />
  return <UnlockedApp state={state} />
}

function UnlockedApp({ state }: { state: ReturnType<typeof useAccounts> }) {
  const { accounts, addAccount, deleteAccount, updateAccounts, updateAccount } = state
  const { locale } = useI18n()
  const { codes, remaining } = useTOTP(accounts)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  useEffect(() => {
    setShowEditModal(false)
    setEditingAccount(null)
    setShowAddModal(false)
  }, [state.revision])

  const handleEditAccount = (accountName: string) => {
    const account = accounts.find(a => a.name === accountName)
    if (account) {
      setEditingAccount(account)
      setShowEditModal(true)
    }
  }

  return (
    <div className="flex flex-col h-[600px] w-[380px] bg-background">
      <Header
        onAddAccount={() => setShowAddModal(true)}
        onOpenSettings={() => setShowSettings(true)}
        onLock={state.protected ? async () => {
          try { await vaultRequest('lock'); await state.reload() }
          catch (e) { toast.error(securityError(locale, e)) }
        } : undefined}
      />

      {state.error && <p role="alert" className="px-4 text-xs text-destructive">{securityError(locale, state.error)}</p>}

      <div className="flex-1">
        <AccountList
          accounts={accounts}
          codes={codes}
          remaining={remaining}
          onDeleteAccount={deleteAccount}
          onEditAccount={handleEditAccount}
          onReorder={updateAccounts}
        />
      </div>

      <AddAccountModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        mode="add"
        onAdd={addAccount}
      />

      <AddAccountModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        mode="edit"
        initialData={editingAccount || undefined}
        onEdit={updateAccount}
      />

      <SettingsModal
        protected={state.protected}
        revision={state.revision}
        reload={state.reload}
        open={showSettings}
        onOpenChange={setShowSettings}
        accounts={accounts}
        onImport={updateAccounts}
      />
    </div>
  )
}
