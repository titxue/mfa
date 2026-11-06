import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { useI18n } from '@/contexts/I18nContext'
import { syncRecoveryStrings } from '@/locales/sync-recovery'
import { securityError } from '@/locales/security'
import { vaultRequest } from '@/utils/vault-client'
import { ImportExportManager } from '@/utils/import-export'

interface RecoveryState {
  revision: string
  state: 'migration' | 'conflict' | 'pending' | 'ready'
  protected?: boolean
  candidates: { id: string; label?: string; protected: boolean; accountCount?: number; accountNames?: string[] }[]
}

export function SyncRecovery({ reload }: { reload: () => Promise<void> }) {
  const { locale } = useI18n()
  const s = syncRecoveryStrings(locale)
  const [state, setState] = useState<RecoveryState>()
  const [selected, setSelected] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  useEffect(() => {
    let active = true
    setLoading(true); setLoadFailed(false); setError(''); setState(undefined)
    void (async () => {
      try {
        const value = await vaultRequest<RecoveryState>('recoveries')
        if (active) { setState(value); setSelected(value.candidates[0]?.id ?? '') }
      } catch { if (active) setLoadFailed(true) }
      finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [locale])
  const run = async (operation: () => Promise<void>) => {
    setBusy(true); setError('')
    try { await operation() }
    catch (e) { setError(securityError(locale, e)) }
    finally { setBusy(false); setPassword('') }
  }
  const refresh = async () => {
    setBusy(true); setError(''); setLoadFailed(false); setLoading(true)
    try {
      const value = await vaultRequest<RecoveryState>('recoveries')
      setState(value)
      setSelected(current => value.candidates.some(item => item.id === current) ? current : value.candidates[0]?.id ?? '')
      await reload()
    } catch { setState(undefined); setLoadFailed(true) }
    finally { setBusy(false); setLoading(false); setPassword('') }
  }
  const exportBackup = (candidateId?: string) => run(async () => {
    ImportExportManager.downloadJSON(await vaultRequest<string>('recoveryBackup', { candidateId }))
  })
  const candidate = state?.candidates.find(item => item.id === selected)
  const migration = state?.state === 'migration'
  const conflict = state?.state === 'conflict'
  const ready = state?.state === 'ready'
  const pending = state?.state === 'pending'
  const recoveryForm = !migration && !!state?.candidates.length && <form className="space-y-3" onSubmit={event => {
      event.preventDefault()
      if (ready) return
      void run(async () => {
        await vaultRequest('resolve', { candidateId: selected, revision: state!.revision, password })
        await reload()
      })
    }}>
      <Label htmlFor="recovery-candidate">{ready ? s.chooseVersion : s.choose}</Label>
      <select id="recovery-candidate" className="h-10 w-full rounded-md border bg-background px-2 text-sm"
        value={selected} disabled={busy} required onChange={event => { setSelected(event.target.value); setPassword('') }}>
        {state?.candidates.map(item => <option key={item.id} value={item.id}>
          {item.label ?? item.id.slice(0, 12)} · {item.protected ? s.protectedLabel : s.plainLabel}{item.accountCount === undefined ? '' : ` (${item.accountCount})`}
        </option>)}
      </select>
      {!!candidate?.accountNames?.length && <p className="text-xs text-muted-foreground">{candidate.accountNames.join(', ')}</p>}
      {!ready && (candidate?.protected || state.protected) && <div className="space-y-2">
        <Label htmlFor="recovery-password">{s.password}</Label>
        <Input id="recovery-password" type="password" autoComplete="current-password" value={password}
          required disabled={busy} onChange={event => setPassword(event.target.value)} />
      </div>}
      {!ready && <Button type="submit" className="w-full" disabled={busy}>{busy ? s.busy : s.choose}</Button>}
      <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => exportBackup(selected)}>{s.exportSelected}</Button>
    </form>
  const exportTools = <>
    <p className="text-xs text-muted-foreground">{s.exportWarning}</p>
    <Button variant="outline" className="w-full" disabled={busy || loading} onClick={() => exportBackup()}>{s.exportAll}</Button>
  </>
  return <main className="flex h-[600px] w-[380px] flex-col gap-4 overflow-y-auto bg-background p-6" dir={locale === 'ar-SA' ? 'rtl' : undefined}>
    <h1 className="text-lg font-semibold">{loading ? s.loadingTitle : loadFailed ? s.loadErrorTitle : ready ? s.historyTitle : migration ? s.migrationTitle : conflict ? s.conflictTitle : s.pendingTitle}</h1>
    <p role="status" className="text-sm text-muted-foreground">{loading ? s.loadingHint : loadFailed ? s.loadErrorHint : ready ? s.historyHint : migration ? s.migrationHint : conflict ? s.conflictHint : s.pendingHint}</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!loading && migration && <Button disabled={busy} onClick={() => run(async () => {
      await vaultRequest('migrate', { revision: state!.revision }); await reload()
    })}>{busy ? s.busy : s.migrate}</Button>}
    {!loading && !loadFailed && recoveryForm}
    {!loading && ready && !state?.candidates.length && <p className="text-sm text-muted-foreground">{s.emptyHistory}</p>}
    {!loading && (pending || loadFailed) && <Button disabled={busy} onClick={refresh}>{s.retry}</Button>}
    {!loading && (pending || loadFailed || ready) ? <details className="rounded-lg border p-3">
      <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{s.recoveryTools}</summary>
      <div className="mt-4 space-y-4">{exportTools}</div>
    </details> : !loading && exportTools}
    {!loading && !pending && !loadFailed && <Button variant="ghost" disabled={busy} onClick={refresh}>{s.reload}</Button>}
  </main>
}
