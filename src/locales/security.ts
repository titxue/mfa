// Shared by popup and content-script; no account or storage dependencies.
const en = {
  title: 'Password protection', enable: 'Enable password', change: 'Change password', disable: 'Disable protection',
  lock: 'Lock now', unlock: 'Unlock', password: 'Current password', nextPassword: 'New password (at least 8 characters)',
  confirm: 'Confirm password', save: 'Save', cancel: 'Cancel', retry: 'Reload', loading: 'Loading…',
  lockedHint: 'Open the extension and enter your password to unlock.',
  syncHint: 'Accounts sync with your Chrome account when Chrome extension sync is enabled. Without password protection, secrets sync as plain text.',
  warning: 'A forgotten password cannot be recovered. All your devices need the updated extension. Existing plain-text backups and offline copies are not erased.',
  encrypted: 'Encrypted backup', plain: 'Plain-text backup', backupPassword: 'Backup password (encrypted files only)',
  plainWarning: 'This file exposes account secrets. Enter your current password to export.',
  passwordError: 'Incorrect password or damaged encrypted data.', passwordLength: 'Use at least 8 characters.',
  mismatch: 'Passwords do not match.', conflict: 'Accounts changed on another device. Reload before trying again.',
  invalid: 'Unsupported or damaged account data. The original data has been preserved.',
  quota: 'Chrome sync storage is full. No accounts were truncated.', storageError: 'Could not save or load data. Reload and try again.',
  locked: 'Locked. Unlock the extension first.', denied: 'Access denied.', done: 'Saved',
}
type Strings = { [K in keyof typeof en]: string }
const keys = Object.keys(en) as (keyof Strings)[]
const row = (values: string[]): Strings => {
  if (values.length !== keys.length) throw new Error('Invalid security translation')
  return Object.fromEntries(keys.map((key, i) => [key, values[i]])) as Strings
}
const messages: Record<string, Strings> = {
  'en-US': en,
  'zh-CN': row([
    '密码保护','开启密码','修改密码','关闭保护','立即锁定','解锁','当前密码','新密码（至少 8 位）','确认密码','保存','取消','重新加载','正在加载…',
    '请打开扩展，输入密码解锁。','账户随 Chrome 账号同步，需开启 Chrome 扩展数据同步。未开启密码保护时，密钥以明文同步。',
    '忘记密码将无法恢复。其他设备需要更新扩展。已有明文备份及离线副本不会被清除。','加密备份','明文备份','备份密码（仅加密文件需要）',
    '此文件会暴露账户密钥。请验证当前密码后导出。','密码错误或加密数据已损坏。','密码至少需要 8 位。','两次输入的密码不一致。',
    '账户已在其他设备更改，请重新加载后重试。','账户数据格式不支持或已损坏，原数据已保留。','Chrome 同步容量不足，未截断任何账户。',
    '无法保存或读取数据，请重新加载后重试。','已锁定，请先解锁扩展。','无权访问。','已保存',
  ]),
  'zh-TW': row([
    '密碼保護','啟用密碼','修改密碼','關閉保護','立即鎖定','解鎖','目前密碼','新密碼（至少 8 位）','確認密碼','儲存','取消','重新載入','正在載入…',
    '請開啟擴充功能，輸入密碼解鎖。','帳戶隨 Chrome 帳號同步，需啟用 Chrome 擴充功能資料同步。未啟用密碼保護時，金鑰以明文同步。',
    '忘記密碼將無法復原。其他裝置需要更新擴充功能。既有明文備份及離線副本不會被清除。','加密備份','明文備份','備份密碼（僅加密檔案需要）',
    '此檔案會暴露帳戶金鑰。請驗證目前密碼後匯出。','密碼錯誤或加密資料已損壞。','密碼至少需要 8 位。','兩次輸入的密碼不一致。',
    '帳戶已在其他裝置變更，請重新載入後重試。','帳戶資料格式不支援或已損壞，原資料已保留。','Chrome 同步容量不足，未截斷任何帳戶。',
    '無法儲存或讀取資料，請重新載入後重試。','已鎖定，請先解鎖擴充功能。','無權存取。','已儲存',
  ]),
  'es-ES': row([
    'Protección con contraseña','Activar contraseña','Cambiar contraseña','Desactivar protección','Bloquear ahora','Desbloquear','Contraseña actual','Nueva contraseña (mínimo 8 caracteres)','Confirmar contraseña','Guardar','Cancelar','Recargar','Cargando…',
    'Abre la extensión e introduce tu contraseña para desbloquear.','Las cuentas se sincronizan con Chrome si la sincronización de extensiones está activada. Sin protección, las claves se sincronizan en texto plano.',
    'Una contraseña olvidada no se puede recuperar. Actualiza la extensión en todos los dispositivos. Las copias sin cifrar y sin conexión no se borran.','Copia cifrada','Copia en texto plano','Contraseña de la copia (solo archivos cifrados)',
    'Este archivo expone las claves. Verifica tu contraseña para exportar.','Contraseña incorrecta o datos cifrados dañados.','Usa al menos 8 caracteres.','Las contraseñas no coinciden.',
    'Las cuentas cambiaron en otro dispositivo. Recarga y vuelve a intentarlo.','Datos dañados o formato no compatible. Se conservaron los datos originales.','Almacenamiento de sincronización lleno. No se truncaron cuentas.',
    'No se pudieron guardar o cargar los datos. Recarga y vuelve a intentarlo.','Bloqueado. Desbloquea la extensión.','Acceso denegado.','Guardado',
  ]),
  'fr-FR': row([
    'Protection par mot de passe','Activer le mot de passe','Modifier le mot de passe','Désactiver la protection','Verrouiller','Déverrouiller','Mot de passe actuel','Nouveau mot de passe (8 caractères minimum)','Confirmer le mot de passe','Enregistrer','Annuler','Recharger','Chargement…',
    'Ouvrez l’extension et saisissez votre mot de passe pour déverrouiller.','Les comptes sont synchronisés via Chrome si la synchronisation des extensions est activée. Sans protection, les secrets sont synchronisés en clair.',
    'Un mot de passe oublié est irrécupérable. Mettez à jour l’extension sur chaque appareil. Les sauvegardes en clair et copies hors ligne ne sont pas effacées.','Sauvegarde chiffrée','Sauvegarde en clair','Mot de passe de sauvegarde (fichiers chiffrés uniquement)',
    'Ce fichier expose les secrets des comptes. Vérifiez votre mot de passe pour exporter.','Mot de passe incorrect ou données chiffrées endommagées.','Utilisez au moins 8 caractères.','Les mots de passe ne correspondent pas.',
    'Les comptes ont changé sur un autre appareil. Rechargez avant de réessayer.','Format non pris en charge ou données endommagées. Les données originales sont conservées.','Stockage de synchronisation plein. Aucun compte tronqué.',
    'Impossible d’enregistrer ou de charger les données. Rechargez et réessayez.','Verrouillé. Déverrouillez l’extension.','Accès refusé.','Enregistré',
  ]),
  'pt-BR': row([
    'Proteção por senha','Ativar senha','Alterar senha','Desativar proteção','Bloquear agora','Desbloquear','Senha atual','Nova senha (mínimo de 8 caracteres)','Confirmar senha','Salvar','Cancelar','Recarregar','Carregando…',
    'Abra a extensão e digite sua senha para desbloquear.','As contas sincronizam pelo Chrome quando a sincronização de extensões está ativa. Sem proteção, os segredos sincronizam em texto simples.',
    'Uma senha esquecida não pode ser recuperada. Atualize a extensão em todos os dispositivos. Backups em texto simples e cópias offline não são apagados.','Backup criptografado','Backup em texto simples','Senha do backup (somente arquivos criptografados)',
    'Este arquivo expõe os segredos das contas. Verifique sua senha para exportar.','Senha incorreta ou dados criptografados danificados.','Use pelo menos 8 caracteres.','As senhas não coincidem.',
    'As contas mudaram em outro dispositivo. Recarregue antes de tentar novamente.','Formato incompatível ou dados danificados. Os dados originais foram preservados.','Armazenamento de sincronização cheio. Nenhuma conta foi truncada.',
    'Não foi possível salvar ou carregar. Recarregue e tente novamente.','Bloqueado. Desbloqueie a extensão.','Acesso negado.','Salvo',
  ]),
  'de-DE': row([
    'Passwortschutz','Passwort aktivieren','Passwort ändern','Schutz deaktivieren','Jetzt sperren','Entsperren','Aktuelles Passwort','Neues Passwort (mindestens 8 Zeichen)','Passwort bestätigen','Speichern','Abbrechen','Neu laden','Wird geladen…',
    'Öffne die Erweiterung und gib dein Passwort zum Entsperren ein.','Konten werden über Chrome synchronisiert, wenn die Erweiterungssynchronisierung aktiv ist. Ohne Passwortschutz werden Schlüssel im Klartext synchronisiert.',
    'Ein vergessenes Passwort kann nicht wiederhergestellt werden. Aktualisiere die Erweiterung auf allen Geräten. Klartext-Backups und Offline-Kopien werden nicht gelöscht.','Verschlüsseltes Backup','Klartext-Backup','Backup-Passwort (nur verschlüsselte Dateien)',
    'Diese Datei legt Kontoschlüssel offen. Bestätige dein Passwort zum Exportieren.','Falsches Passwort oder beschädigte verschlüsselte Daten.','Verwende mindestens 8 Zeichen.','Die Passwörter stimmen nicht überein.',
    'Konten wurden auf einem anderen Gerät geändert. Lade sie erneut.','Nicht unterstützte oder beschädigte Daten. Die Originaldaten bleiben erhalten.','Synchronisierungsspeicher voll. Keine Konten wurden gekürzt.',
    'Daten konnten nicht gespeichert oder geladen werden. Lade erneut und versuche es noch einmal.','Gesperrt. Entsperre zuerst die Erweiterung.','Zugriff verweigert.','Gespeichert',
  ]),
  'ru-RU': row([
    'Защита паролем','Включить пароль','Изменить пароль','Отключить защиту','Заблокировать','Разблокировать','Текущий пароль','Новый пароль (не менее 8 символов)','Подтвердите пароль','Сохранить','Отмена','Перезагрузить','Загрузка…',
    'Откройте расширение и введите пароль для разблокировки.','Аккаунты синхронизируются через Chrome при включённой синхронизации расширений. Без защиты ключи синхронизируются открытым текстом.',
    'Забытый пароль нельзя восстановить. Обновите расширение на всех устройствах. Открытые резервные копии и автономные копии не удаляются.','Зашифрованная копия','Копия открытым текстом','Пароль копии (только для зашифрованных файлов)',
    'Этот файл раскрывает ключи аккаунтов. Подтвердите пароль для экспорта.','Неверный пароль или повреждённые зашифрованные данные.','Используйте не менее 8 символов.','Пароли не совпадают.',
    'Аккаунты изменены на другом устройстве. Перезагрузите данные.','Неподдерживаемые или повреждённые данные. Исходные данные сохранены.','Хранилище синхронизации заполнено. Аккаунты не усечены.',
    'Не удалось сохранить или загрузить данные. Перезагрузите и повторите.','Заблокировано. Сначала разблокируйте расширение.','Доступ запрещён.','Сохранено',
  ]),
  'ar-SA': row([
    'الحماية بكلمة مرور','تفعيل كلمة المرور','تغيير كلمة المرور','تعطيل الحماية','قفل الآن','فتح القفل','كلمة المرور الحالية','كلمة مرور جديدة (8 أحرف على الأقل)','تأكيد كلمة المرور','حفظ','إلغاء','إعادة التحميل','جارٍ التحميل…',
    'افتح الإضافة وأدخل كلمة المرور لفتح القفل.','تتم مزامنة الحسابات عبر Chrome عند تفعيل مزامنة الإضافات. بدون الحماية تتم مزامنة المفاتيح كنص عادي.',
    'لا يمكن استعادة كلمة المرور المنسية. حدّث الإضافة على جميع الأجهزة. لا تُحذف النسخ غير المشفرة أو النسخ غير المتصلة.','نسخة احتياطية مشفرة','نسخة احتياطية نصية','كلمة مرور النسخة (للملفات المشفرة فقط)',
    'يكشف هذا الملف مفاتيح الحسابات. تحقق من كلمة المرور للتصدير.','كلمة المرور غير صحيحة أو البيانات المشفرة تالفة.','استخدم 8 أحرف على الأقل.','كلمتا المرور غير متطابقتين.',
    'تغيرت الحسابات على جهاز آخر. أعد التحميل قبل المحاولة.','بيانات غير مدعومة أو تالفة. تم الاحتفاظ بالبيانات الأصلية.','مساحة المزامنة ممتلئة. لم يتم اقتطاع أي حساب.',
    'تعذر حفظ البيانات أو تحميلها. أعد التحميل وحاول مجددًا.','مقفل. افتح قفل الإضافة أولًا.','تم رفض الوصول.','تم الحفظ',
  ]),
  'ja-JP': row([
    'パスワード保護','パスワードを有効化','パスワードを変更','保護を無効化','今すぐロック','ロック解除','現在のパスワード','新しいパスワード（8文字以上）','パスワードを確認','保存','キャンセル','再読み込み','読み込み中…',
    '拡張機能を開き、パスワードを入力して解除してください。','Chrome の拡張機能同期が有効な場合、アカウントを同期します。保護が無効の場合、秘密鍵は平文で同期されます。',
    '忘れたパスワードは復元できません。すべての端末で拡張機能を更新してください。既存の平文バックアップとオフラインコピーは削除されません。','暗号化バックアップ','平文バックアップ','バックアップのパスワード（暗号化ファイルのみ）',
    'このファイルには秘密鍵が含まれます。現在のパスワードを確認してエクスポートします。','パスワードが違うか、暗号化データが破損しています。','8文字以上にしてください。','パスワードが一致しません。',
    '別の端末でアカウントが変更されました。再読み込みしてください。','未対応または破損したデータです。元のデータは保持されています。','同期ストレージがいっぱいです。アカウントは切り捨てられていません。',
    '保存または読み込みに失敗しました。再読み込みして再試行してください。','ロック中です。先に解除してください。','アクセスが拒否されました。','保存しました',
  ]),
  'ko-KR': row([
    '비밀번호 보호','비밀번호 활성화','비밀번호 변경','보호 비활성화','지금 잠금','잠금 해제','현재 비밀번호','새 비밀번호 (8자 이상)','비밀번호 확인','저장','취소','새로고침','불러오는 중…',
    '확장 프로그램을 열고 비밀번호를 입력하여 잠금을 해제하세요.','Chrome 확장 프로그램 동기화가 켜져 있으면 계정이 동기화됩니다. 보호가 꺼져 있으면 비밀 키가 평문으로 동기화됩니다.',
    '잊어버린 비밀번호는 복구할 수 없습니다. 모든 기기에서 확장 프로그램을 업데이트하세요. 기존 평문 백업과 오프라인 사본은 삭제되지 않습니다.','암호화 백업','평문 백업','백업 비밀번호 (암호화 파일만)',
    '이 파일은 계정의 비밀 키를 노출합니다. 현재 비밀번호를 확인하여 내보내세요.','비밀번호가 틀리거나 암호화된 데이터가 손상되었습니다.','8자 이상을 사용하세요.','비밀번호가 일치하지 않습니다.',
    '다른 기기에서 계정이 변경되었습니다. 새로고침 후 다시 시도하세요.','지원하지 않거나 손상된 데이터입니다. 원본은 보존되었습니다.','동기화 저장소가 가득 찼습니다. 계정은 잘리지 않았습니다.',
    '저장하거나 불러올 수 없습니다. 새로고침 후 다시 시도하세요.','잠겨 있습니다. 먼저 잠금을 해제하세요.','접근이 거부되었습니다.','저장됨',
  ]),
  'hi-IN': row([
    'पासवर्ड सुरक्षा','पासवर्ड चालू करें','पासवर्ड बदलें','सुरक्षा बंद करें','अभी लॉक करें','अनलॉक करें','वर्तमान पासवर्ड','नया पासवर्ड (कम से कम 8 अक्षर)','पासवर्ड की पुष्टि करें','सहेजें','रद्द करें','फिर लोड करें','लोड हो रहा है…',
    'एक्सटेंशन खोलें और अनलॉक करने के लिए पासवर्ड डालें।','Chrome एक्सटेंशन सिंक चालू होने पर खाते सिंक होते हैं। सुरक्षा बंद होने पर गुप्त कुंजियाँ सादे पाठ में सिंक होती हैं।',
    'भूला हुआ पासवर्ड वापस नहीं मिल सकता। सभी उपकरणों पर एक्सटेंशन अपडेट करें। पुराने सादे बैकअप और ऑफलाइन प्रतियाँ मिटाई नहीं जातीं।','एन्क्रिप्टेड बैकअप','सादे पाठ का बैकअप','बैकअप पासवर्ड (केवल एन्क्रिप्टेड फ़ाइलें)',
    'यह फ़ाइल खाते की गुप्त कुंजियाँ उजागर करती है। निर्यात के लिए वर्तमान पासवर्ड सत्यापित करें।','गलत पासवर्ड या एन्क्रिप्टेड डेटा खराब है।','कम से कम 8 अक्षर इस्तेमाल करें।','पासवर्ड मेल नहीं खाते।',
    'खाते दूसरे उपकरण पर बदल गए हैं। फिर से लोड करके प्रयास करें।','असमर्थित या खराब डेटा। मूल डेटा सुरक्षित रखा गया है।','सिंक संग्रहण भर गया है। किसी खाते को काटा नहीं गया।',
    'डेटा सहेज या लोड नहीं कर सके। फिर से लोड करके प्रयास करें।','लॉक है। पहले एक्सटेंशन अनलॉक करें।','पहुँच अस्वीकृत।','सहेजा गया',
  ]),
}
export const securityStrings = (locale: string): Strings => messages[locale] ?? en
export const securityError = (locale: string, error: unknown): string => {
  const strings = securityStrings(locale)
  const key = error instanceof Error ? error.message : String(error)
  return strings[key as keyof Strings] ?? strings.storageError
}

