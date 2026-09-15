import type { Language } from '@/types'

const en = {
  type: 'Code type', standard: 'Standard TOTP (6 digits)', secret: 'Steam shared_secret (Base64)',
  hint: 'Use shared_secret from your .maFile. Steam Guard generates 5 characters every 30 seconds using your system clock.',
  invalidSecret: 'Enter a valid Base64 shared_secret.',
  importHint: 'Import Google Authenticator QR codes, Steam .maFile, otpauth links, TXT or JSON backups.',
  unsupported: 'Only SHA1, 6-digit, 30-second TOTP and 5-character Steam Guard are supported.',
}
type Strings = { [K in keyof typeof en]: string }
const keys = Object.keys(en) as (keyof Strings)[]
const row = (values: string[]): Strings => {
  if (values.length !== keys.length) throw new Error('Invalid Steam translation')
  return Object.fromEntries(keys.map((key, i) => [key, values[i]])) as Strings
}
const messages: Record<Language, Strings> = {
  'en-US': en,
  'zh-CN': row(['验证码类型', '标准 TOTP（6 位数字）', 'Steam shared_secret（Base64）', '填写 .maFile 中的 shared_secret。Steam Guard 使用系统时间，每 30 秒生成 5 位字母数字码。', '请输入有效的 Base64 shared_secret。', '支持 Google Authenticator 二维码、Steam .maFile、otpauth 链接、TXT 和 JSON 备份。', '仅支持 SHA1、6 位、30 秒 TOTP，以及 5 位 Steam Guard。']),
  'zh-TW': row(['驗證碼類型', '標準 TOTP（6 位數字）', 'Steam shared_secret（Base64）', '填入 .maFile 中的 shared_secret。Steam Guard 使用系統時間，每 30 秒產生 5 位英數驗證碼。', '請輸入有效的 Base64 shared_secret。', '支援 Google Authenticator QR 碼、Steam .maFile、otpauth 連結、TXT 和 JSON 備份。', '僅支援 SHA1、6 位、30 秒 TOTP，以及 5 位 Steam Guard。']),
  'es-ES': row(['Tipo de código', 'TOTP estándar (6 dígitos)', 'shared_secret de Steam (Base64)', 'Usa shared_secret de tu .maFile. Steam Guard genera 5 caracteres cada 30 segundos con el reloj del sistema.', 'Introduce un shared_secret Base64 válido.', 'Importa QR de Google Authenticator, Steam .maFile, enlaces otpauth, TXT o copias JSON.', 'Solo se admiten TOTP SHA1 de 6 dígitos y 30 segundos y Steam Guard de 5 caracteres.']),
  'fr-FR': row(['Type de code', 'TOTP standard (6 chiffres)', 'shared_secret Steam (Base64)', 'Utilisez shared_secret de votre .maFile. Steam Guard génère 5 caractères toutes les 30 secondes avec l’horloge système.', 'Saisissez un shared_secret Base64 valide.', 'Importez les QR Google Authenticator, Steam .maFile, liens otpauth, TXT ou sauvegardes JSON.', 'Seuls TOTP SHA1 à 6 chiffres sur 30 secondes et Steam Guard à 5 caractères sont pris en charge.']),
  'pt-BR': row(['Tipo de código', 'TOTP padrão (6 dígitos)', 'shared_secret do Steam (Base64)', 'Use shared_secret do seu .maFile. Steam Guard gera 5 caracteres a cada 30 segundos usando o relógio do sistema.', 'Insira um shared_secret Base64 válido.', 'Importe QR do Google Authenticator, Steam .maFile, links otpauth, TXT ou backups JSON.', 'Apenas TOTP SHA1 de 6 dígitos e 30 segundos e Steam Guard de 5 caracteres são suportados.']),
  'de-DE': row(['Codetyp', 'Standard-TOTP (6 Ziffern)', 'Steam shared_secret (Base64)', 'Verwenden Sie shared_secret aus Ihrer .maFile. Steam Guard erzeugt mit der Systemzeit alle 30 Sekunden 5 Zeichen.', 'Geben Sie einen gültigen Base64-shared_secret ein.', 'Google-Authenticator-QR, Steam .maFile, otpauth-Links, TXT oder JSON-Sicherungen importieren.', 'Unterstützt werden nur SHA1-TOTP mit 6 Ziffern und 30 Sekunden sowie Steam Guard mit 5 Zeichen.']),
  'ru-RU': row(['Тип кода', 'Стандартный TOTP (6 цифр)', 'Steam shared_secret (Base64)', 'Используйте shared_secret из .maFile. Steam Guard создаёт 5 символов каждые 30 секунд по системному времени.', 'Введите корректный shared_secret в Base64.', 'Импорт QR Google Authenticator, Steam .maFile, ссылок otpauth, TXT и копий JSON.', 'Поддерживаются только TOTP SHA1, 6 цифр, 30 секунд и Steam Guard из 5 символов.']),
  'ar-SA': row(['نوع الرمز', 'TOTP قياسي (6 أرقام)', 'Steam shared_secret ‏(Base64)', 'استخدم shared_secret من ملف .maFile. ينشئ Steam Guard رمزًا من 5 أحرف كل 30 ثانية باستخدام ساعة النظام.', 'أدخل shared_secret صالحًا بتنسيق Base64.', 'استيراد QR من Google Authenticator أو Steam .maFile أو روابط otpauth أو نسخ TXT وJSON.', 'يدعم فقط TOTP مع SHA1 و6 أرقام و30 ثانية، وSteam Guard من 5 أحرف.']),
  'ja-JP': row(['コードの種類', '標準 TOTP（6 桁）', 'Steam shared_secret（Base64）', '.maFile の shared_secret を入力してください。Steam Guard はシステム時刻で 30 秒ごとに 5 文字のコードを生成します。', '有効な Base64 shared_secret を入力してください。', 'Google Authenticator の QR、Steam .maFile、otpauth リンク、TXT、JSON バックアップに対応。', 'SHA1・6 桁・30 秒の TOTP と 5 文字の Steam Guard のみ対応しています。']),
  'ko-KR': row(['코드 유형', '표준 TOTP (6자리 숫자)', 'Steam shared_secret (Base64)', '.maFile의 shared_secret을 입력하세요. Steam Guard는 시스템 시각으로 30초마다 5자리 영숫자 코드를 생성합니다.', '올바른 Base64 shared_secret을 입력하세요.', 'Google Authenticator QR, Steam .maFile, otpauth 링크, TXT 및 JSON 백업을 가져옵니다.', 'SHA1, 6자리, 30초 TOTP와 5자리 Steam Guard만 지원합니다.']),
  'hi-IN': row(['कोड का प्रकार', 'मानक TOTP (6 अंक)', 'Steam shared_secret (Base64)', 'अपनी .maFile का shared_secret इस्तेमाल करें। Steam Guard सिस्टम समय से हर 30 सेकंड में 5 अक्षरों का कोड बनाता है।', 'मान्य Base64 shared_secret दर्ज करें।', 'Google Authenticator QR, Steam .maFile, otpauth लिंक, TXT या JSON बैकअप आयात करें।', 'केवल SHA1, 6 अंक, 30 सेकंड वाला TOTP और 5 अक्षरों वाला Steam Guard समर्थित है।']),
}
const autoHints: Record<Language, string> = {
  'zh-CN': '粘贴标准 Base32 密钥或 Steam shared_secret（Base64），自动识别类型。',
  'zh-TW': '貼上標準 Base32 金鑰或 Steam shared_secret（Base64），自動辨識類型。',
  'en-US': 'Paste a standard Base32 key or Steam shared_secret (Base64). The type is detected automatically.',
  'es-ES': 'Pega una clave Base32 o shared_secret de Steam (Base64). El tipo se detecta automáticamente.',
  'fr-FR': 'Collez une clé Base32 ou un shared_secret Steam (Base64). Le type est détecté automatiquement.',
  'pt-BR': 'Cole uma chave Base32 ou shared_secret do Steam (Base64). O tipo é detectado automaticamente.',
  'de-DE': 'Base32-Schlüssel oder Steam shared_secret (Base64) einfügen. Der Typ wird automatisch erkannt.',
  'ru-RU': 'Вставьте ключ Base32 или Steam shared_secret (Base64). Тип определяется автоматически.',
  'ar-SA': 'الصق مفتاح Base32 أو Steam shared_secret بتنسيق Base64. يُكتشف النوع تلقائيًا.',
  'ja-JP': 'Base32 キーまたは Steam shared_secret（Base64）を貼り付けてください。種類は自動判別されます。',
  'ko-KR': 'Base32 키 또는 Steam shared_secret(Base64)을 붙여넣으세요. 유형을 자동으로 감지합니다.',
  'hi-IN': 'Base32 कुंजी या Steam shared_secret (Base64) पेस्ट करें। प्रकार अपने आप पहचाना जाता है।',
}
export function steamStrings(locale: Language) { return { ...(messages[locale] ?? en), autoHint: autoHints[locale] ?? autoHints['en-US'] } }
