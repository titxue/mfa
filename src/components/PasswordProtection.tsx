import { useState, useRef } from 'react'
import { LockKeyhole, ChevronRight, ShieldCheck, Info, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog'
import { useI18n } from '@/contexts/I18nContext'
import { securityStrings, securityError, securitySettingsStrings, unlockStrings } from '@/locales/security'
import { vaultRequest } from '@/utils/vault-client'
import { toast } from 'sonner'

export function PasswordProtection({ protected: enabled, revision, reload }: { protected: boolean; revision: string; reload: () => Promise<void> }) {
  const { locale } = useI18n()
  const s = securityStrings(locale)
  const ui = securitySettingsStrings(locale)
  const [open, setOpen] = useState(false)
  const [action, setAction] = useState<'enable' | 'change' | 'disable' | null>(null)
  const [password, setPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const clearPasswords = () => { setPassword(''); setNextPassword(''); setConfirm('') }
  const reset = () => { setAction(null); clearPasswords(); setError('') }
  const changeOpen = (value: boolean) => {
    if (busy) return
    // Preserve the form layout during Radix's exit animation; clear secrets immediately.
    if (value) reset()
    else clearPasswords()
    setOpen(value)
    if (value && !enabled) setAction('enable')
  }
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!action || busy) return
    if (action !== 'disable' && nextPassword.length < 8) { setError(s.passwordLength); return }
    if (action !== 'disable' && nextPassword !== confirm) { setError(s.mismatch); return }
    setBusy(true); setError('')
    try {
      await vaultRequest(action, { password, nextPassword, revision })
      clearPasswords(); setOpen(false); toast.success(s.done); await reload()
    } catch (e) { const message = securityError(locale, e); setError(message); toast.error(message) }
    finally { setBusy(false); setPassword(''); setNextPassword(''); setConfirm('') }
  }
  return <section className="space-y-2">
    <h3 className="text-sm font-semibold">{ui.section}</h3>
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <button type="button" className="group flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted" aria-hidden="true">
            {enabled ? <ShieldCheck className="h-[18px] w-[18px]" /> : <LockKeyhole className="h-[18px] w-[18px]" />}
          </span>
          <span className="min-w-0 flex-1 space-y-0.5">
            <span className="block text-sm font-medium">{s.title}</span>
            <span className="block text-xs text-muted-foreground">{enabled ? ui.on : ui.off}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent className="password-protection-dialog flex max-h-[calc(100vh-2rem)] flex-col gap-0 overflow-hidden p-0" onEscapeKeyDown={event => { if (busy) event.preventDefault() }} onInteractOutside={event => { if (busy) event.preventDefault() }}>
        <DialogHeader className="shrink-0 border-b px-6 py-5 text-left">
          <DialogTitle className="pr-5">{action ? s[action] : s.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-6 py-5">
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">{action === 'disable' ? ui.disableHint : enabled && !action ? ui.enabledHint : ui.setupHint}</DialogDescription>
            {action && <div className="space-y-4">
              {action !== 'enable' && <div className="space-y-2"><Label htmlFor="current-password">{s.password}</Label><Input id="current-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={busy} /></div>}
              {action !== 'disable' && <>
                <div className="space-y-2"><Label htmlFor="new-password">{s.nextPassword}</Label><Input id="new-password" type="password" autoComplete="new-password" value={nextPassword} onChange={e => setNextPassword(e.target.value)} required minLength={8} disabled={busy} /></div>
                <div className="space-y-2"><Label htmlFor="confirm-password">{s.confirm}</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required disabled={busy} /></div>
              </>}
              {error && <p role="alert" className="text-xs leading-relaxed text-destructive">{error}</p>}
            </div>}
            {action && action !== 'disable' && <p className="flex items-start gap-2 rounded-md bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{ui.recoveryHint}</p>}
            <div className="border-t pt-3 text-xs text-muted-foreground">
              <h4 className="font-medium">{ui.details}</h4>
              <p className="pt-2 leading-relaxed">{s.syncHint}</p>
            </div>
          </div>
          <div className="shrink-0 space-y-2 border-t px-6 py-4">
            {action ? <>
              <Button type="submit" className="h-auto min-h-9 w-full whitespace-normal" disabled={busy}>{busy ? s.loading : s[action]}</Button>
              <Button type="button" className="h-auto min-h-9 w-full whitespace-normal" variant="ghost" disabled={busy} onClick={() => changeOpen(false)}>{s.cancel}</Button>
            </> : <>
              <Button key="manage-change" type="button" className="h-auto min-h-9 w-full whitespace-normal" onClick={event => { event.preventDefault(); setAction('change') }}>{s.change}</Button>
              <Button key="manage-disable" type="button" className="h-auto min-h-9 w-full whitespace-normal text-muted-foreground" variant="ghost" onClick={event => { event.preventDefault(); setAction('disable') }}>{s.disable}</Button>
            </>}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </section>
}

export function UnlockScreen({ loading, error, reload }: { loading: boolean; error: string; reload: () => Promise<void> }) {
  const { locale, t } = useI18n()
  const s = securityStrings(locale)
  const ui = unlockStrings(locale)
  const inputRef = useRef<HTMLInputElement>(null)
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [failure, setFailure] = useState('')
  const [busy, setBusy] = useState(false)
  return <div className="flex h-[600px] w-[380px] flex-col bg-background" dir={locale === 'ar-SA' ? 'rtl' : undefined}>
    <header className="flex h-16 shrink-0 items-center gap-2.5 border-b px-6">
      <ShieldCheck className="h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" />
      <span className="text-sm font-semibold">{t('title')}</span>
    </header>
    <main className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-7 py-8">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted/50">
          <LockKeyhole className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{ui.heading}</h1>
        <p id="unlock-hint" className="mt-2 text-sm leading-relaxed text-muted-foreground">{ui.hint}</p>
      </div>
      {loading ? <div role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{s.loading}</div> : <>
        <form className="w-full" aria-busy={busy} onSubmit={async event => {
          event.preventDefault(); if (busy || !password) return
          setBusy(true); setFailure(''); setVisible(false)
          try { await vaultRequest('unlock', { password }); await reload() }
          catch (e) { setFailure(securityError(locale, e)) }
          finally { setBusy(false); setPassword(''); requestAnimationFrame(() => inputRef.current?.focus()) }
        }}>
          <Label htmlFor="unlock-password" className="mb-2 block text-sm font-medium">{ui.label}</Label>
          <div className="relative">
            <Input ref={inputRef} id="unlock-password" className="h-11 pe-11 shadow-none focus-visible:ring-ring/40" type={visible ? 'text' : 'password'} autoComplete="current-password" autoFocus required value={password} placeholder={ui.placeholder} onChange={e => { setPassword(e.target.value); setFailure('') }} disabled={busy} aria-invalid={!!failure} aria-describedby={failure || error ? 'unlock-error' : 'unlock-hint'} />
            <button type="button" className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" onMouseDown={event => event.preventDefault()} onClick={() => setVisible(value => !value)} disabled={busy} aria-label={visible ? ui.hide : ui.show} title={visible ? ui.hide : ui.show}>
              {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          <div className="min-h-10 py-2">
            {(failure || error) && <p id="unlock-error" role="alert" className="text-xs leading-relaxed text-destructive">{failure || securityError(locale, error)}</p>}
          </div>
          <Button type="submit" className="h-11 w-full gap-2" disabled={busy || !password}>
            {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}{busy ? s.loading : s.unlock}
          </Button>
        </form>
        {error && <Button variant="ghost" className="mt-2" onClick={() => void reload()} disabled={busy}>{s.retry}</Button>}
      </>}
    </main>
    <footer className="shrink-0 px-7 pb-6 text-center text-xs leading-relaxed text-muted-foreground">{ui.sessionHint}</footer>
  </div>
}
