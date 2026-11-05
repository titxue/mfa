import type { Language } from '@/types'

const en = {
  migrationTitle: 'Upgrade account sync',
  migrationHint: 'Update the extension on all devices and export a recovery copy first. Then choose Migrate to move your existing accounts to the new sync format.',
  migrate: 'Migrate',
  conflictTitle: 'Different account versions found',
  conflictHint: 'Your devices have different account versions. Export all versions before choosing one. To keep changes from multiple versions, merge them manually using export and import.',
  pendingTitle: 'Waiting for sync',
  pendingHint: 'Some account data has not arrived yet. Wait for sync, then reload. Your existing data is preserved; no empty account list will be created.',
  exportAll: 'Export all versions',
  exportSelected: 'Export this version for import',
  exportWarning: 'The recovery file may contain unencrypted account keys. Keep it private and store it securely.',
  choose: 'Use this version',
  protectedLabel: 'Password protected',
  plainLabel: 'Unencrypted',
  password: 'Password for this version',
  reload: 'Reload',
  busy: 'Working…',
  done: 'Done',
}

export type SyncRecoveryStrings = { [K in keyof typeof en]: string }
const keys = Object.keys(en) as (keyof SyncRecoveryStrings)[]
const row = (values: string[]): SyncRecoveryStrings => {
  if (values.length !== keys.length) throw new Error('Invalid sync recovery translation')
  return Object.fromEntries(keys.map((key, index) => [key, values[index]])) as SyncRecoveryStrings
}

