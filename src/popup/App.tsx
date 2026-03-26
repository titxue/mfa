import React, { useState } from 'react'
import { Header } from '@/components/Header'
import { AccountList } from '@/components/AccountList'
import { AddAccountModal } from '@/components/AddAccountModal'
import { SettingsModal } from '@/components/SettingsModal'
import { useAccounts } from '@/hooks/useAccounts'
import { useTOTP } from '@/hooks/useTOTP'
import type { Account } from '@/types'

/**
 * 主应用组件
 */
export function App() {
  const { accounts, addAccount, deleteAccount, updateAccounts, updateAccount } = useAccounts()
  const { codes, remaining } = useTOTP(accounts)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

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
      />

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
        open={showSettings}
        onOpenChange={setShowSettings}
        accounts={accounts}
        onImport={updateAccounts}
      />
    </div>
  )
}
