import React from 'react'
import type { Account } from '@/types'
import { AccountItem } from './AccountItem'
import { EmptyState } from './EmptyState'
import { ScrollArea } from '@/components/ui/scroll-area'

interface AccountListProps {
  accounts: Account[]
  codes: { [key: string]: string }
  remaining: number
  onDeleteAccount: (name: string) => void
}

/**
 * 账户列表组件
 */
export function AccountList({
  accounts,
  codes,
  remaining,
  onDeleteAccount
}: AccountListProps) {
  if (accounts.length === 0) {
    return (
      <div className="p-4 h-full">
        <EmptyState />
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {accounts.map((account) => (
          <AccountItem
            key={account.name}
            name={account.name}
            code={codes[account.name] || '------'}
            remaining={remaining}
            onDelete={onDeleteAccount}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
