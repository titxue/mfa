import React, { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { QrCode } from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'
import { toast } from 'sonner'
import { parseQRCodeFromFile } from '@/utils/qr-parser'
import { parseImportText, parseManualSecret, type ImportChunk } from '@/utils/otp-import'
import { importStrings } from '@/locales/import'
import { cn } from '@/utils/cn'
import type { Account, TOTPAlgorithm } from '@/types'
import { TOTP } from '@/utils/totp'
import { steamStrings } from '@/locales/steam'

type ModalMode = 'add' | 'edit'

interface AddAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: ModalMode
  onAdd?: (account: Account) => Promise<{ success: boolean; message?: string }>
  onEdit?: (originalName: string, account: Account) => Promise<{ success: boolean; message?: string }>
  onImportData?: (chunks: ImportChunk[]) => void
  initialData?: Account
}

/**
 * 添加/编辑账户模态框
 */
export function AddAccountModal({
  open,
  onOpenChange,
  mode,
  onAdd,
  onEdit,
  initialData,
  onImportData
}: AddAccountModalProps) {
  const { t, locale } = useI18n()
  const strings = importStrings(locale)
  const steam = steamStrings(locale)
  const [sourceType, setSourceType] = useState<Account['type']>()
  const [steamEncoding, setSteamEncoding] = useState<'' | 'base32' | 'base64'>('')
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [secret, setSecret] = useState('')
  const [algorithm, setAlgorithm] = useState<TOTPAlgorithm>('SHA1')
  const [digits, setDigits] = useState<6 | 8>(6)
  const [period, setPeriod] = useState<number>(30)
  let detected: ReturnType<typeof parseManualSecret> | undefined
  try { if (mode === 'add' && secret.trim()) detected = parseManualSecret(secret, sourceType) } catch { /* Validate on submission. */ }
  const type = sourceType ?? (mode === 'edit' ? initialData?.type : detected?.type) ?? 'totp'
  const encoding = sourceType === undefined && detected?.type === 'steam' ? 'base64' : steamEncoding
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const qrInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)
  const working = useRef(false)
  const generation = useRef(0)
  useEffect(() => {
    generation.current++
    setLoading(false)
    return () => { generation.current++ }
  }, [open, mode, initialData?.name])

  // 当模态框打开时填充初始值
  useEffect(() => {
    if (!open) {
      setName(''); setSecret(''); setWebsite(''); setScanning(false); setSourceType(undefined); setSteamEncoding('')
      setAlgorithm('SHA1'); setDigits(6); setPeriod(30)
    } else if (mode === 'edit' && initialData) {
      setName(initialData.name)
      setWebsite(initialData.website || '')
      setSecret(initialData.secret)
      setSourceType(initialData.type ?? 'totp')
      setSteamEncoding('base32')
      setAlgorithm(initialData.algorithm ?? 'SHA1')
      setDigits(initialData.digits ?? 6)
      setPeriod(initialData.period ?? 30)
    } else if (open && mode === 'add') {
      setName('')
      setWebsite('')
      setSecret('')
      setSourceType(undefined)
      setSteamEncoding('')
      setAlgorithm('SHA1'); setDigits(6); setPeriod(30)
    }
  }, [open, mode, initialData])

  // 处理扫描二维码
  const handleScanQRCode = () => {
    qrInputRef.current?.click()
  }

  const receive = (chunks: ImportChunk[]) => {
    const error = chunks.flatMap(chunk => chunk.issues)[0]
    if (error && !chunks.some(chunk => chunk.accounts.length || chunk.batch)) {
      toast.error(strings[error.reason])
      return
    }
    if (chunks.length === 1 && chunks[0].kind === 'standard' && chunks[0].accounts.length === 1 && !chunks[0].issues.length) {
      const account = chunks[0].accounts[0]
      if (mode === 'edit' && (account.type ?? 'totp') !== type) { toast.error(strings.useImport); return }
      setName(account.name)
      setSourceType(account.type ?? 'totp')
      setSecret(account.secret)
      setSteamEncoding('base32')
      setAlgorithm(account.algorithm ?? 'SHA1')
      setDigits(account.digits ?? 6)
      setPeriod(account.period ?? 30)
      toast.success(t('toast.qr_success'))
    } else if (mode === 'edit') toast.error(strings.useImport)
    else onImportData?.(chunks)
  }

  const processInput = async (input: File[] | string) => {
    if (working.current) return
    working.current = true; setScanning(true)
    const id = generation.current
    try {
      const chunks: ImportChunk[] = []
      if (typeof input === 'string') chunks.push(...await parseImportText(input))
      else for (const file of input) {
        try { chunks.push(await parseQRCodeFromFile(file)) }
        catch (error) { chunks.push({ kind: 'standard', accounts: [], issues: [{ reason: (error as Error).message === 'noQr' ? 'noQr' : 'invalid' }] }) }
      }
      if (generation.current === id) receive(chunks)
    } catch { if (generation.current === id) toast.error(strings.invalid) }
    finally { working.current = false; if (generation.current === id) setScanning(false) }
  }

  const handleQRFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length) void processInput(files)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    const id = generation.current

    if (!name.trim()) {
      toast.error(t('toast.fill_all_fields'))
      return
    }

    setLoading(true)

    try {
      let accountType: Account['type'] = type
      let accountSecret = initialData?.secret ?? ''
      if (mode === 'add') {
        if (type === 'steam' && !encoding) { toast.error(steam.chooseEncoding); return }
        try {
          const parsed = type === 'steam'
            ? { secret: encoding === 'base64' ? TOTP.steamSecretToBase32(secret) : parseManualSecret(secret, 'totp').secret, type: 'steam' as const }
            : parseManualSecret(secret, sourceType)
          accountSecret = parsed.secret; accountType = parsed.type
        } catch { toast.error(t('toast.invalid_secret')); return }
      }
      const processedAccount: Account = {
        name: name.trim(),
        website: website.trim() || undefined,
        secret: accountSecret,
        ...(accountType === 'steam' ? { type: 'steam' } : {}),
        ...(accountType !== 'steam' && algorithm !== 'SHA1' ? { algorithm } : {}),
        ...(accountType !== 'steam' && digits !== 6 ? { digits } : {}),
        ...(accountType !== 'steam' && period !== 30 ? { period } : {})
      }

      let result: { success: boolean; message?: string }

      if (mode === 'add' && onAdd) {
        result = await onAdd(processedAccount)
      } else if (mode === 'edit' && onEdit && initialData) {
        result = await onEdit(initialData.name, processedAccount)
      } else {
        throw new Error('Invalid modal configuration')
      }

      if (generation.current !== id) return
      if (result.success) {
        if (mode === 'add') {
          toast.success(`${name}`)
        } else {
          toast.success(t('toast.account_updated'))
        }
        setName('')
        setSecret('')
        setSourceType(undefined)
        onOpenChange(false)
      } else {
        toast.error(t(result.message as any))
      }
    } catch (error) {
      if (generation.current === id) toast.error(t('error.init_failed'))
    } finally {
      if (generation.current === id) setLoading(false)
    }
  }

  // 拖拽进入
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    dragCounterRef.current++

    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }

  // 拖拽悬停
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  // 拖拽离开
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    dragCounterRef.current--

    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }

  // 文件放下
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsDragging(false)
    dragCounterRef.current = 0

    const files = Array.from(e.dataTransfer.files)
    if (files.length) await processInput(files)
  }

  // 模态框关闭处理
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)

    if (!newOpen) {
      setIsDragging(false)
      dragCounterRef.current = 0
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    if (working.current) return
    const files = Array.from(e.clipboardData.files)
    if (files.length) { e.preventDefault(); void processInput(files); return }
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
    const text = e.clipboardData.getData('text/plain').trim()
    if (/^(otpauth(?:-migration)?:\/\/|[\[{])/.test(text)) {
      e.preventDefault(); void processInput(text)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onPaste={handlePaste}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "max-h-[calc(100dvh-1rem)] overflow-y-auto",
          isDragging && "ring-2 ring-primary ring-offset-2 bg-primary/5"
        )}
      >
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? t('form.title_add') : t('form.title_edit')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('form.accountInfo')}
          </DialogDescription>
        </DialogHeader>

        {/* 扫描二维码按钮 */}
        <Button
          type="button"
          variant="outline"
          onClick={handleScanQRCode}
          disabled={scanning}
          className="w-full"
        >
          <QrCode className="w-4 h-4 mr-2" />
          {t('form.scanQRCode')}
        </Button>
        <div className="text-xs text-muted-foreground text-center -mt-2 space-y-0.5">
          <p>{t('form.scanQRCodeDesc')}</p>
          {mode === 'add' && <p>Google Authenticator · otpauth</p>}
          <p className="text-muted-foreground/70">{t('form.pasteQRCodeHint')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{t('form.accountName')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('form.accountNamePlaceholder')}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('form.accountNameDesc')}
            </p>
          </div>

          <div>
            <Label htmlFor="website">{t('form.website')}</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder={t('form.websitePlaceholder')}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('form.websiteDesc')}
            </p>
          </div>

          <div>
            <Label htmlFor="code-type">{t('form.codeType')}</Label>
            <select id="code-type" value={type} onChange={e => { setSourceType(e.target.value as 'totp' | 'steam'); setSteamEncoding('') }}
              className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="totp">{t('form.codeTypeTotp')}</option>
              <option value="steam">Steam Guard</option>
            </select>
          </div>

          {type === 'totp' && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="algorithm">{t('form.algorithm')}</Label>
                <select id="algorithm" value={algorithm} onChange={e => setAlgorithm(e.target.value as TOTPAlgorithm)}
                  className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                  <option value="SHA1">SHA-1</option>
                  <option value="SHA256">SHA-256</option>
                  <option value="SHA512">SHA-512</option>
                </select>
              </div>
              <div>
                <Label htmlFor="digits">{t('form.digits')}</Label>
                <select id="digits" value={digits} onChange={e => setDigits(Number(e.target.value) as 6 | 8)}
                  className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                  <option value="6">6</option>
                  <option value="8">8</option>
                </select>
              </div>
              <div>
                <Label htmlFor="period">{t('form.period')}</Label>
                <select id="period" value={period} onChange={e => setPeriod(Number(e.target.value))}
                  className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                  {Array.from({ length: 106 }, (_, index) => index + 15).map(seconds => (
                    <option key={seconds} value={seconds}>{seconds}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {mode === 'add' && (
            <div>
              {type === 'steam' && <div className="mb-4">
                <Label htmlFor="steam-secret-format">{steam.encoding}</Label>
                <select id="steam-secret-format" value={encoding}
                  onChange={e => { setSourceType('steam'); setSteamEncoding(e.target.value as '' | 'base32' | 'base64') }}
                  className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">{steam.chooseEncoding}</option>
                  <option value="base32">Base32</option>
                  <option value="base64">Base64 shared_secret</option>
                </select>
              </div>}
              <Label htmlFor="secret">{t('form.secretKey')}</Label>
              <Input
                id="secret"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={type === 'steam' ? 'Base32 / shared_secret (Base64)' : 'Base32 / Steam shared_secret'}
                autoComplete="off"
                spellCheck={false}
                className="mt-2 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {type === 'steam' ? t('form.steamSecretDesc') : sourceType ? t('form.secretKeyDesc') : steam.autoHint}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {t('button.cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {mode === 'add' ? t('button.add') : t('button.save')}
            </Button>
          </div>
        </form>

        {/* 隐藏的文件输入 */}
        <input
          ref={qrInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleQRFileSelect}
        />

        {/* 拖拽 Overlay - 放在最后，使用固定定位 */}
        {isDragging && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <QrCode className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-base font-medium">{t('form.dropImageHere')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('form.dropImageDesc')}
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
