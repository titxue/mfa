import React, { useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/contexts/I18nContext'
import { ImportExportManager } from '@/utils/import-export'
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

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  onImport: (newAccounts: Account[]) => void
}

/**
 * 设置模态框
 */
export function SettingsModal({
  open,
  onOpenChange,
  accounts,
  onImport
}: SettingsModalProps) {
  const { t, locale, setLocale } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exportDialog, setExportDialog] = React.useState(false)
  const [importDialog, setImportDialog] = React.useState(false)
  const [importFile, setImportFile] = React.useState<File | null>(null)

  // 导出账户
  const handleExport = () => {
    if (accounts.length === 0) {
      toast.error(t('toast.no_accounts_to_export'))
      return
    }
    setExportDialog(true)
  }

  const confirmExport = () => {
    ImportExportManager.downloadExportFile(accounts)
    toast.success(t('toast.export_success'))
    setExportDialog(false)
  }

  // 导入账户
  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImportFile(file)
      setImportDialog(true)
    }
    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const confirmImport = async () => {
    if (!importFile) return

    try {
      const result = await ImportExportManager.importAccounts(importFile, accounts)

      if (result.newAccounts.length === 0) {
        if (result.duplicateCount > 0) {
          toast.warning(t('toast.import_all_duplicates'))
        } else {
          toast.error(t('toast.import_no_valid'))
        }
      } else {
        onImport([...accounts, ...result.newAccounts])

        if (result.duplicateCount > 0) {
          toast.success(
            t('toast.import_success_with_skip', {
              imported: result.newAccounts.length,
              skipped: result.duplicateCount
            })
          )
        } else {
          toast.success(
            t('toast.import_success', {
              imported: result.newAccounts.length
            })
          )
        }
      }
    } catch (error) {
      toast.error(t('toast.invalid_file_format'))
    }

    setImportDialog(false)
    setImportFile(null)
  }

  // 切换语言
  const handleLanguageChange = async (newLocale: Language) => {
    await setLocale(newLocale)
    toast.success(t('toast.language_changed'))
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.title')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 语言设置 */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{t('settings.language')}</h3>
              <div className="space-y-2">
                <Label htmlFor="language">{t('settings.languageTitle')}</Label>
                <Select value={locale} onValueChange={handleLanguageChange}>
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh-CN">{t('settings.languageChinese')}</SelectItem>
                    <SelectItem value="en-US">{t('settings.languageEnglish')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('settings.languageDesc')}
                </p>
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

                <Button variant="outline" className="w-full" onClick={handleImportClick}>
                  {t('settings.import')}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t('settings.importDesc')}
                </p>
              </div>
            </div>

            {/* 关于 */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{t('settings.about')}</h3>
              <div className="space-y-1">
                <p className="text-sm font-medium">{t('settings.appName')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('settings.appVersion')}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* 导出确认对话框 */}
      <AlertDialog open={exportDialog} onOpenChange={setExportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialog.export_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialog.export_message', { count: accounts.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('button.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExport}>
              {t('button.export')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 导入确认对话框 */}
      <AlertDialog open={importDialog} onOpenChange={setImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialog.import_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialog.import_message', { count: '?' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('button.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>
              {t('button.import')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
