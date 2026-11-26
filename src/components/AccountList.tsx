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
  DragOverlay,
  defaultDropAnimationSideEffects
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

const dropSideEffects = defaultDropAnimationSideEffects({
  styles: { active: { opacity: '0' } },
  className: { dragOverlay: 'account-dropping' }
})

interface AccountListProps {
  accounts: Account[]
  codes: { [key: string]: string }
  remaining: number
  /** 每个账户各自的剩余秒数（按账户步长计算），缺省时回退到全局 remaining */
  remainings: { [key: string]: number }
  saving?: boolean
  onDeleteAccount: (name: string) => Promise<boolean>
  onEditAccount: (name: string) => void
  onReorder: (newAccounts: Account[]) => void
}

/**
 * 可拖拽的账户卡片包装组件
 */
interface SortableAccountItemProps {
  account: Account
  code: string
  remaining: number
  saving?: boolean
  onDelete: (name: string) => Promise<boolean>
  onEdit: (name: string) => void
  placeholder: boolean
  animateMotion: boolean
}

function SortableAccountItem({
  account,
  code,
  remaining,
  onDelete,
  onEdit,
  saving,
  placeholder,
  animateMotion
}: SortableAccountItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({
    id: account.name,
    transition: animateMotion ? { duration: 180, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' } : null,
    animateLayoutChanges: defaultAnimateLayoutChanges
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    ...(transition && { transition })
  }

  return (
    <div ref={setNodeRef} className="sortable-account" style={style} {...attributes} {...listeners} aria-label={account.name}>
      <AccountItem
        name={account.name}
        secret={account.secret}
        type={account.type}
        algorithm={account.algorithm}
        digits={account.digits}
        period={account.period}
        code={code}
        remaining={remaining}
        saving={saving}
        onDelete={onDelete}
        onEdit={onEdit}
        dragState={placeholder ? 'placeholder' : undefined}
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
  remainings,
  onDeleteAccount,
  onEditAccount,
  onReorder,
  saving = false
}: AccountListProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [animateMotion, setAnimateMotion] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,  // 拖动 5px 后才激活拖拽
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setAnimateMotion(
      !(event.activatorEvent instanceof KeyboardEvent) &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
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
      onDragCancel={() => setActiveId(null)}
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
                code={codes[account.name] || (account.type === 'steam' ? '-----' : '-'.repeat(account.digits ?? 6))}
                remaining={remainings[account.name] ?? remaining}
                saving={saving}
                onDelete={onDeleteAccount}
                onEdit={onEditAccount}
                placeholder={activeId === account.name}
                animateMotion={animateMotion}
              />
            ))}
          </SortableContext>
        </div>
      </ScrollArea>

      <DragOverlay
        className={animateMotion ? 'account-drag-overlay' : 'account-drag-overlay account-drag-static'}
        transition="none"
        dropAnimation={{ duration: animateMotion ? 180 : 0, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', sideEffects: dropSideEffects }}
      >
        {activeAccount && (
          <AccountItem
            name={activeAccount.name}
            secret={activeAccount.secret}
            type={activeAccount.type}
            algorithm={activeAccount.algorithm}
            digits={activeAccount.digits}
            period={activeAccount.period}
            code={codes[activeAccount.name] || (activeAccount.type === 'steam' ? '-----' : '-'.repeat(activeAccount.digits ?? 6))}
            remaining={remainings[activeAccount.name] ?? remaining}
            saving={saving}
            onDelete={onDeleteAccount}
            onEdit={onEditAccount}
            dragState="overlay"
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
