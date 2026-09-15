import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ShieldCheck, LockKeyhole, Check, Loader2 } from 'lucide-react'
import { I18nProvider, useI18n } from '../contexts/I18nContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { securityStrings } from '../locales/security'
import { bindingStrings, bindingError } from './strings'
import { STEAM_API_ORIGIN } from './auth'
import type { BindingAction, BindingInput, BindingView } from './service'
import { withBindingDeadline } from './request'

function SteamLinkPage() {
  const { locale, t } = useI18n(), s = bindingStrings(locale), security = securityStrings(locale)
  const [view, setView] = useState<BindingView>({ phase: 'login', guards: [] })
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [locked, setLocked] = useState(false)
  const [activity, setActivity] = useState<'permission' | 'login' | 'working'>('working')
  const [username, setUsername] = useState(''), [password, setPassword] = useState(''), [code, setCode] = useState('')
  const [backupPassword, setBackupPassword] = useState(''), [confirmPassword, setConfirmPassword] = useState('')
  const [acknowledged, setAcknowledged] = useState(false), [name, setName] = useState('')
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const working = useRef(false), alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  const call = async (action: BindingAction, input: BindingInput = {}) => {
    let result
    try {
      result = await withBindingDeadline(chrome.runtime.sendMessage({ type: 'MFA_STEAM_BINDING', action, input }), action === 'view' ? 8000 : 45000, 'requestTimeout')
    } catch (e) {
      throw new Error(bindingError(locale, (e as Error).message === 'requestTimeout' ? 'requestTimeout' : 'backgroundUnavailable'))
    }
    if (!result?.ok) {
      if (alive.current && result?.error === 'locked') { setLocked(true); setPassword(''); setBackupPassword(''); setConfirmPassword(''); setCode('') }
      const message = bindingError(locale, result?.error ?? 'backgroundUnavailable', result?.result)
      const diagnostic = result?.error === 'storageError' && result?.stage ? ` [${result.stage}${result.errorType ? ` / ${result.errorType}` : ''}]` : ''
      throw new Error(message + diagnostic)
    }
    if (alive.current) setLocked(false)
    return result.value
  }
  const perform = async (action: BindingAction, input: BindingInput = {}) => {
    if (working.current) return
    working.current = true; setBusy(true); setError('')
    setActivity(action === 'login' ? 'permission' : 'working')
    let requested = false
    try {
      if (action === 'login') {
        let granted: boolean
        try {
          // This API is invoked synchronously inside the submit gesture, before any await.
          granted = await withBindingDeadline(chrome.permissions.request({ origins: [STEAM_API_ORIGIN] }), 45000, 'permissionTimeout')
        } catch (e) {
          throw new Error(bindingError(locale, (e as Error).message === 'permissionTimeout' ? 'permissionTimeout' : 'permission'))
        }
        if (!granted) throw new Error(bindingError(locale, 'permission'))
        setActivity('login')
      }
      requested = true
      const value = await call(action, input)
      if (!alive.current) return
      if (action === 'login') setPassword('')
      if (action === 'download') {
        const url = URL.createObjectURL(new Blob([value.data], { type: 'application/json' }))
        const link = document.createElement('a'); link.href = url; link.download = value.fileName; link.click(); URL.revokeObjectURL(url)
      } else {
        setView(value)
        if (action === 'poll' && value.phase !== 'guard') setCode('')
        if (value.accountName && !name) setName(`Steam ${value.accountName}`)
      }
    } catch (e) {
      if (alive.current) {
        setError((e as Error).message)
        try {
          if (!requested || action === 'view') return
          const next = await call('view')
          setView(next)
          if (action === 'login' && next.phase !== 'login') { setPassword(''); setError('') }
        } catch { /* Keep the actionable error. */ }
      }
    } finally {
      working.current = false
      if (alive.current) {
        setBusy(false)
        if (['initialize', 'unlock', 'restore'].includes(action)) { setBackupPassword(''); setConfirmPassword('') }
        if (['guard', 'verify'].includes(action)) setCode('')
        if (['logout', 'discard'].includes(action)) { setPassword(''); setBackupPassword(''); setConfirmPassword(''); setCode(''); setName(''); setRestoreFile(null) }
      }
    }
  }
  useEffect(() => { void perform('view') }, [])
  useEffect(() => {
    const changed = (message: { type?: string; invalidate?: boolean }) => {
      if (message.type !== 'VAULT_CHANGED') return
      if (message.invalidate) { setLocked(true); setPassword(''); setBackupPassword(''); setConfirmPassword(''); setCode('') }
      void perform('view')
    }
    chrome.runtime.onMessage.addListener(changed)
    return () => chrome.runtime.onMessage.removeListener(changed)
  }, [])
  useEffect(() => {
    if (view.phase !== 'guard' || locked) return
    const timer = setInterval(() => { if (!working.current) void perform('poll') }, 3000)
    return () => clearInterval(timer)
  }, [view.phase, locked])
  const step = view.phase === 'login' || view.phase === 'guard' ? 0 : ['authenticated', 'existing'].includes(view.phase) ? 1
    : ['ready', 'resume', 'uncertain'].includes(view.phase) ? 2 : view.phase === 'pending' ? 3 : 4
  const inputClass = 'h-11'
  const form = (children: React.ReactNode, submit: (event: React.FormEvent<HTMLFormElement>) => void) => <form className="space-y-5" onSubmit={event => { event.preventDefault(); submit(event) }}>{children}</form>
  const passwordFields = <>
    <div className="space-y-2"><Label htmlFor="backup-password">{s.filePassword}</Label><Input id="backup-password" className={inputClass} type="password" autoComplete="new-password" value={backupPassword} disabled={busy} onChange={e => setBackupPassword(e.target.value)} /></div>
    <div className="space-y-2"><Label htmlFor="confirm-password">{security.confirm}</Label><Input id="confirm-password" className={inputClass} type="password" autoComplete="new-password" value={confirmPassword} disabled={busy} onChange={e => setConfirmPassword(e.target.value)} /></div>
  </>
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5"><ShieldCheck className="h-8 w-8" /><div><p className="font-semibold">Steam Guard</p><p className="text-xs text-slate-500">MFA Authenticator</p></div></div></header>
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">{s.title}</h1><p className="mt-3 text-sm leading-relaxed text-slate-500">{s.intro}</p>
      <ol className="my-8 grid grid-cols-5 gap-2">{s.steps.map((label, i) => <li key={i} className={`space-y-2 border-t-2 pt-3 text-xs sm:text-sm ${i <= step ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-400'}`}><span className="font-mono">{i < step ? '✓' : `0${i + 1}`}</span><span className="block">{label}</span></li>)}</ol>
      <section className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-slate-500" /><h2 className="min-w-0 break-all font-semibold">{view.accountName ?? s.steps[step]}</h2>{busy && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}</div>
        {locked ? <div className="space-y-5"><p>{s.locked}</p><Button onClick={() => void perform('view')}>{security.retry}</Button></div> : <>
          {view.phase === 'login' && form(<>
            <div className="space-y-2"><Label htmlFor="steam-username">{s.username}</Label><Input id="steam-username" name="steamUsername" required className={inputClass} autoComplete="username" value={username} disabled={busy} onChange={e => setUsername(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="steam-password">{s.password}</Label><Input id="steam-password" name="steamPassword" required className={inputClass} type="password" autoComplete="current-password" value={password} disabled={busy} onChange={e => setPassword(e.target.value)} /></div>
            <Button className="h-11" type="submit" disabled={busy}>{busy ? security.loading : s.login}</Button>
            {busy && <p role="status" className="text-sm text-slate-500">{activity === 'permission' ? s.authorizing : activity === 'login' ? s.signingIn : security.loading}</p>}
          </>, event => {
            const data = new FormData(event.currentTarget)
            const accountName = String(data.get('steamUsername') ?? '').trim(), enteredPassword = String(data.get('steamPassword') ?? '')
            setUsername(accountName); setPassword(enteredPassword)
            void perform('login', { accountName, password: enteredPassword })
          })}
          {view.phase === 'guard' && <div className="space-y-5"><p className="text-sm leading-relaxed">{s.guard}</p>
            {view.guards.some(type => type === 2 || type === 3) && form(<><div className="space-y-2"><Label htmlFor="login-code">{s.loginCode}</Label><Input id="login-code" className={inputClass} autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} /></div><Button disabled={busy || !code.trim()}>{s.continue}</Button></>, () => void perform('guard', { code, codeType: view.guards.includes(2) ? 2 : 3 }))}
          </div>}
          {['authenticated', 'existing'].includes(view.phase) && <div className="space-y-5">{view.phase === 'existing' && <p className="rounded-lg bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">{s.existing}</p>}<Button disabled={busy} onClick={() => void perform('check')}>{s.check}</Button></div>}
          {view.phase === 'ready' && form(<><p className="text-sm text-slate-600">{s.ready}</p>{passwordFields}<label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" className="mt-1" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} /><span>{s.acknowledge}</span></label><Button type="submit" disabled={busy || !acknowledged || backupPassword.length < 8 || backupPassword !== confirmPassword}>{s.initialize}</Button></>, () => void perform('initialize', { password: backupPassword, confirmed: acknowledged }))}
          {view.phase === 'resume' && form(<><p>{s.resume}</p><Label htmlFor="resume-password">{s.filePassword}</Label><Input id="resume-password" type="password" value={backupPassword} onChange={e => setBackupPassword(e.target.value)} /><Button disabled={busy || !backupPassword}>{security.unlock}</Button></>, () => void perform('unlock', { password: backupPassword }))}
          {view.phase === 'uncertain' && <p className="rounded-lg bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">{s.uncertain}</p>}
          {view.phase === 'recovery' && <div className="space-y-5"><p className="rounded-lg bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">{s.recoveryOnly}</p><Button disabled={busy} onClick={() => void perform('check')}>{security.retry}</Button></div>}
          {view.phase === 'pending' && form(<><p className="text-sm leading-relaxed">{s.pending}</p><div className="rounded-lg border bg-slate-50 p-4"><p className="text-xs text-slate-500">{s.recovery}</p><p className="mt-2 font-mono text-xl tracking-wider">{view.recoveryCode}</p></div><div className="space-y-2"><Label htmlFor="phone-code">{s.phoneCode}</Label><Input id="phone-code" className={`${inputClass} font-mono tracking-widest`} autoComplete="off" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={5} /></div><Button disabled={busy || code.length !== 5}>{s.verify}</Button></>, () => void perform('verify', { code }))}
          {view.phase === 'verified' && form(<><p className="flex items-center gap-2 text-sm"><Check className="h-5 w-5" />{s.verified}</p><div className="space-y-2"><Label htmlFor="account-name">{t('form.accountName')}</Label><Input id="account-name" value={name} onChange={e => setName(e.target.value)} /></div><Button disabled={busy || !name.trim()}>{s.steps[4]}</Button></>, () => void perform('save', { name }))}
          {view.phase === 'saved' && <div className="space-y-3"><Check className="h-10 w-10 rounded-full bg-emerald-50 p-2 text-emerald-700" /><p className="font-medium">{view.savedName}</p><p className="text-sm text-slate-600">{s.saved}</p></div>}
        </>}
        {error && !locked && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {!locked && (view.checkpointName || view.phase !== 'login') && <div className="mt-7 flex flex-wrap gap-2 border-t pt-5">
          {view.checkpointName && <Button className="h-auto min-h-9 max-w-full whitespace-normal" variant="outline" disabled={busy} onClick={() => void perform('download')}>{['verified', 'saved'].includes(view.phase) ? t('settings.export') : s.backup}</Button>}
          {view.phase !== 'login' && <Button className="h-auto min-h-9 max-w-full whitespace-normal" variant="ghost" disabled={busy} onClick={() => void perform('logout')}>{s.logout}</Button>}
          {view.checkpointName && <Button className="h-auto min-h-9 max-w-full whitespace-normal" variant="ghost" disabled={busy} onClick={() => { if (window.confirm(s.clearConfirm)) void perform('discard', { confirmed: true }) }}>{s.clear}</Button>}
        </div>}
      </section>
      {view.phase === 'login' && !view.checkpointName && !locked && <details className="mt-6 rounded-xl border bg-white p-5 text-sm"><summary className="cursor-pointer font-medium">{s.restore}</summary><div className="mt-4 space-y-4"><input className="block w-full min-w-0 text-xs" type="file" accept=".json" aria-label={s.restore} onChange={e => setRestoreFile(e.target.files?.[0] ?? null)} /><Input type="password" aria-label={s.filePassword} placeholder={s.filePassword} value={backupPassword} onChange={e => setBackupPassword(e.target.value)} /><Button disabled={busy || !restoreFile || !backupPassword} onClick={() => { if (restoreFile && restoreFile.size <= 1024 * 1024) void restoreFile.text().then(encrypted => perform('restore', { encrypted, password: backupPassword })) }}>{s.restore}</Button></div></details>}
    </div>
  </main>
}

createRoot(document.getElementById('root')!).render(<I18nProvider><SteamLinkPage /></I18nProvider>)
