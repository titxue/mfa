import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

interface AdvancedSettingsProps {
  id: string
  title: string
  hint: string
  badge?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export function AdvancedSettings({ id, title, hint, badge, open, onOpenChange, children }: AdvancedSettingsProps) {
  const trigger = useRef<HTMLButtonElement>(null)
  useLayoutEffect(() => {
    // Reveal the fields inside the popup's scroll area without moving focus.
    if (open) trigger.current?.scrollIntoView({ block: 'start', inline: 'nearest' })
  }, [open])
  return <div className="border-t border-border pt-2">
    <button ref={trigger} id={`${id}-toggle`} type="button" aria-expanded={open} aria-controls={`${id}-settings`}
      onClick={() => onOpenChange(!open)}
      className="group flex min-h-11 w-full items-center gap-2 rounded-md px-1 py-2.5 text-start text-sm font-medium text-primary [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99] motion-safe:transition-[background-color,transform] motion-safe:duration-150 focus-visible:transition-none focus-visible:active:scale-100 motion-reduce:transform-none">
      <ChevronRight aria-hidden="true" className={cn('h-4 w-4 shrink-0 motion-safe:transition-transform motion-safe:duration-150 group-focus-visible:transition-none', open ? 'rotate-90' : 'rtl:rotate-180')} />
      <span className="flex-1 underline-offset-4 [@media(hover:hover)_and_(pointer:fine)]:group-hover:underline">{title}</span>
      {badge && <span className="rounded bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{badge}</span>}
    </button>
    <div id={`${id}-settings`} hidden={!open} className="ms-3 mt-1 border-s-2 border-border ps-4 pe-1 pb-2 pt-2">
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      <div className="space-y-4">{children}</div>
    </div>
  </div>
}
