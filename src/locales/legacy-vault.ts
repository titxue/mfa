// Legacy storage has deliberately narrower OTP and recovery guarantees than V2.
const en = {
  protectionMismatch: "The current vault is encrypted, but some local recovery copies are still plain text. Choose the encrypted current version and enter its password to protect the history, or export copies first. Other encrypted versions may require different passwords.",
  notice: 'Old format: SHA1 / 6 digits / 30 seconds, plus Steam. Simultaneous device writes can overwrite each other. Recovery copies exist only on this device.',
  interruption: "A protection change may be partially completed even if it reports failure. Enabling or changing protection may require the previous or replacement password; disabling it may already leave plain-text recovery copies. Chrome Sync has no atomic compare-and-set: concurrent writes can still overwrite data.",
  legacyUnsupported: "The old format cannot save these OTP parameters. No data was changed. Keep the algorithm, digits and period required by your service; do not change them to fit the old format.",
  legacyHistoryMigration: 'V2 migration is blocked while old-format recovery history exists. Export the history first; exporting alone does not unblock migration.',
}
type LegacyStrings = { [K in keyof typeof en]: string }
const messages: Record<string, LegacyStrings> = {
  'en-US': en,
  'zh-CN': {
    protectionMismatch: "当前账户库已加密，但部分本地恢复副本仍是明文。请选择已加密的当前版本并输入其密码来保护历史，或先导出副本。其他加密版本可能需要不同的密码。",
    notice: '旧格式：支持 SHA1 / 6 位 / 30 秒及 Steam。多设备同时写入可能互相覆盖。恢复副本仅保存在本设备。',
    interruption: "保护设置变更即使报告失败，也可能已部分完成。开启保护或修改密码后，可能需要原密码或新密码；关闭保护时，恢复副本可能已变为明文。Chrome 同步不支持原子的比较并写入，同时写入仍可能覆盖数据。",
    legacyUnsupported: "旧格式不支持这些验证码参数，未更改数据。请保留服务要求的算法、位数与周期，不要为兼容旧格式而修改。",
    legacyHistoryMigration: '存在旧格式恢复历史时，无法迁移到 V2。请先导出历史；仅导出不会解除迁移限制。',
  },
  'zh-TW': {
    protectionMismatch: "目前帳戶庫已加密，但部分本機復原副本仍是明文。請選擇已加密的目前版本並輸入其密碼以保護歷史，或先匯出副本。其他加密版本可能需要不同的密碼。",
    notice: '舊格式：支援 SHA1 / 6 位 / 30 秒及 Steam。多裝置同時寫入可能互相覆蓋。復原副本僅儲存在本裝置。',
    interruption: "保護設定變更即使回報失敗，也可能已部分完成。啟用保護或修改密碼後，可能需要原密碼或新密碼；關閉保護時，復原副本可能已變為明文。Chrome 同步不支援原子的比較並寫入，同時寫入仍可能覆蓋資料。",
    legacyUnsupported: "舊格式不支援這些驗證碼參數，未變更資料。請保留服務要求的演算法、位數與週期，不要為相容舊格式而修改。",
    legacyHistoryMigration: '存在舊格式復原歷史時，無法遷移至 V2。請先匯出歷史；僅匯出不會解除遷移限制。',
  },
  'es-ES': {
    protectionMismatch: "La bóveda actual está cifrada, pero algunas copias locales de recuperación siguen en texto plano. Elige la versión actual cifrada e introduce su contraseña para proteger el historial, o exporta las copias primero. Otras versiones cifradas pueden requerir contraseñas distintas.",
    notice: 'Formato antiguo: SHA1 / 6 dígitos / 30 segundos y Steam. Las escrituras simultáneas entre dispositivos pueden sobrescribirse. Las copias de recuperación solo existen en este dispositivo.',
    interruption: "Un cambio de protección puede completarse parcialmente aunque indique un fallo. Activarla o cambiarla puede requerir la contraseña anterior o la nueva; al desactivarla, ya puede haber copias de recuperación en texto plano. Chrome Sync no permite comparar y escribir de forma atómica: las escrituras simultáneas pueden sobrescribir datos.",
    legacyUnsupported: "El formato antiguo no puede guardar estos parámetros OTP. No se modificó ningún dato. Conserva el algoritmo, los dígitos y el período que exige tu servicio; no los cambies para adaptarlos al formato antiguo.",
    legacyHistoryMigration: 'La migración a V2 está bloqueada mientras exista historial de recuperación del formato antiguo. Expórtalo primero; exportarlo no desbloquea la migración por sí solo.',
  },
  'fr-FR': {
    protectionMismatch: "Le coffre actuel est chiffré, mais certaines copies locales de récupération sont encore en clair. Choisissez la version actuelle chiffrée et saisissez son mot de passe pour protéger l’historique, ou exportez d’abord les copies. D’autres versions chiffrées peuvent nécessiter des mots de passe différents.",
    notice: 'Ancien format : SHA1 / 6 chiffres / 30 secondes et Steam. Les écritures simultanées sur plusieurs appareils peuvent s’écraser. Les copies de récupération restent uniquement sur cet appareil.',
    interruption: "Une modification de protection peut être partiellement effectuée même si un échec est signalé. Son activation ou sa modification peut nécessiter l’ancien ou le nouveau mot de passe ; sa désactivation peut déjà laisser des copies de récupération en clair. Chrome Sync ne permet pas de comparaison-écriture atomique : les écritures simultanées peuvent écraser les données.",
    legacyUnsupported: "L’ancien format ne peut pas enregistrer ces paramètres OTP. Aucune donnée n’a été modifiée. Conservez l’algorithme, le nombre de chiffres et la période exigés par votre service ; ne les modifiez pas pour les adapter à l’ancien format.",
    legacyHistoryMigration: 'La migration vers V2 est bloquée tant qu’un historique de récupération de l’ancien format existe. Exportez-le d’abord ; cet export seul ne débloque pas la migration.',
  },
  'pt-BR': {
    protectionMismatch: "O cofre atual está criptografado, mas algumas cópias locais de recuperação ainda estão em texto simples. Escolha a versão atual criptografada e digite a senha dela para proteger o histórico, ou exporte as cópias primeiro. Outras versões criptografadas podem exigir senhas diferentes.",
    notice: 'Formato antigo: SHA1 / 6 dígitos / 30 segundos e Steam. Gravações simultâneas em dispositivos podem sobrescrever umas às outras. As cópias de recuperação existem apenas neste dispositivo.',
    interruption: "Uma alteração de proteção pode ser concluída parcialmente mesmo se indicar falha. Ativar ou alterar a proteção pode exigir a senha anterior ou a nova; desativá-la já pode deixar cópias de recuperação em texto simples. O Chrome Sync não oferece comparação e gravação atômicas: gravações simultâneas ainda podem sobrescrever dados.",
    legacyUnsupported: "O formato antigo não pode salvar estes parâmetros OTP. Nenhum dado foi alterado. Mantenha o algoritmo, a quantidade de dígitos e o período exigidos pelo serviço; não os altere para adaptar ao formato antigo.",
    legacyHistoryMigration: 'A migração para V2 fica bloqueada enquanto existir histórico de recuperação do formato antigo. Exporte o histórico primeiro; apenas exportar não desbloqueia a migração.',
  },
  'de-DE': {
    protectionMismatch: "Der aktuelle Tresor ist verschlüsselt, einige lokale Wiederherstellungskopien sind aber noch im Klartext. Wähle die verschlüsselte aktuelle Version und gib ihr Passwort ein, um den Verlauf zu schützen, oder exportiere zuerst die Kopien. Andere verschlüsselte Versionen können andere Passwörter benötigen.",
    notice: 'Altes Format: SHA1 / 6 Stellen / 30 Sekunden sowie Steam. Gleichzeitige Schreibvorgänge auf mehreren Geräten können sich überschreiben. Wiederherstellungskopien liegen nur auf diesem Gerät.',
    interruption: "Eine Schutzänderung kann trotz Fehlermeldung teilweise abgeschlossen sein. Beim Aktivieren oder Ändern kann das bisherige oder neue Passwort nötig sein; beim Deaktivieren können Wiederherstellungskopien bereits im Klartext vorliegen. Chrome Sync bietet kein atomares Vergleichen und Schreiben: gleichzeitige Schreibvorgänge können weiterhin Daten überschreiben.",
    legacyUnsupported: "Das alte Format kann diese OTP-Parameter nicht speichern. Es wurden keine Daten geändert. Behalte den vom Dienst geforderten Algorithmus, die Stellenzahl und das Zeitintervall bei; ändere sie nicht zur Anpassung an das alte Format.",
    legacyHistoryMigration: 'Die V2-Migration ist blockiert, solange ein Wiederherstellungsverlauf im alten Format vorliegt. Exportiere ihn zuerst; der Export allein hebt die Sperre nicht auf.',
  },
  'ru-RU': {
    protectionMismatch: "Текущее хранилище зашифровано, но некоторые локальные копии для восстановления всё ещё хранятся открытым текстом. Выберите текущую зашифрованную версию и введите её пароль, чтобы защитить историю, или сначала экспортируйте копии. Для других зашифрованных версий могут понадобиться другие пароли.",
    notice: 'Старый формат: SHA1 / 6 цифр / 30 секунд и Steam. Одновременная запись с разных устройств может перезаписывать данные. Копии для восстановления хранятся только на этом устройстве.',
    interruption: "Изменение защиты может быть частично выполнено даже при сообщении об ошибке. При включении или изменении может понадобиться прежний или новый пароль; при отключении копии для восстановления уже могут быть открытым текстом. Chrome Sync не поддерживает атомарное сравнение и запись: одновременная запись всё ещё может перезаписать данные.",
    legacyUnsupported: "Старый формат не может сохранить эти параметры OTP. Данные не изменены. Сохраните алгоритм, число цифр и период, требуемые вашим сервисом; не меняйте их ради совместимости со старым форматом.",
    legacyHistoryMigration: 'Переход на V2 заблокирован, пока существует история восстановления старого формата. Сначала экспортируйте историю; сам экспорт не снимает блокировку.',
  },
  'ar-SA': {
    protectionMismatch: "الخزنة الحالية مشفرة، لكن بعض نسخ الاسترداد المحلية لا تزال نصًا عاديًا. اختر الإصدار الحالي المشفر وأدخل كلمة مروره لحماية السجل، أو صدّر النسخ أولًا. قد تتطلب الإصدارات المشفرة الأخرى كلمات مرور مختلفة.",
    notice: 'التنسيق القديم: SHA1 / 6 أرقام / 30 ثانية، بالإضافة إلى Steam. قد تستبدل عمليات الكتابة المتزامنة بين الأجهزة بعضها. توجد نسخ الاسترداد على هذا الجهاز فقط.',
    interruption: "قد يكتمل تغيير الحماية جزئيًا حتى لو أبلغ عن فشل. قد يتطلب تفعيلها أو تغييرها كلمة المرور السابقة أو الجديدة؛ وقد يؤدي تعطيلها بالفعل إلى وجود نسخ استرداد بنص عادي. لا يدعم Chrome Sync المقارنة والكتابة كعملية ذرية واحدة: قد تستبدل الكتابات المتزامنة البيانات.",
    legacyUnsupported: "لا يمكن للتنسيق القديم حفظ معلمات OTP هذه. لم تتغير أي بيانات. احتفظ بالخوارزمية وعدد الأرقام والفترة الزمنية التي تتطلبها خدمتك؛ لا تغيّرها لتناسب التنسيق القديم.",
    legacyHistoryMigration: 'الانتقال إلى V2 محظور ما دام سجل استرداد التنسيق القديم موجودًا. صدّر السجل أولًا؛ التصدير وحده لا يرفع الحظر.',
  },
  'ja-JP': {
    protectionMismatch: "現在の保管庫は暗号化されていますが、一部のローカル復元用コピーは平文のままです。暗号化された現在のバージョンを選び、そのパスワードを入力して履歴を保護するか、先にコピーをエクスポートしてください。他の暗号化バージョンには別のパスワードが必要な場合があります。",
    notice: '旧形式：SHA1 / 6 桁 / 30 秒、および Steam に対応。複数端末からの同時書き込みは互いに上書きされる可能性があります。復元用コピーはこの端末にのみ保存されます。',
    interruption: "保護設定の変更は、失敗と表示されても一部完了している場合があります。有効化や変更では以前または新しいパスワードが必要になることがあり、無効化では復元用コピーがすでに平文になっている場合があります。Chrome Sync はアトミックな比較・書き込みに非対応のため、同時書き込みでデータが上書きされる可能性があります。",
    legacyUnsupported: "旧形式ではこれらの OTP パラメーターを保存できません。データは変更されていません。サービスが指定するアルゴリズム・桁数・周期を維持し、旧形式に合わせて変更しないでください。",
    legacyHistoryMigration: '旧形式の復元履歴がある間は V2 に移行できません。まず履歴をエクスポートしてください。エクスポートだけでは移行制限は解除されません。',
  },
  'ko-KR': {
    protectionMismatch: "현재 보관함은 암호화되어 있지만 일부 로컬 복구 사본은 아직 평문입니다. 암호화된 현재 버전을 선택하고 해당 비밀번호를 입력하여 기록을 보호하거나 먼저 사본을 내보내세요. 다른 암호화 버전에는 다른 비밀번호가 필요할 수 있습니다.",
    notice: '이전 형식: SHA1 / 6자리 / 30초 및 Steam을 지원합니다. 여러 기기에서 동시에 쓰면 서로 덮어쓸 수 있습니다. 복구 사본은 이 기기에만 있습니다.',
    interruption: "보호 설정 변경은 실패로 표시되어도 일부 완료되었을 수 있습니다. 활성화하거나 변경하면 이전 또는 새 비밀번호가 필요할 수 있고, 비활성화하면 복구 사본이 이미 평문일 수 있습니다. Chrome Sync는 원자적 비교 및 쓰기를 지원하지 않아 동시 쓰기가 데이터를 덮어쓸 수 있습니다.",
    legacyUnsupported: "이전 형식에는 이 OTP 매개변수를 저장할 수 없습니다. 데이터는 변경되지 않았습니다. 서비스에서 요구하는 알고리즘, 자릿수, 주기를 유지하고 이전 형식에 맞추려고 변경하지 마세요.",
    legacyHistoryMigration: '이전 형식의 복구 기록이 있으면 V2로 이전할 수 없습니다. 먼저 기록을 내보내세요. 내보내기만으로 이전 제한이 해제되지는 않습니다.',
  },
  'hi-IN': {
    protectionMismatch: "वर्तमान वॉल्ट एन्क्रिप्टेड है, लेकिन कुछ स्थानीय पुनर्प्राप्ति प्रतियाँ अभी भी सादे पाठ में हैं। इतिहास सुरक्षित करने के लिए वर्तमान एन्क्रिप्टेड संस्करण चुनकर उसका पासवर्ड डालें, या पहले प्रतियाँ निर्यात करें। अन्य एन्क्रिप्टेड संस्करणों के लिए अलग पासवर्ड लग सकते हैं।",
    notice: 'पुराना प्रारूप: SHA1 / 6 अंक / 30 सेकंड और Steam। अलग-अलग डिवाइस से एक साथ लिखने पर डेटा एक-दूसरे को अधिलेखित कर सकता है। पुनर्प्राप्ति प्रतियाँ केवल इस डिवाइस पर हैं।',
    interruption: "विफलता दिखने पर भी सुरक्षा में बदलाव आंशिक रूप से पूरा हो सकता है। सुरक्षा चालू करने या बदलने पर पुराना या नया पासवर्ड लग सकता है; बंद करने पर पुनर्प्राप्ति प्रतियाँ पहले ही सादे पाठ में हो सकती हैं। Chrome Sync में तुलना और लेखन की एकल परमाणु क्रिया नहीं है: एक साथ लेखन अब भी डेटा अधिलेखित कर सकता है।",
    legacyUnsupported: "पुराना प्रारूप ये OTP पैरामीटर सहेज नहीं सकता। कोई डेटा नहीं बदला गया। अपनी सेवा के लिए आवश्यक एल्गोरिदम, अंकों की संख्या और अवधि बनाए रखें; पुराने प्रारूप के अनुकूल बनाने के लिए इन्हें न बदलें।",
    legacyHistoryMigration: 'पुराने प्रारूप का पुनर्प्राप्ति इतिहास मौजूद होने तक V2 में स्थानांतरण बंद है। पहले इतिहास निर्यात करें; केवल निर्यात करने से यह रोक नहीं हटती।',
  },
}
export const legacyStrings = (locale: string): LegacyStrings => messages[locale] ?? en
