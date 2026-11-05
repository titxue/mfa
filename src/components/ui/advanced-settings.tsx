import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
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
  return <div className="rounded-lg border border-border bg-muted/20">
    <button ref={trigger} id={`${id}-toggle`} type="button" aria-expanded={open} aria-controls={`${id}-settings`}
      onClick={() => onOpenChange(!open)}
      className="group flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-start text-sm font-medium hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99] motion-safe:transition-[background-color,transform] motion-safe:duration-150 focus-visible:transition-none focus-visible:active:scale-100 motion-reduce:transform-none">
      <span className="flex-1">{title}</span>
      {badge && <span className="rounded bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{badge}</span>}
      <ChevronDown aria-hidden="true" className={cn('h-4 w-4 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-150 group-focus-visible:transition-none', open && 'rotate-180')} />
    </button>
    <div id={`${id}-settings`} hidden={!open} className="border-t border-border px-3 pb-4 pt-3">
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      <div className="space-y-4">{children}</div>
    </div>
  </div>
}