// Compact settings entry and progressive disclosure in the password dialog.
const settingsMessages: Record<string, [string, string, string, string, string, string, string, string]> = {
  'zh-CN': ['安全', '未开启', '已开启 · 账户已加密', '设置密码，加密保存和同步你的账户。', '你的账户已加密保护。浏览器重启后，需要输入密码解锁。', '关闭后，你的账户将恢复明文保存和同步。请输入当前密码确认。', '请牢记密码，忘记后无法恢复加密账户。', '同步与安全说明'],
  'zh-TW': ['安全', '未啟用', '已啟用 · 帳戶已加密', '設定密碼，加密儲存及同步你的帳戶。', '你的帳戶已加密保護。瀏覽器重新啟動後，需要輸入密碼解鎖。', '關閉後，帳戶將恢復明文儲存及同步。請輸入目前密碼確認。', '請牢記密碼，忘記後無法復原加密帳戶。', '同步與安全說明'],
  'en-US': ['Security', 'Not enabled', 'Enabled · Accounts encrypted', 'Set a password to encrypt your saved and synced accounts.', 'Your accounts are encrypted. Enter your password after restarting the browser to unlock them.', 'Disabling protection saves and syncs your accounts as plain text. Enter your current password to confirm.', 'Keep your password safe. Encrypted accounts cannot be recovered without it.', 'Sync and security details'],
  'es-ES': ['Seguridad', 'Sin activar', 'Activado · Cuentas cifradas', 'Configura una contraseña para cifrar tus cuentas guardadas y sincronizadas.', 'Tus cuentas están cifradas. Introduce tu contraseña tras reiniciar el navegador para desbloquearlas.', 'Al desactivar la protección, las cuentas se guardan y sincronizan en texto plano. Confirma con tu contraseña actual.', 'Guarda tu contraseña. Sin ella no se pueden recuperar las cuentas cifradas.', 'Sincronización y seguridad'],
  'fr-FR': ['Sécurité', 'Désactivée', 'Activée · Comptes chiffrés', 'Définissez un mot de passe pour chiffrer vos comptes enregistrés et synchronisés.', 'Vos comptes sont chiffrés. Saisissez votre mot de passe après le redémarrage du navigateur.', 'La désactivation enregistre et synchronise vos comptes en clair. Confirmez avec votre mot de passe actuel.', 'Conservez votre mot de passe. Sans lui, les comptes chiffrés sont irrécupérables.', 'Synchronisation et sécurité'],
  'pt-BR': ['Segurança', 'Não ativada', 'Ativada · Contas criptografadas', 'Defina uma senha para criptografar suas contas salvas e sincronizadas.', 'Suas contas estão criptografadas. Digite sua senha após reiniciar o navegador para desbloqueá-las.', 'Desativar a proteção salva e sincroniza suas contas em texto simples. Confirme com sua senha atual.', 'Guarde sua senha. Sem ela, as contas criptografadas não podem ser recuperadas.', 'Sincronização e segurança'],
  'de-DE': ['Sicherheit', 'Nicht aktiviert', 'Aktiviert · Konten verschlüsselt', 'Lege ein Passwort fest, um gespeicherte und synchronisierte Konten zu verschlüsseln.', 'Deine Konten sind verschlüsselt. Gib nach einem Browserneustart dein Passwort zum Entsperren ein.', 'Ohne Schutz werden Konten im Klartext gespeichert und synchronisiert. Bestätige mit deinem aktuellen Passwort.', 'Bewahre dein Passwort sicher auf. Ohne es lassen sich verschlüsselte Konten nicht wiederherstellen.', 'Synchronisierung und Sicherheit'],
  'ru-RU': ['Безопасность', 'Не включена', 'Включена · Аккаунты зашифрованы', 'Задайте пароль для шифрования сохранённых и синхронизируемых аккаунтов.', 'Ваши аккаунты зашифрованы. Введите пароль после перезапуска браузера для разблокировки.', 'После отключения аккаунты будут сохраняться и синхронизироваться открытым текстом. Подтвердите текущим паролем.', 'Сохраните пароль. Без него зашифрованные аккаунты нельзя восстановить.', 'Синхронизация и безопасность'],
  'ar-SA': ['الأمان', 'غير مفعّلة', 'مفعّلة · الحسابات مشفرة', 'عيّن كلمة مرور لتشفير حساباتك المحفوظة والمتزامنة.', 'حساباتك مشفرة. أدخل كلمة المرور بعد إعادة تشغيل المتصفح لفتح القفل.', 'عند تعطيل الحماية تُحفظ الحسابات وتُزامن كنص عادي. أدخل كلمة المرور الحالية للتأكيد.', 'احتفظ بكلمة المرور. لا يمكن استعادة الحسابات المشفرة بدونها.', 'تفاصيل المزامنة والأمان'],
  'ja-JP': ['セキュリティ', '無効', '有効 · アカウント暗号化済み', 'パスワードを設定し、保存・同期するアカウントを暗号化します。', 'アカウントは暗号化されています。ブラウザ再起動後にパスワードを入力して解除してください。', '保護を無効にすると、アカウントは平文で保存・同期されます。現在のパスワードで確認してください。', 'パスワードを大切に保管してください。忘れると暗号化されたアカウントを復元できません。', '同期とセキュリティの詳細'],
  'ko-KR': ['보안', '비활성화', '활성화 · 계정 암호화됨', '비밀번호를 설정하여 저장 및 동기화되는 계정을 암호화하세요.', '계정이 암호화되어 있습니다. 브라우저를 다시 시작하면 비밀번호로 잠금을 해제하세요.', '보호를 끄면 계정이 평문으로 저장 및 동기화됩니다. 현재 비밀번호로 확인하세요.', '비밀번호를 잘 보관하세요. 분실하면 암호화된 계정을 복구할 수 없습니다.', '동기화 및 보안 안내'],
  'hi-IN': ['सुरक्षा', 'बंद है', 'चालू · खाते एन्क्रिप्टेड हैं', 'सहेजे और सिंक किए गए खातों को एन्क्रिप्ट करने के लिए पासवर्ड सेट करें।', 'आपके खाते एन्क्रिप्टेड हैं। ब्राउज़र दोबारा शुरू करने पर पासवर्ड से अनलॉक करें।', 'सुरक्षा बंद करने पर खाते सादे पाठ में सहेजे और सिंक होंगे। वर्तमान पासवर्ड से पुष्टि करें।', 'पासवर्ड सुरक्षित रखें। इसके बिना एन्क्रिप्टेड खाते वापस नहीं मिल सकते।', 'सिंक और सुरक्षा की जानकारी'],
}
export function securitySettingsStrings(locale: string) {
  const [section, off, on, setupHint, enabledHint, disableHint, recoveryHint, details] = settingsMessages[locale] ?? settingsMessages['en-US']
  return { section, off, on, setupHint, enabledHint, disableHint, recoveryHint, details }
}

