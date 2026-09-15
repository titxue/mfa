import type { Language } from '@/types'
import { steamStrings } from './steam'

const en = {
  title: 'Import accounts',
  description: 'Google Authenticator export QR codes, otpauth links, TXT and JSON backups. TOTP: SHA1 · 6 digits · 30 seconds.',
  files: 'Choose files or QR images', text: 'Paste links or JSON', read: 'Read text', reset: 'Clear preview',
  summary: '{selected} of {total} accounts selected', duplicates: '{count} duplicate accounts skipped', issues: '{count} entries could not be imported',
  batch: 'Google batch {id}: {received}/{size} QR codes', incomplete: 'Add the remaining QR codes from this export before importing.',
  empty: 'Choose files, paste text or images, or drop files here.', invalid: 'Damaged or invalid account data.',
  unsupported: 'Unsupported format or OTP parameters. Only SHA1, 6-digit, 30-second TOTP is supported.',
  noQr: 'No QR code found in this image.', batchConflict: 'Conflicting Google batch data. Clear the preview and scan the same export again.',
  useImport: 'Use Add account or Import for migration and multiple accounts.', entry: 'Entry {index}',
}
type Strings = { [K in keyof typeof en]: string }
const keys = Object.keys(en) as (keyof Strings)[]
const row = (values: string[]): Strings => {
  if (values.length !== keys.length) throw new Error('Invalid import translation')
  return Object.fromEntries(keys.map((key, i) => [key, values[i]])) as Strings
}
const messages: Record<Language, Strings> = {
  'en-US': en,
  'zh-CN': row([
    '导入账户', '支持 Google Authenticator 导出二维码、otpauth 链接、TXT 和 JSON 备份。TOTP：SHA1 · 6 位 · 30 秒。',
    '选择文件或二维码图片', '粘贴链接或 JSON', '识别文本', '清空预览', '已选择 {selected} / {total} 个账户', '已跳过 {count} 个同名账户', '{count} 个条目无法导入',
    'Google 批次 {id}：已收集 {received}/{size} 张二维码', '请继续添加本次导出的剩余二维码，收齐后即可导入。', '选择文件、粘贴文本或图片，也可拖拽文件到这里。',
    '账户数据已损坏或格式无效。', '不支持此格式或验证码参数，仅支持 SHA1、6 位、30 秒的 TOTP。', '图片中未找到二维码。', 'Google 批次数据冲突，请清空预览后重新扫描同一次导出的二维码。',
    '迁移或多个账户请使用添加账户或导入入口。', '条目 {index}',
  ]),
  'zh-TW': row([
    '匯入帳戶', '支援 Google Authenticator 匯出 QR 碼、otpauth 連結、TXT 和 JSON 備份。TOTP：SHA1 · 6 位 · 30 秒。',
    '選擇檔案或 QR 碼圖片', '貼上連結或 JSON', '辨識文字', '清空預覽', '已選取 {selected} / {total} 個帳戶', '已略過 {count} 個同名帳戶', '{count} 個項目無法匯入',
    'Google 批次 {id}：已收集 {received}/{size} 張 QR 碼', '請繼續加入此次匯出的其餘 QR 碼，收齊後即可匯入。', '選擇檔案、貼上文字或圖片，或將檔案拖曳至此。',
    '帳戶資料已損壞或格式無效。', '不支援此格式或驗證碼參數，僅支援 SHA1、6 位、30 秒的 TOTP。', '圖片中找不到 QR 碼。', 'Google 批次資料衝突，請清空預覽後重新掃描同一次匯出的 QR 碼。',
    '遷移或多個帳戶請使用新增帳戶或匯入入口。', '項目 {index}',
  ]),
  'es-ES': row([
    'Importar cuentas', 'QR de exportación de Google Authenticator, enlaces otpauth, TXT y copias JSON. TOTP: SHA1 · 6 dígitos · 30 segundos.',
    'Elegir archivos o imágenes QR', 'Pegar enlaces o JSON', 'Leer texto', 'Vaciar vista previa', '{selected} de {total} cuentas seleccionadas', '{count} cuentas duplicadas omitidas', 'No se pudieron importar {count} entradas',
    'Lote de Google {id}: {received}/{size} códigos QR', 'Añade los códigos QR restantes de esta exportación antes de importar.', 'Elige archivos, pega texto o imágenes, o arrastra archivos aquí.',
    'Datos de cuenta dañados o no válidos.', 'Formato o parámetros no compatibles. Solo TOTP SHA1 de 6 dígitos y 30 segundos.', 'No se encontró un código QR en la imagen.', 'Datos de lote de Google en conflicto. Vacía la vista previa y escanea la misma exportación de nuevo.',
    'Usa Añadir cuenta o Importar para migraciones y varias cuentas.', 'Entrada {index}',
  ]),
  'fr-FR': row([
    'Importer des comptes', 'QR d’export Google Authenticator, liens otpauth, TXT et sauvegardes JSON. TOTP : SHA1 · 6 chiffres · 30 secondes.',
    'Choisir des fichiers ou images QR', 'Coller des liens ou du JSON', 'Lire le texte', 'Vider l’aperçu', '{selected} comptes sélectionnés sur {total}', '{count} comptes en double ignorés', '{count} entrées n’ont pas pu être importées',
    'Lot Google {id} : {received}/{size} codes QR', 'Ajoutez les codes QR restants de cet export avant d’importer.', 'Choisissez des fichiers, collez du texte ou des images, ou déposez des fichiers ici.',
    'Données de compte endommagées ou invalides.', 'Format ou paramètres non pris en charge. Uniquement TOTP SHA1, 6 chiffres, 30 secondes.', 'Aucun code QR trouvé dans cette image.', 'Conflit de lot Google. Videz l’aperçu et scannez à nouveau le même export.',
    'Utilisez Ajouter un compte ou Importer pour une migration ou plusieurs comptes.', 'Entrée {index}',
  ]),
  'pt-BR': row([
    'Importar contas', 'QR de exportação do Google Authenticator, links otpauth, TXT e backups JSON. TOTP: SHA1 · 6 dígitos · 30 segundos.',
    'Escolher arquivos ou imagens QR', 'Colar links ou JSON', 'Ler texto', 'Limpar prévia', '{selected} de {total} contas selecionadas', '{count} contas duplicadas ignoradas', 'Não foi possível importar {count} itens',
    'Lote Google {id}: {received}/{size} códigos QR', 'Adicione os códigos QR restantes desta exportação antes de importar.', 'Escolha arquivos, cole texto ou imagens, ou arraste arquivos aqui.',
    'Dados de conta danificados ou inválidos.', 'Formato ou parâmetros incompatíveis. Apenas TOTP SHA1, 6 dígitos e 30 segundos.', 'Nenhum código QR encontrado na imagem.', 'Conflito no lote Google. Limpe a prévia e leia a mesma exportação novamente.',
    'Use Adicionar conta ou Importar para migrações e várias contas.', 'Item {index}',
  ]),
  'de-DE': row([
    'Konten importieren', 'Google-Authenticator-Export-QR-Codes, otpauth-Links, TXT und JSON-Sicherungen. TOTP: SHA1 · 6 Ziffern · 30 Sekunden.',
    'Dateien oder QR-Bilder wählen', 'Links oder JSON einfügen', 'Text lesen', 'Vorschau leeren', '{selected} von {total} Konten ausgewählt', '{count} doppelte Konten übersprungen', '{count} Einträge konnten nicht importiert werden',
    'Google-Stapel {id}: {received}/{size} QR-Codes', 'Fügen Sie vor dem Import die restlichen QR-Codes dieses Exports hinzu.', 'Dateien wählen, Text oder Bilder einfügen oder Dateien hierher ziehen.',
    'Beschädigte oder ungültige Kontodaten.', 'Nicht unterstütztes Format oder OTP-Parameter. Nur TOTP mit SHA1, 6 Ziffern und 30 Sekunden.', 'Kein QR-Code im Bild gefunden.', 'Widersprüchliche Google-Stapeldaten. Leeren Sie die Vorschau und scannen Sie denselben Export erneut.',
    'Für Migrationen und mehrere Konten Konto hinzufügen oder Importieren verwenden.', 'Eintrag {index}',
  ]),
  'ru-RU': row([
    'Импорт аккаунтов', 'QR-коды экспорта Google Authenticator, ссылки otpauth, TXT и резервные копии JSON. TOTP: SHA1 · 6 цифр · 30 секунд.',
    'Выбрать файлы или изображения QR', 'Вставить ссылки или JSON', 'Прочитать текст', 'Очистить предпросмотр', 'Выбрано {selected} из {total} аккаунтов', 'Пропущено повторяющихся аккаунтов: {count}', 'Не удалось импортировать записей: {count}',
    'Пакет Google {id}: {received}/{size} QR-кодов', 'Добавьте остальные QR-коды этого экспорта перед импортом.', 'Выберите файлы, вставьте текст или изображения либо перетащите файлы сюда.',
    'Повреждённые или неверные данные аккаунта.', 'Формат или параметры OTP не поддерживаются. Только TOTP: SHA1, 6 цифр, 30 секунд.', 'На изображении не найден QR-код.', 'Конфликт данных пакета Google. Очистите предпросмотр и отсканируйте тот же экспорт заново.',
    'Для переноса и нескольких аккаунтов используйте добавление аккаунта или импорт.', 'Запись {index}',
  ]),
  'ar-SA': row([
    'استيراد الحسابات', 'رموز تصدير Google Authenticator وروابط otpauth وملفات TXT ونسخ JSON. ‏TOTP: ‏SHA1 · 6 أرقام · 30 ثانية.',
    'اختيار ملفات أو صور QR', 'لصق روابط أو JSON', 'قراءة النص', 'مسح المعاينة', 'تم تحديد {selected} من {total} حسابات', 'تم تخطي {count} حسابات مكررة', 'تعذر استيراد {count} إدخالات',
    'دفعة Google ‏{id}: ‏{received}/{size} رموز QR', 'أضف رموز QR المتبقية من هذا التصدير قبل الاستيراد.', 'اختر ملفات أو الصق نصًا أو صورًا أو اسحب الملفات إلى هنا.',
    'بيانات الحساب تالفة أو غير صالحة.', 'تنسيق أو معلمات غير مدعومة. يدعم فقط TOTP مع SHA1 و6 أرقام و30 ثانية.', 'لم يتم العثور على رمز QR في الصورة.', 'تعارض في بيانات دفعة Google. امسح المعاينة وأعد مسح رموز التصدير نفسه.',
    'استخدم إضافة حساب أو الاستيراد لنقل حسابات متعددة.', 'الإدخال {index}',
  ]),
  'ja-JP': row([
    'アカウントをインポート', 'Google Authenticator のエクスポート QR、otpauth リンク、TXT、JSON バックアップに対応。TOTP：SHA1・6 桁・30 秒。',
    'ファイルまたは QR 画像を選択', 'リンクまたは JSON を貼り付け', 'テキストを読み込む', 'プレビューをクリア', '{total} 件中 {selected} 件を選択', '重複する {count} 件をスキップ', '{count} 件をインポートできませんでした',
    'Google バッチ {id}：QR コード {received}/{size} 枚', 'インポートする前に、同じエクスポートの残りの QR コードを追加してください。', 'ファイルを選択、テキストや画像を貼り付け、またはファイルをここにドロップしてください。',
    'アカウントデータが破損しているか無効です。', '未対応の形式または OTP パラメータです。SHA1・6 桁・30 秒の TOTP のみ対応しています。', '画像に QR コードが見つかりません。', 'Google バッチデータが競合しています。プレビューをクリアして同じエクスポートを再スキャンしてください。',
    '移行や複数アカウントには追加またはインポートを使用してください。', '項目 {index}',
  ]),
  'ko-KR': row([
    '계정 가져오기', 'Google Authenticator 내보내기 QR, otpauth 링크, TXT 및 JSON 백업을 지원합니다. TOTP: SHA1 · 6자리 · 30초.',
    '파일 또는 QR 이미지 선택', '링크 또는 JSON 붙여넣기', '텍스트 읽기', '미리보기 지우기', '{total}개 중 {selected}개 계정 선택됨', '중복 계정 {count}개 건너뜀', '{count}개 항목을 가져올 수 없음',
    'Google 배치 {id}: QR 코드 {received}/{size}개', '가져오기 전에 같은 내보내기의 나머지 QR 코드를 추가하세요.', '파일을 선택하거나 텍스트·이미지를 붙여넣거나 파일을 여기로 끌어오세요.',
    '계정 데이터가 손상되었거나 올바르지 않습니다.', '지원하지 않는 형식 또는 OTP 매개변수입니다. SHA1, 6자리, 30초 TOTP만 지원합니다.', '이미지에서 QR 코드를 찾을 수 없습니다.', 'Google 배치 데이터가 충돌합니다. 미리보기를 지우고 같은 내보내기를 다시 스캔하세요.',
    '이전 또는 여러 계정에는 계정 추가나 가져오기를 사용하세요.', '항목 {index}',
  ]),
  'hi-IN': row([
    'खाते आयात करें', 'Google Authenticator निर्यात QR, otpauth लिंक, TXT और JSON बैकअप। TOTP: SHA1 · 6 अंक · 30 सेकंड।',
    'फ़ाइलें या QR चित्र चुनें', 'लिंक या JSON पेस्ट करें', 'टेक्स्ट पढ़ें', 'पूर्वावलोकन साफ़ करें', '{total} में से {selected} खाते चुने गए', '{count} डुप्लिकेट खाते छोड़े गए', '{count} प्रविष्टियाँ आयात नहीं हो सकीं',
    'Google बैच {id}: {received}/{size} QR कोड', 'आयात करने से पहले इसी निर्यात के शेष QR कोड जोड़ें।', 'फ़ाइलें चुनें, टेक्स्ट या चित्र पेस्ट करें, या फ़ाइलें यहाँ छोड़ें।',
    'खाते का डेटा क्षतिग्रस्त या अमान्य है।', 'असमर्थित प्रारूप या OTP पैरामीटर। केवल SHA1, 6 अंक, 30 सेकंड वाला TOTP समर्थित है।', 'चित्र में QR कोड नहीं मिला।', 'Google बैच डेटा में टकराव है। पूर्वावलोकन साफ़ करके उसी निर्यात को फिर स्कैन करें।',
    'स्थानांतरण और कई खातों के लिए खाता जोड़ें या आयात का उपयोग करें।', 'प्रविष्टि {index}',
  ]),
}

