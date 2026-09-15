import React, { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { useI18n } from '@/contexts/I18nContext'
import { importMessage, importStrings, importQueueStrings } from '@/locales/import'
import { securityError, securityStrings } from '@/locales/security'
import { ImportExportManager } from '@/utils/import-export'
import { IMPORT_ACCEPT, encryptedBackupIdentity, importPreview, mergeImportChunks, parseImportText, type ImportChunk } from '@/utils/otp-import'
import type { Account } from '@/types'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'

type Source = File | string
interface EncryptedSource { text: string; identity: string; label?: string }
interface Props {
  initialChunks: ImportChunk[]
  accounts: Account[]
  onImport: (accounts: Account[]) => Promise<boolean>
  onClose: () => void
}

/** Mounted only for one import session; closing or locking drops all temporary secrets. */
export function ImportAccountsDialog({ initialChunks, accounts, onImport, onClose }: Props) {
  const { t, locale } = useI18n()
  const s = importStrings(locale), security = securityStrings(locale)
  const queue = importQueueStrings(locale)
  const [chunks, setChunks] = useState(() => mergeImportChunks([], initialChunks))
  const [excluded, setExcluded] = useState(new Set<string>())
  const [text, setText] = useState('')
  const [textOpen, setTextOpen] = useState(initialChunks.length === 0)
  const [pending, setPending] = useState<EncryptedSource[]>([])
  const encryptedSources = useRef(new Set<string>())
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const alive = useRef(true), working = useRef(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const preview = importPreview(chunks, accounts)
  const selected = preview.accounts.filter(a => !excluded.has(a.name))
  const parse = (source: Source, key?: string) => typeof source === 'string'
    ? parseImportText(source, key) : ImportExportManager.parseFile(source, key)

  const readSources = async (sources: Source[]) => {
    if (working.current || !sources.length) return
    working.current = true; setBusy(true); setError('')
    for (const source of sources) {
      try {
        const result = await parse(source)
        if (!alive.current) break
        setChunks(current => mergeImportChunks(current, result))
      } catch (e) {
        if (!alive.current) break
        if ((e as Error).message === 'passwordRequired') {
          try {
            const text = typeof source === 'string' ? source : await source.text()
            if (!alive.current) break
            const identity = encryptedBackupIdentity(text)
            if (!encryptedSources.current.has(identity)) {
              encryptedSources.current.add(identity)
              setPending(current => [...current, { text, identity, ...(typeof source === 'string' ? {} : { label: source.name }) }])
            }
          } catch (error) { if (alive.current) setError(securityError(locale, error)) }
        }
        else setChunks(current => [...current, { kind: 'backup', accounts: [], issues: [{ reason: (e as Error).message === 'noQr' ? 'noQr' : 'invalid' }] }])
      }
    }
    working.current = false
    if (alive.current) { setBusy(false); setText(''); setTextOpen(false) }
  }

  const decryptNext = async () => {
    if (working.current || !pending.length) return
    working.current = true; setBusy(true); setError('')
    try {
      const result = await parseImportText(pending[0].text, password)
      if (!alive.current) return
      setChunks(current => mergeImportChunks(current, result))
      setPending(current => current.slice(1))
    } catch (e) { if (alive.current) setError(securityError(locale, e)) }
    finally { working.current = false; if (alive.current) { setBusy(false); setPassword('') } }
  }

  const confirm = async () => {
    if (working.current || !preview.complete || pending.length || !selected.length) return
    working.current = true; setBusy(true); setError('')
    try {
      if (!await onImport([...accounts, ...selected])) throw new Error('storageError')
      if (!alive.current) return
      toast.success(t('toast.import_success', { imported: selected.length }))
      onClose()
    } catch (e) { if (alive.current) setError(securityError(locale, e)) }
    finally { working.current = false; if (alive.current) setBusy(false) }
  }

  const handlePaste = (event: React.ClipboardEvent) => {
    if (working.current) return
    const files = Array.from(event.clipboardData.files)
    if (files.length) { event.preventDefault(); void readSources(files); return }
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
    const value = event.clipboardData.getData('text/plain').trim()
    if (value) { event.preventDefault(); void readSources([value]) }
  }

  return <Dialog open onOpenChange={value => { if (!value && !working.current) onClose() }}>
    <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0"
      onPaste={handlePaste}
      onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }}
      onDrop={event => { event.preventDefault(); void readSources(Array.from(event.dataTransfer.files)) }}>
      <DialogHeader className="shrink-0 border-b px-5 py-4 pr-10">
        <DialogTitle>{s.title}</DialogTitle>
        <DialogDescription className="text-xs leading-relaxed">{s.description}</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
        <Button variant="outline" className="h-auto min-h-9 w-full whitespace-normal" disabled={busy} onClick={() => fileInput.current?.click()}>{s.files}</Button>
        <input ref={fileInput} type="file" multiple accept={IMPORT_ACCEPT} className="hidden" aria-label={s.files}
          onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void readSources(files) }} />
        <div className="space-y-2">
          <button type="button" className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium" aria-expanded={textOpen} aria-controls="import-text-area" disabled={busy} onClick={() => setTextOpen(value => !value)}>
            {s.text}<ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${textOpen ? 'rotate-180' : ''}`} />
          </button>
          {textOpen && <div id="import-text-area" className="space-y-2">
          <Label htmlFor="import-text" className="sr-only">{s.text}</Label>
          <textarea id="import-text" value={text} disabled={busy} onChange={event => setText(event.target.value)} autoComplete="off" spellCheck={false}
            className="block min-h-20 w-full resize-y rounded-md border border-input bg-background p-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          <Button variant="secondary" size="sm" disabled={busy || !text.trim()} onClick={() => void readSources([text])}>{s.read}</Button>
          </div>}
        </div>
        {pending.length > 0 && <form className="space-y-2 rounded-md border p-3" onSubmit={event => { event.preventDefault(); void decryptNext() }}>
          <p className="break-all text-xs text-muted-foreground">{pending[0].label || security.encrypted} ({pending.length})</p>
          <Label htmlFor="import-password">{security.backupPassword}</Label>
          <Input id="import-password" type="password" autoComplete="off" value={password} disabled={busy} onChange={event => setPassword(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" type="submit" disabled={busy}>{security.unlock}</Button>
            <Button size="sm" type="button" variant="ghost" disabled={busy} onClick={() => {
              encryptedSources.current.delete(pending[0].identity)
              setPending(current => current.slice(1)); setPassword(''); setError('')
            }}>{queue.skip}</Button>
          </div>
        </form>}
        {preview.progress.map(batch => <div key={batch.id} className="space-y-1 rounded-md bg-muted p-3 text-xs">
          <p>{importMessage(s.batch, batch)}</p>
          {batch.received < batch.size && <p className="text-muted-foreground">{s.incomplete}</p>}
        </div>)}
        {chunks.length === 0 && pending.length === 0 && <p className="text-xs text-muted-foreground">{s.empty}</p>}
        {preview.accounts.length > 0 && <div className="space-y-2">
          <p className="text-sm font-medium" aria-live="polite">{importMessage(s.summary, { selected: selected.length, total: preview.accounts.length })}</p>
          <div className="divide-y rounded-md border">
            {preview.accounts.map(account => <label key={account.name} className="flex cursor-pointer items-start gap-3 p-3 text-sm">
              <input type="checkbox" className="mt-0.5 shrink-0 accent-primary" checked={!excluded.has(account.name)} disabled={busy}
                onChange={event => { const checked = event.target.checked; setExcluded(current => { const next = new Set(current); if (checked) next.delete(account.name); else next.add(account.name); return next }) }} />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{account.name}
                {account.type === 'steam' && <span className="block text-xs text-muted-foreground">Steam Guard</span>}
              </span>
            </label>)}
          </div>
        </div>}
        {preview.duplicates.length > 0 && <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">{importMessage(s.duplicates, { count: preview.duplicates.length })}</summary>
          <ul className="mt-2 space-y-1">{preview.duplicates.map((name, i) => <li className="break-all" key={i}>{name}</li>)}</ul>
        </details>}
        {preview.issues.length > 0 && <div className="space-y-2 rounded-md border border-destructive/30 p-3 text-xs">
          <p className="font-medium">{importMessage(s.issues, { count: preview.issues.length })}</p>
          <ul className="space-y-2">{preview.issues.map((item, i) => <li key={i} className="break-words [overflow-wrap:anywhere]">
            <span className="font-medium">{item.name || importMessage(s.entry, { index: i + 1 })}</span>: {s[item.reason]}
          </li>)}</ul>
        </div>}
        {(chunks.length > 0 || pending.length > 0) && <Button variant="ghost" size="sm" disabled={busy} onClick={() => { setChunks([]); setExcluded(new Set()); setPending([]); encryptedSources.current.clear(); setPassword(''); setText(''); setTextOpen(true); setError('') }}>{s.reset}</Button>}
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="shrink-0 space-y-2 border-t px-5 py-4">
        {pending.length > 0 && <p role="status" className="text-xs text-muted-foreground">{importMessage(queue.waiting, { count: pending.length })}</p>}
        <div className="flex gap-2">
        <Button className="flex-1" variant="outline" disabled={busy} onClick={onClose}>{t('button.cancel')}</Button>
        <Button className="flex-1" disabled={busy || !selected.length || !preview.complete || pending.length > 0} onClick={() => void confirm()}>
          {busy ? security.loading : `${t('button.import')} (${selected.length})`}
        </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
}