const unlockMessages: Record<string, [string, string, string, string, string, string, string]> = {
  'zh-CN': ['解锁你的账户', '输入主密码，查看并使用验证码。', '主密码', '请输入主密码', '显示密码', '隐藏密码', '浏览器重启后，需要重新解锁。'],
  'zh-TW': ['解鎖你的帳戶', '輸入主密碼，查看並使用驗證碼。', '主密碼', '請輸入主密碼', '顯示密碼', '隱藏密碼', '瀏覽器重新啟動後，需要再次解鎖。'],
  'en-US': ['Unlock your accounts', 'Enter your master password to access your verification codes.', 'Master password', 'Enter your master password', 'Show password', 'Hide password', 'You’ll need to unlock again after restarting the browser.'],
  'es-ES': ['Desbloquea tus cuentas', 'Introduce tu contraseña maestra para acceder a los códigos.', 'Contraseña maestra', 'Introduce tu contraseña maestra', 'Mostrar contraseña', 'Ocultar contraseña', 'Deberás desbloquear de nuevo tras reiniciar el navegador.'],
  'fr-FR': ['Déverrouillez vos comptes', 'Saisissez votre mot de passe principal pour accéder aux codes.', 'Mot de passe principal', 'Saisissez votre mot de passe', 'Afficher le mot de passe', 'Masquer le mot de passe', 'Déverrouillez à nouveau après le redémarrage du navigateur.'],
  'pt-BR': ['Desbloqueie suas contas', 'Digite sua senha mestra para acessar os códigos de verificação.', 'Senha mestra', 'Digite sua senha mestra', 'Mostrar senha', 'Ocultar senha', 'Desbloqueie novamente após reiniciar o navegador.'],
  'de-DE': ['Konten entsperren', 'Gib dein Master-Passwort ein, um auf deine Codes zuzugreifen.', 'Master-Passwort', 'Master-Passwort eingeben', 'Passwort anzeigen', 'Passwort ausblenden', 'Nach einem Browserneustart ist erneutes Entsperren nötig.'],
  'ru-RU': ['Разблокируйте аккаунты', 'Введите мастер-пароль для доступа к кодам подтверждения.', 'Мастер-пароль', 'Введите мастер-пароль', 'Показать пароль', 'Скрыть пароль', 'После перезапуска браузера потребуется разблокировка.'],
  'ar-SA': ['افتح قفل حساباتك', 'أدخل كلمة المرور الرئيسية للوصول إلى رموز التحقق.', 'كلمة المرور الرئيسية', 'أدخل كلمة المرور الرئيسية', 'إظهار كلمة المرور', 'إخفاء كلمة المرور', 'يلزم فتح القفل مجددًا بعد إعادة تشغيل المتصفح.'],
  'ja-JP': ['アカウントのロック解除', 'マスターパスワードを入力して確認コードを表示します。', 'マスターパスワード', 'マスターパスワードを入力', 'パスワードを表示', 'パスワードを非表示', 'ブラウザ再起動後は、再度ロック解除が必要です。'],
  'ko-KR': ['계정 잠금 해제', '마스터 비밀번호를 입력하여 인증 코드를 확인하세요.', '마스터 비밀번호', '마스터 비밀번호 입력', '비밀번호 표시', '비밀번호 숨기기', '브라우저를 다시 시작하면 잠금을 다시 해제해야 합니다.'],
  'hi-IN': ['अपने खाते अनलॉक करें', 'सत्यापन कोड देखने के लिए मास्टर पासवर्ड डालें।', 'मास्टर पासवर्ड', 'मास्टर पासवर्ड डालें', 'पासवर्ड दिखाएँ', 'पासवर्ड छिपाएँ', 'ब्राउज़र दोबारा शुरू करने पर फिर से अनलॉक करना होगा।'],
}
export function unlockStrings(locale: string) {
  const [heading, hint, label, placeholder, show, hide, sessionHint] = unlockMessages[locale] ?? unlockMessages['en-US']
  return { heading, hint, label, placeholder, show, hide, sessionHint }
}