export function importStrings(locale: Language): Strings {
  const steam = steamStrings(locale)
  return { ...(messages[locale] ?? en), description: steam.importHint, unsupported: steam.unsupported }
}
export function importMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => values[key] === undefined ? match : String(values[key]))
}

const queueMessages: Record<Language, [string, string]> = {
  'zh-CN': ['跳过此备份', '还有 {count} 份加密备份待解锁。请解锁或跳过后再导入。'],
  'zh-TW': ['略過此備份', '還有 {count} 份加密備份待解鎖。請解鎖或略過後再匯入。'],
  'en-US': ['Skip this backup', '{count} encrypted backups still need unlocking. Unlock or skip them before importing.'],
  'es-ES': ['Omitir esta copia', 'Quedan {count} copias cifradas por desbloquear. Desbloquéalas u omítelas antes de importar.'],
  'fr-FR': ['Ignorer cette sauvegarde', '{count} sauvegardes chiffrées restent à déverrouiller. Déverrouillez-les ou ignorez-les avant d’importer.'],
  'pt-BR': ['Ignorar este backup', 'Ainda há {count} backups criptografados bloqueados. Desbloqueie ou ignore antes de importar.'],
  'de-DE': ['Diese Sicherung überspringen', '{count} verschlüsselte Sicherungen sind noch gesperrt. Vor dem Import entsperren oder überspringen.'],
  'ru-RU': ['Пропустить эту копию', 'Осталось разблокировать {count} зашифрованных копий. Разблокируйте или пропустите их перед импортом.'],
  'ar-SA': ['تخطي هذه النسخة', 'تحتاج {count} نسخ مشفرة إلى إلغاء القفل. افتحها أو تخطها قبل الاستيراد.'],
  'ja-JP': ['このバックアップをスキップ', '未解除の暗号化バックアップが {count} 件あります。解除またはスキップしてからインポートしてください。'],
  'ko-KR': ['이 백업 건너뛰기', '암호화된 백업 {count}개의 잠금을 해제해야 합니다. 가져오기 전에 잠금을 해제하거나 건너뛰세요.'],
  'hi-IN': ['यह बैकअप छोड़ें', '{count} एन्क्रिप्टेड बैकअप अभी लॉक हैं। आयात करने से पहले अनलॉक करें या छोड़ दें।'],
}
export function importQueueStrings(locale: Language) {
  const [skip, waiting] = queueMessages[locale] ?? queueMessages['en-US']
  return { skip, waiting }
}
