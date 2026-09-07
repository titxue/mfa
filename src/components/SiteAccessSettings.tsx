import React, { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { useI18n } from '@/contexts/I18nContext'
import { getCurrentTab } from '@/utils/page-analyzer'
import { grantedSites, sitePattern } from '@/utils/site-access'
import { Globe } from 'lucide-react'

const statusLabels: Record<string, [string, string, string]> = {
  'zh-CN': ['已授权', '未授权', '启用'],
  'zh-TW': ['已授權', '未授權', '啟用'],
  'en-US': ['Allowed', 'Not allowed', 'Enable'],
  'es-ES': ['Autorizado', 'Sin permiso', 'Activar'],
  'fr-FR': ['Autorisé', 'Non autorisé', 'Activer'],
  'pt-BR': ['Autorizado', 'Sem permissão', 'Ativar'],
  'de-DE': ['Erlaubt', 'Nicht erlaubt', 'Aktivieren'],
  'ru-RU': ['Разрешено', 'Не разрешено', 'Включить'],
  'ar-SA': ['مسموح', 'غير مسموح', 'تفعيل'],
  'ja-JP': ['許可済み', '未許可', '有効化'],
  'ko-KR': ['허용됨', '허용 안 됨', '사용'],
  'hi-IN': ['अनुमत', 'अनुमति नहीं', 'चालू करें'],
}

// Kept together because these labels belong only to the per-site permission control.
const labels: Record<string, string[]> = {
  'zh-CN': ['网站授权', '在此网站启用自动菜单', '撤销', '仅在授权的网站自动显示菜单；其他网站仍可点击扩展填充。', '请在普通 HTTP/HTTPS 网页打开设置。', '未获得授权，或操作失败，请重试。'],
  'zh-TW': ['網站授權', '在此網站啟用自動選單', '撤銷', '僅在授權網站自動顯示選單；其他網站仍可點擊擴充功能填入。', '請在 HTTP/HTTPS 網頁開啟設定。', '未取得授權或操作失敗，請重試。'],
  'en-US': ['Site access', 'Enable automatic menu on this site', 'Revoke', 'Show menus automatically only on approved sites. Click the extension to fill elsewhere.', 'Open settings on an HTTP/HTTPS web page.', 'Permission not granted or operation failed. Please retry.'],
  'es-ES': ['Acceso a sitios', 'Activar menú automático aquí', 'Revocar', 'Menús automáticos solo en sitios autorizados. En otros, pulsa la extensión para rellenar.', 'Abre la configuración en una página HTTP/HTTPS.', 'Permiso no concedido u operación fallida. Reinténtalo.'],
  'fr-FR': ['Accès aux sites', 'Activer le menu automatique ici', 'Révoquer', 'Menus automatiques uniquement sur les sites autorisés. Ailleurs, cliquez sur l’extension.', 'Ouvrez les paramètres sur une page HTTP/HTTPS.', 'Autorisation refusée ou échec. Réessayez.'],
  'pt-BR': ['Acesso a sites', 'Ativar menu automático neste site', 'Revogar', 'Menus automáticos apenas nos sites autorizados. Nos demais, clique na extensão.', 'Abra as configurações em uma página HTTP/HTTPS.', 'Permissão não concedida ou falha. Tente novamente.'],
  'de-DE': ['Website-Zugriff', 'Automatisches Menü hier aktivieren', 'Entziehen', 'Automatische Menüs nur auf erlaubten Websites. Sonst zum Ausfüllen auf die Erweiterung klicken.', 'Einstellungen auf einer HTTP/HTTPS-Seite öffnen.', 'Keine Berechtigung oder Fehler. Erneut versuchen.'],
  'ru-RU': ['Доступ к сайтам', 'Включить автоматическое меню здесь', 'Отозвать', 'Автоматическое меню только на разрешённых сайтах. На других нажмите расширение.', 'Откройте настройки на странице HTTP/HTTPS.', 'Разрешение не получено или произошла ошибка. Повторите.'],
  'ar-SA': ['الوصول إلى المواقع', 'تفعيل القائمة التلقائية لهذا الموقع', 'إلغاء', 'تظهر القوائم تلقائياً في المواقع المصرح بها فقط. انقر على الإضافة للتعبئة في غيرها.', 'افتح الإعدادات في صفحة HTTP/HTTPS.', 'لم يتم منح الإذن أو فشلت العملية. أعد المحاولة.'],
  'ja-JP': ['サイトのアクセス権', 'このサイトで自動メニューを有効化', '取り消す', '許可したサイトのみ自動表示します。他のサイトは拡張機能をクリックして入力できます。', 'HTTP/HTTPS ページで設定を開いてください。', '許可されなかったか処理に失敗しました。再試行してください。'],
  'ko-KR': ['사이트 권한', '이 사이트에서 자동 메뉴 사용', '철회', '허용한 사이트에서만 메뉴를 자동 표시합니다. 다른 사이트에서는 확장 프로그램을 클릭하세요.', 'HTTP/HTTPS 페이지에서 설정을 여세요.', '권한이 부여되지 않았거나 실패했습니다. 다시 시도하세요.'],
  'hi-IN': ['साइट की अनुमति', 'इस साइट पर स्वचालित मेनू चालू करें', 'हटाएँ', 'केवल अनुमत साइटों पर मेनू अपने आप दिखाएँ। अन्य साइटों पर भरने के लिए एक्सटेंशन क्लिक करें।', 'HTTP/HTTPS पेज पर सेटिंग खोलें।', 'अनुमति नहीं मिली या कार्रवाई विफल हुई। फिर कोशिश करें।'],
}

export function SiteAccessSettings() {
  const { locale } = useI18n()
  const text = labels[locale] ?? labels['en-US']
  const status = statusLabels[locale] ?? statusLabels['en-US']
  const [current, setCurrent] = useState<{ pattern: string; tabId: number } | null>(null)
  const [sites, setSites] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let live = true
    if (typeof chrome === 'undefined' || !chrome.permissions) return
    const refresh = async () => {
      try {
        const [tab, approved] = await Promise.all([getCurrentTab(), grantedSites()])
        if (!live) return
        const pattern = tab?.url ? sitePattern(tab.url) : null
        setCurrent(pattern && tab?.id !== undefined ? { pattern, tabId: tab.id } : null)
        setSites(approved)
        setReady(true)
      } catch { if (live) setError(true) }
    }
    void refresh()
    chrome.permissions.onAdded.addListener(refresh)
    chrome.permissions.onRemoved.addListener(refresh)
    return () => {
      live = false
      chrome.permissions.onAdded.removeListener(refresh)
      chrome.permissions.onRemoved.removeListener(refresh)
    }
  }, [])

  async function sync() {
    const result = await chrome.runtime.sendMessage({ type: 'SITE_ACCESS_SYNC' })
    if (!result?.ok) throw new Error('Unable to register site menu')
    setSites(await grantedSites())
  }

  async function enable() {
    if (!current) return
    setBusy(true)
    setError(false)
    try {
      // Call directly from the click handler: no await before request.
      const allowed = await chrome.permissions.request({ origins: [current.pattern] })
      if (!allowed) { setError(true); return }
      await sync()
      try {
        await chrome.scripting.executeScript({
          target: { tabId: current.tabId, allFrames: true }, files: ['content-script.js'],
        })
      } catch {
        // Other-origin frames are not authorized by this site's grant.
        await chrome.scripting.executeScript({
          target: { tabId: current.tabId }, files: ['content-script.js'],
        })
      }
      await chrome.tabs.sendMessage(current.tabId, { type: 'SITE_ACCESS_CHANGED' })
    } catch { setError(true) }
    finally { setBusy(false) }
  }

  async function revoke(pattern: string) {
    setBusy(true)
    setError(false)
    try {
      if (!await chrome.permissions.remove({ origins: [pattern] })) throw new Error('Not removed')
      await sync()
    } catch { setError(true) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{text[0]}</p>
      {(current || sites.length > 0) && (
        <div className="divide-y rounded-md border">
          {[...(current ? [current.pattern] : []), ...sites.filter(pattern => pattern !== current?.pattern)].map(pattern => {
            const allowed = sites.includes(pattern)
            return (
              <div key={pattern} className="flex items-center gap-3 px-3 py-2.5">
                <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium" title={pattern.slice(0, -2)}>{pattern.slice(0, -2)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{allowed ? status[0] : status[1]}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 px-2"
                  disabled={!ready || busy}
                  aria-label={`${allowed ? text[2] : text[1]}: ${pattern.slice(0, -2)}`}
                  onClick={() => allowed ? revoke(pattern) : enable()}
                >
                  {allowed ? text[2] : status[2]}
                </Button>
              </div>
            )
          })}
        </div>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">{current ? text[3] : text[4]}</p>
      {error && <p role="alert" className="text-xs text-destructive">{text[5]}</p>}
    </div>
  )
}
