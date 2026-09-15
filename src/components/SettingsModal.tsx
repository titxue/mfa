import React, { useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Github, Tag, ExternalLink, ChevronDown } from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'
import { ImportExportManager } from '@/utils/import-export'
import { VERSION } from '@/version'
import type { Account, Language } from '@/types'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { LANGUAGE_CONFIGS } from '@/locales'
import { useSettings } from '@/hooks/useSettings'
import { SiteAccessSettings } from './SiteAccessSettings'
import { PasswordProtection } from './PasswordProtection'
import { Input } from './ui/input'
import { securityStrings, securityError } from '@/locales/security'
import { vaultRequest } from '@/utils/vault-client'
import { importStrings } from '@/locales/import'
import { bindingStrings } from '@/steam-link/strings'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  onOpenImport: () => void
  protected: boolean
  revision: string
  reload: () => Promise<void>
}

/**
 * 设置模态框
 */
export function SettingsModal({
  open,
  onOpenChange,
  accounts,
  onOpenImport,
  protected: protectedMode,
  revision,
  reload
}: SettingsModalProps) {
  const { t, locale, setLocale, resetLanguage } = useI18n()
  const { settings, loading: settingsLoading, saving: settingsSaving, updateSettings } = useSettings()
  const s = securityStrings(locale)
  const [plainExport, setPlainExport] = React.useState(false)
  const [backupPassword, setBackupPassword] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => { if (!open) { setBackupPassword(''); setExportDialog(false) } }, [open])
  const clickCountRef = useRef(0)
  const lastClickTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [exportDialog, setExportDialog] = React.useState(false)

  // 导出账户
  const handleExport = () => {
    if (accounts.length === 0) {
      toast.error(t('toast.no_accounts_to_export'))
      return
    }
    setPlainExport(false)
    setBackupPassword('')
    setExportDialog(true)
  }

  const confirmExport = async () => {
    if (busy) return
    setBusy(true)
    try {
      const data = await vaultRequest<string>('backup', { plain: plainExport, password: backupPassword })
      if (!alive.current) return
      ImportExportManager.downloadJSON(data)
      toast.success(t('toast.export_success'))
      setExportDialog(false)
    } catch (e) { if (alive.current) toast.error(securityError(locale, e)) }
    finally { setBusy(false); setBackupPassword('') }
  }

  // 切换语言
  const handleLanguageChange = async (newLocale: Language) => {
    try { await setLocale(newLocale); toast.success(t('toast.language_changed')) }
    catch (error) { toast.error(securityError(locale, error)) }
  }

  // 连续点击重置语言（隐藏功能）
  const handleLanguageTitleClick = () => {
    const now = Date.now()
    const timeSinceLastClick = now - lastClickTimeRef.current

    if (timeSinceLastClick > 500) {
      clickCountRef.current = 1
    } else {
      clickCountRef.current++
    }

    lastClickTimeRef.current = now

    if (clickCountRef.current === 3) {
      void resetLanguage().then(() => toast.success(t('toast.language_reset')))
        .catch(error => toast.error(securityError(locale, error)))
      clickCountRef.current = 0
      lastClickTimeRef.current = 0
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      clickCountRef.current = 0
      lastClickTimeRef.current = 0
    }, 500)
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-5">
            <DialogTitle>{t('settings.title')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('settings.language')}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 space-y-6 overflow-y-auto overscroll-contain px-6 py-5">
            {/* 语言设置 */}
            <div className="space-y-2">
              <h3
                className="text-sm font-semibold cursor-pointer select-none hover:text-primary transition-colors"
                onClick={handleLanguageTitleClick}
              >
                {t('settings.language')}
              </h3>
              <div className="space-y-2">
                <Label htmlFor="language">{t('settings.languageTitle')}</Label>
                <div className="relative">
                  <select
                    id="language"
                    value={locale}
                    onChange={(event) => {
                      void handleLanguageChange(event.target.value as Language)
                    }}
                    className="block h-9 w-full appearance-none rounded-md border border-solid border-input bg-background px-3 py-2 pr-10 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ring"
                  >
                    {LANGUAGE_CONFIGS.map((config) => (
                      <option key={config.code} value={config.code}>
                        {config.nativeName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('settings.languageDesc')}
                </p>
              </div>
            </div>

            <PasswordProtection protected={protectedMode} revision={revision} reload={reload} />

            {/* 自动填充设置 */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{t('settings.autofill')}</h3>
              <SiteAccessSettings />
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-medium">{t('settings.inlineMenu')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.inlineMenuDesc')}
                    </p>
                  </div>
                  <Switch
                    className="flex-shrink-0"
                    disabled={settingsLoading || settingsSaving}
                    checked={settings.autofillInlineMenu}
                    onCheckedChange={(value) =>
                      void updateSettings({ autofillInlineMenu: value }).catch(error => toast.error(securityError(locale, error)))
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-medium">{t('settings.clipboardFallback')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.clipboardFallbackDesc')}
                    </p>
                  </div>
                  <Switch
                    className="flex-shrink-0"
                    disabled={settingsLoading || settingsSaving}
                    checked={settings.clipboardFallback}
                    onCheckedChange={(value) =>
                      void updateSettings({ clipboardFallback: value }).catch(error => toast.error(securityError(locale, error)))
                    }
                  />
                </div>
              </div>
            </div>

            {/* 账户管理 */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{t('settings.accountManagement')}</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full" onClick={handleExport}>
                  {t('settings.export')}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t('settings.exportDesc')}
                </p>

                <Button variant="outline" className="w-full" onClick={onOpenImport}>
                  {t('settings.import')}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {importStrings(locale).description}
                </p>
                <Button variant="outline" className="w-full" disabled={typeof chrome === 'undefined' || !chrome.runtime?.id} onClick={() => {
                  const url = chrome.runtime.getURL('steam-link.html')
                  void chrome.tabs.query({ url }).then(tabs => {
                    if (tabs[0]?.id !== undefined) return chrome.tabs.update(tabs[0].id, { active: true })
                    return chrome.tabs.create({ url })
                  })
                }}>{bindingStrings(locale).title}</Button>
              </div>
            </div>

            {/* 关于 */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">{t('settings.about')}</h3>
              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Tag className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{t('settings.appName')}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        v{VERSION} - {t('settings.appDescription')}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                    asChild
                  >
                    <a
                      href={t('settings.appGithubUrl')}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="flex items-center gap-2">
                        <Github className="w-4 h-4" />
                        {t('settings.appGithub')}
                      </span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 导出确认对话框 */}
      <AlertDialog open={exportDialog} onOpenChange={value => { if (!busy) { setExportDialog(value); setBackupPassword('') } }}>
        <AlertDialogContent className="export-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialog.export_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialog.export_message', { count: accounts.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {protectedMode && <div className="space-y-3">
            <Label htmlFor="backup-format">{s.encrypted} / {s.plain}</Label>
            <select id="backup-format" className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={plainExport ? 'plain' : 'encrypted'} disabled={busy} onChange={e => setPlainExport(e.target.value === 'plain')}>
              <option value="encrypted">{s.encrypted}</option><option value="plain">{s.plain}</option>
            </select>
            {plainExport && <><p className="text-xs text-muted-foreground">{s.plainWarning}</p><Label htmlFor="export-password">{s.password}</Label><Input id="export-password" type="password" autoComplete="current-password" value={backupPassword} disabled={busy} onChange={e => setBackupPassword(e.target.value)} /></>}
          </div>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t('button.cancel')}</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); void confirmExport() }}>
              {t('button.export')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  )
}
