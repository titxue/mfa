import React, { useState } from 'react'
import type { Account } from '@/types'
import { AccountItem } from './AccountItem'
import { EmptyState } from './EmptyState'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  defaultAnimateLayoutChanges
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface AccountListProps {
  accounts: Account[]
  codes: { [key: string]: string }
  remaining: number
  onDeleteAccount: (name: string) => void
  onReorder: (newAccounts: Account[]) => void
}

/**
 * 可拖拽的账户卡片包装组件
 */
interface SortableAccountItemProps {
  account: Account
  code: string
  remaining: number
  onDelete: (name: string) => void
}

function SortableAccountItem({
  account,
  code,
  remaining,
  onDelete
}: SortableAccountItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: account.name,
    animateLayoutChanges: defaultAnimateLayoutChanges
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0 : 1,
    ...(transition && { transition })
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <AccountItem
        name={account.name}
        code={code}
        remaining={remaining}
        onDelete={onDelete}
      />
    </div>
  )
}

/**
 * 账户列表组件
 */
export function AccountList({
  accounts,
  codes,
  remaining,
  onDeleteAccount,
  onReorder
}: AccountListProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      setActiveId(null)
      return
    }

    // 关键修复：先更新数据，再清除状态
    const oldIndex = accounts.findIndex(a => a.name === active.id)
    const newIndex = accounts.findIndex(a => a.name === over.id)
    const newAccounts = arrayMove(accounts, oldIndex, newIndex)
    onReorder(newAccounts)  // 立即执行，让列表先重新排序

    // 延迟清除 activeId，让数据更新先完成
    requestAnimationFrame(() => {
      setActiveId(null)
    })
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  if (accounts.length === 0) {
    return (
      <div className="p-4 h-full">
        <EmptyState />
      </div>
    )
  }

  const activeAccount = accounts.find(a => a.name === activeId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <ScrollArea className="h-full">
        <div className="p-4 space-y-3">
          <SortableContext
            items={accounts.map(a => a.name)}
            strategy={verticalListSortingStrategy}
          >
            {accounts.map((account) => (
              <SortableAccountItem
                key={account.name}
                account={account}
                code={codes[account.name] || '------'}
                remaining={remaining}
                onDelete={onDeleteAccount}
              />
            ))}
          </SortableContext>
        </div>
      </ScrollArea>

      <DragOverlay>
        {activeAccount ? (
          <div style={{ cursor: 'grabbing' }}>
            <AccountItem
              name={activeAccount.name}
              code={codes[activeAccount.name] || '------'}
              remaining={remaining}
              onDelete={onDeleteAccount}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