const messages: Record<Language, SyncRecoveryStrings> = {
  'en-US': en,
  'zh-CN': row([
    '升级账户同步',
    '请先更新所有设备上的扩展，并导出一份恢复副本。然后点击“迁移”，将现有账户迁移到新版同步格式。',
    '迁移', '发现不同的账户版本',
    '各设备的账户版本不同。请在选择版本前导出所有版本。如需保留多个版本中的改动，请通过导出和导入手动合并。',
    '等待同步',
    '部分账户数据尚未同步完成。请等待同步后重新加载。现有数据会保留，不会新建空账户列表。',
    '导出所有版本', '导出此版本以供导入', '恢复文件可能包含未加密的账户密钥。请勿分享，并妥善保管。',
    '使用此版本', '密码保护', '未加密', '此版本的密码', '重新加载', '处理中…', '已完成',
  ]),
  'zh-TW': row([
    '升級帳戶同步',
    '請先更新所有裝置上的擴充功能，並匯出一份復原副本。然後按「遷移」，將現有帳戶遷移至新版同步格式。',
    '遷移', '發現不同的帳戶版本',
    '各裝置的帳戶版本不同。選擇版本前請先匯出所有版本。若要保留多個版本中的變更，請透過匯出與匯入手動合併。',
    '等待同步',
    '部分帳戶資料尚未同步完成。請等待同步後重新載入。現有資料會保留，不會建立空白帳戶清單。',
    '匯出所有版本', '匯出此版本以供匯入', '復原檔案可能包含未加密的帳戶金鑰。請勿分享，並妥善保管。',
    '使用此版本', '密碼保護', '未加密', '此版本的密碼', '重新載入', '處理中…', '已完成',
  ]),
  'es-ES': row([
    'Actualizar la sincronización de cuentas',
    'Actualiza la extensión en todos los dispositivos y exporta primero una copia de recuperación. Después, elige Migrar para trasladar tus cuentas al nuevo formato de sincronización.',
    'Migrar', 'Se encontraron versiones de cuentas diferentes',
    'Tus dispositivos tienen versiones de cuentas diferentes. Exporta todas las versiones antes de elegir una. Para conservar cambios de varias versiones, combínalas manualmente mediante la exportación y la importación.',
    'Esperando la sincronización',
    'Todavía faltan algunos datos de las cuentas. Espera a que se sincronicen y vuelve a cargar. Se conservan los datos existentes; no se creará una lista de cuentas vacía.',
    'Exportar todas las versiones', 'Exportar esta versión para importarla', 'El archivo de recuperación puede contener claves de cuentas sin cifrar. No lo compartas y guárdalo de forma segura.',
    'Usar esta versión', 'Protegida con contraseña', 'Sin cifrar', 'Contraseña de esta versión', 'Volver a cargar', 'Procesando…', 'Listo',
  ]),
  'fr-FR': row([
    'Mettre à niveau la synchronisation des comptes',
    'Mettez à jour l’extension sur tous les appareils et exportez d’abord une copie de récupération. Choisissez ensuite Migrer pour transférer vos comptes vers le nouveau format de synchronisation.',
    'Migrer', 'Différentes versions des comptes détectées',
    'Vos appareils ont des versions différentes des comptes. Exportez toutes les versions avant d’en choisir une. Pour conserver les modifications de plusieurs versions, fusionnez-les manuellement par exportation et importation.',
    'En attente de synchronisation',
    'Certaines données de compte ne sont pas encore arrivées. Attendez la synchronisation, puis rechargez. Les données existantes sont conservées ; aucune liste de comptes vide ne sera créée.',
    'Exporter toutes les versions', 'Exporter cette version pour l’importer', 'Le fichier de récupération peut contenir des clés de compte non chiffrées. Ne le partagez pas et conservez-le en lieu sûr.',
    'Utiliser cette version', 'Protégée par mot de passe', 'Non chiffrée', 'Mot de passe de cette version', 'Recharger', 'Traitement…', 'Terminé',
  ]),
  'pt-BR': row([
    'Atualizar a sincronização de contas',
    'Atualize a extensão em todos os dispositivos e exporte primeiro uma cópia de recuperação. Depois, escolha Migrar para transferir suas contas para o novo formato de sincronização.',
    'Migrar', 'Foram encontradas versões diferentes das contas',
    'Seus dispositivos têm versões diferentes das contas. Exporte todas as versões antes de escolher uma. Para manter alterações de várias versões, combine-as manualmente usando exportação e importação.',
    'Aguardando sincronização',
    'Alguns dados das contas ainda não chegaram. Aguarde a sincronização e recarregue. Os dados existentes serão preservados; nenhuma lista vazia de contas será criada.',
    'Exportar todas as versões', 'Exportar esta versão para importar', 'O arquivo de recuperação pode conter chaves de contas sem criptografia. Não o compartilhe e guarde-o em um local seguro.',
    'Usar esta versão', 'Protegida por senha', 'Sem criptografia', 'Senha desta versão', 'Recarregar', 'Processando…', 'Concluído',
  ]),
  'de-DE': row([
    'Kontosynchronisierung aktualisieren',
    'Aktualisieren Sie die Erweiterung auf allen Geräten und exportieren Sie zuerst eine Wiederherstellungskopie. Wählen Sie dann Migrieren, um Ihre Konten in das neue Synchronisierungsformat zu übertragen.',
    'Migrieren', 'Unterschiedliche Kontoversionen gefunden',
    'Ihre Geräte haben unterschiedliche Kontoversionen. Exportieren Sie alle Versionen, bevor Sie eine auswählen. Um Änderungen aus mehreren Versionen zu behalten, führen Sie diese manuell per Export und Import zusammen.',
    'Warten auf Synchronisierung',
    'Einige Kontodaten sind noch nicht angekommen. Warten Sie auf die Synchronisierung und laden Sie dann neu. Vorhandene Daten bleiben erhalten; es wird keine leere Kontoliste erstellt.',
    'Alle Versionen exportieren', 'Diese Version zum Importieren exportieren', 'Die Wiederherstellungsdatei kann unverschlüsselte Kontoschlüssel enthalten. Geben Sie sie nicht weiter und bewahren Sie sie sicher auf.',
    'Diese Version verwenden', 'Passwortgeschützt', 'Unverschlüsselt', 'Passwort dieser Version', 'Neu laden', 'Wird verarbeitet…', 'Fertig',
  ]),
  'ru-RU': row([
    'Обновить синхронизацию аккаунтов',
    'Сначала обновите расширение на всех устройствах и экспортируйте копию для восстановления. Затем нажмите «Перенести», чтобы перевести аккаунты в новый формат синхронизации.',
    'Перенести', 'Обнаружены разные версии аккаунтов',
    'На устройствах разные версии аккаунтов. Экспортируйте все версии, прежде чем выбирать одну. Чтобы сохранить изменения из нескольких версий, объедините их вручную через экспорт и импорт.',
    'Ожидание синхронизации',
    'Часть данных аккаунтов ещё не получена. Дождитесь синхронизации и перезагрузите. Существующие данные сохраняются; пустой список аккаунтов не будет создан.',
    'Экспортировать все версии', 'Экспортировать эту версию для импорта', 'Файл восстановления может содержать незашифрованные ключи аккаунтов. Не передавайте его другим и храните в безопасном месте.',
    'Использовать эту версию', 'Защищена паролем', 'Без шифрования', 'Пароль этой версии', 'Перезагрузить', 'Обработка…', 'Готово',
  ]),
  'ar-SA': row([
    'ترقية مزامنة الحسابات',
    'حدّث الإضافة على جميع الأجهزة وصدّر نسخة للاسترداد أولاً. ثم اختر «ترحيل» لنقل حساباتك الحالية إلى تنسيق المزامنة الجديد.',
    'ترحيل', 'تم العثور على نسخ مختلفة من الحسابات',
    'توجد نسخ مختلفة من الحسابات على أجهزتك. صدّر جميع النسخ قبل اختيار إحداها. للاحتفاظ بتغييرات من عدة نسخ، ادمجها يدوياً باستخدام التصدير والاستيراد.',
    'في انتظار المزامنة',
    'لم تصل بعض بيانات الحسابات بعد. انتظر اكتمال المزامنة ثم أعد التحميل. ستُحفظ البيانات الحالية ولن تُنشأ قائمة حسابات فارغة.',
    'تصدير جميع النسخ', 'تصدير هذه النسخة لاستيرادها', 'قد يحتوي ملف الاسترداد على مفاتيح حسابات غير مشفّرة. لا تشاركه واحفظه في مكان آمن.',
    'استخدام هذه النسخة', 'محمية بكلمة مرور', 'غير مشفّرة', 'كلمة مرور هذه النسخة', 'إعادة التحميل', 'جارٍ المعالجة…', 'تم',
  ]),
  'ja-JP': row([
    'アカウント同期の更新',
    'まずすべてのデバイスで拡張機能を更新し、復元用のコピーをエクスポートしてください。その後「移行」を選択すると、既存のアカウントを新しい同期形式に移行します。',
    '移行', '異なるアカウントのバージョンが見つかりました',
    'デバイス間でアカウントの内容が異なります。選択する前に、すべてのバージョンをエクスポートしてください。複数のバージョンの変更を残すには、エクスポートとインポートで手動で統合してください。',
    '同期待ち',
    '一部のアカウントデータがまだ届いていません。同期を待ってから再読み込みしてください。既存のデータは保持され、空のアカウント一覧は作成されません。',
    'すべてのバージョンをエクスポート', 'このバージョンをインポート用にエクスポート', '復元ファイルに暗号化されていないアカウントキーが含まれる場合があります。共有せず、安全に保管してください。',
    'このバージョンを使用', 'パスワード保護あり', '暗号化なし', 'このバージョンのパスワード', '再読み込み', '処理中…', '完了',
  ]),
  'ko-KR': row([
    '계정 동기화 업그레이드',
    '먼저 모든 기기에서 확장 프로그램을 업데이트하고 복구용 사본을 내보내세요. 그런 다음 «이전»을 선택하여 기존 계정을 새 동기화 형식으로 옮기세요.',
    '이전', '서로 다른 계정 버전 발견',
    '기기마다 계정 버전이 다릅니다. 하나를 선택하기 전에 모든 버전을 내보내세요. 여러 버전의 변경 사항을 유지하려면 내보내기와 가져오기로 직접 병합하세요.',
    '동기화 대기 중',
    '일부 계정 데이터가 아직 도착하지 않았습니다. 동기화를 기다린 후 새로고침하세요. 기존 데이터는 보존되며 빈 계정 목록이 생성되지 않습니다.',
    '모든 버전 내보내기', '이 버전을 가져오기용으로 내보내기', '복구 파일에 암호화되지 않은 계정 키가 포함될 수 있습니다. 공유하지 말고 안전하게 보관하세요.',
    '이 버전 사용', '비밀번호로 보호됨', '암호화되지 않음', '이 버전의 비밀번호', '새로고침', '처리 중…', '완료',
  ]),
  'hi-IN': row([
    'खाता सिंक अपग्रेड करें',
    'पहले सभी डिवाइस पर एक्सटेंशन अपडेट करें और रिकवरी कॉपी एक्सपोर्ट करें। फिर अपने मौजूदा खातों को नए सिंक प्रारूप में ले जाने के लिए «माइग्रेट करें» चुनें।',
    'माइग्रेट करें', 'खातों के अलग-अलग संस्करण मिले',
    'आपके डिवाइस पर खातों के अलग-अलग संस्करण हैं। किसी एक को चुनने से पहले सभी संस्करण एक्सपोर्ट करें। कई संस्करणों के बदलाव रखने के लिए एक्सपोर्ट और इंपोर्ट करके उन्हें स्वयं मिलाएँ।',
    'सिंक का इंतज़ार है',
    'कुछ खाता डेटा अभी नहीं आया है। सिंक होने का इंतज़ार करें, फिर दोबारा लोड करें। मौजूदा डेटा सुरक्षित रहेगा; खाली खाता सूची नहीं बनाई जाएगी।',
    'सभी संस्करण एक्सपोर्ट करें', 'इंपोर्ट के लिए यह संस्करण एक्सपोर्ट करें', 'रिकवरी फ़ाइल में खातों की बिना एन्क्रिप्शन वाली कुंजियाँ हो सकती हैं। इसे साझा न करें और सुरक्षित रखें।',
    'यह संस्करण इस्तेमाल करें', 'पासवर्ड से सुरक्षित', 'बिना एन्क्रिप्शन', 'इस संस्करण का पासवर्ड', 'दोबारा लोड करें', 'प्रक्रिया जारी है…', 'पूरा हुआ',
  ]),
}

export function syncRecoveryStrings(locale: Language): SyncRecoveryStrings {
  return messages[locale] ?? en
}
