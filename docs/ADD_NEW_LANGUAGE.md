# 添加新语言指南

本项目现在使用自动化的语言注册机制。添加新语言非常简单，只需要 3 个步骤。

## 架构说明

- **`src/locales/index.ts`**: 语言注册中心，所有语言配置在此管理
- **`src/types/index.ts`**: Language 类型自动从 locales 导入
- **`src/contexts/I18nContext.tsx`**: 自动使用注册的语言
- **`src/components/SettingsModal.tsx`**: 自动渲染所有语言选项

## 添加新语言步骤

### 步骤 1: 创建翻译文件

在 `src/locales/` 目录下创建新语言文件，例如 `it-IT.ts`（意大利语）：

```typescript
import type { Translations } from './zh-CN'

export const itIT: Translations = {
  // 复制 en-US.ts 的内容并翻译为意大利语
  'title': 'Generatore TOTP',
  'addAccount': 'Aggiungi account',
  // ... 其他翻译
}
```

**注意**：
- 文件名格式：`语言代码.ts`（如 `it-IT.ts`）
- 导出变量名格式：驼峰式（如 `itIT`）
- 必须实现 `Translations` 接口的所有 key

### 步骤 2: 在 `src/locales/index.ts` 中注册

1. 导入新的翻译文件：

```typescript
import { itIT } from './it-IT'
```

2. 在 `LANGUAGE_CONFIGS` 数组中添加配置：

```typescript
export const LANGUAGE_CONFIGS: LanguageConfig[] = [
  // ... 现有配置
  {
    code: 'it-IT',                          // 语言代码
    nativeName: 'Italiano',                 // 原生显示名称
    translations: itIT,                     // 翻译对象
    detectCodes: ['it', 'it-IT', 'it-CH'],  // 自动检测的语言代码
  },
]
```

**配置字段说明**：
- `code`: 语言代码，遵循 BCP 47 标准（如 'it-IT'）
- `nativeName`: 该语言的原生名称（如意大利语的 'Italiano'）
- `translations`: 翻译对象
- `detectCodes`: 用于自动检测的语言代码列表，包括主代码和地区变体

### 步骤 3: 构建并测试

```bash
bun run build
```

完成！新语言会自动：
- ✅ 添加到 TypeScript 类型系统
- ✅ 在设置页面显示
- ✅ 支持自动语言检测
- ✅ 可以手动切换

## 示例：添加意大利语

### 1. 创建 `src/locales/it-IT.ts`

```typescript
import type { Translations } from './zh-CN'

export const itIT: Translations = {
  'title': 'Generatore TOTP',
  'addAccount': 'Aggiungi account',
  'button.add': 'Salva',
  'button.cancel': 'Annulla',
  // ... 所有其他 key
}
```

### 2. 更新 `src/locales/index.ts`

```typescript
// 在文件顶部添加导入
import { itIT } from './it-IT'

// 在 LANGUAGE_CONFIGS 数组中添加
{
  code: 'it-IT',
  nativeName: 'Italiano',
  translations: itIT,
  detectCodes: ['it', 'it-IT', 'it-CH'],
}
```

### 3. 完成！

运行 `bun run build`，意大利语就会出现在语言选择器中。

## 删除语言

如果需要删除某个语言：

1. 从 `src/locales/index.ts` 的 `LANGUAGE_CONFIGS` 数组中删除对应配置
2. 删除对应的翻译文件（可选，建议保留）
3. 重新构建

## 常见问题

### Q: 如何找到所有需要翻译的 key？

A: 参考 `src/locales/zh-CN.ts`，它定义了 `Translations` 类型。TypeScript 会在编译时检查缺失的 key。

### Q: 如何测试新语言？

A:
1. 构建项目：`bun run build`
2. 加载扩展到 Chrome
3. 打开设置，切换到新语言
4. 或者在浏览器设置中将新语言设置为首选语言，重新加载扩展

### Q: detectCodes 应该包含哪些代码？

A: 包括：
- 主语言代码（如 'it'）
- 完整的语言-地区代码（如 'it-IT'）
- 该语言的主要地区变体（如意大利语的 'it-CH' 瑞士）

### Q: 如何调整语言显示顺序？

A: 在 `LANGUAGE_CONFIGS` 数组中调整配置的顺序即可。

## 当前支持的语言

| 语言代码 | 原生名称 | 检测代码 |
|---------|---------|---------|
| zh-CN   | 中文 | zh, zh-CN |
| zh-TW   | 繁體中文 | zh-TW, zh-HK |
| en-US   | English | en, en-US, en-GB |
| es-ES   | Español | es, es-ES, es-MX, es-AR |
| fr-FR   | Français | fr, fr-FR, fr-CA, fr-BE |
| pt-BR   | Português | pt, pt-BR, pt-PT |
| de-DE   | Deutsch | de, de-DE, de-AT, de-CH |
| ru-RU   | Русский | ru, ru-RU |
| ar-SA   | العربية | ar, ar-SA, ar-EG, ar-AE |
| ja-JP   | 日本語 | ja, ja-JP |
| ko-KR   | 한국어 | ko, ko-KR |
| hi-IN   | हिन्दी | hi, hi-IN |

## 技术细节

### 自动生成的内容

`src/locales/index.ts` 自动生成：
- `Language` 类型（从配置推导）
- `translations` 对象（语言代码 → 翻译映射）
- `languageNames` 对象（语言代码 → 原生名称映射）
- `detectionMap` 对象（检测代码 → 语言代码映射）
- `supportedLanguages` 数组（所有支持的语言代码）
- `detectSystemLanguage()` 函数（自动检测系统语言）

### 依赖关系

```
翻译文件 (*.ts)
    ↓
locales/index.ts (注册中心)
    ↓
├─→ types/index.ts (Language 类型)
├─→ I18nContext.tsx (翻译逻辑)
└─→ SettingsModal.tsx (语言选择器)
```
