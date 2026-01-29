# 语言架构优化对比

## 优化前 vs 优化后

### 优化前：需要修改 4 个文件

添加一个新语言（如意大利语）需要：

1. **创建翻译文件** `src/locales/it-IT.ts`
2. **修改类型定义** `src/types/index.ts`
   ```typescript
   export type Language = 'zh-CN' | 'en-US' | ... | 'it-IT'  // 手动添加
   ```
3. **修改 I18n 上下文** `src/contexts/I18nContext.tsx`
   ```typescript
   import { itIT } from '@/locales/it-IT'  // 导入

   const translations = {
     // ...
     'it-IT': itIT,  // 注册
   }

   const langMap = {
     // ...
     'it': 'it-IT',  // 检测映射
     'it-IT': 'it-IT',
   }

   const validLanguages = [..., 'it-IT']  // 验证列表
   ```
4. **修改设置组件** `src/components/SettingsModal.tsx`
   ```typescript
   <SelectItem value="it-IT">Italiano</SelectItem>  // 手动添加
   ```
5. **更新所有翻译文件** 添加 `settings.languageItalian` key

**问题**：
- ❌ 重复劳动多
- ❌ 容易遗漏步骤
- ❌ 维护成本高
- ❌ 类型不自动更新

---

### 优化后：只需修改 1 个文件

添加意大利语只需：

1. **创建翻译文件** `src/locales/it-IT.ts`（同前）
2. **在注册中心添加配置** `src/locales/index.ts`
   ```typescript
   import { itIT } from './it-IT'  // 导入

   export const LANGUAGE_CONFIGS = [
     // ... 现有配置
     {
       code: 'it-IT',
       nativeName: 'Italiano',
       translations: itIT,
       detectCodes: ['it', 'it-IT', 'it-CH'],
     },
   ]
   // 所有其他内容自动生成！
   ```

**优势**：
- ✅ **单一数据源**：所有配置集中管理
- ✅ **自动生成**：类型、映射、验证列表全部自动生成
- ✅ **零遗漏**：不需要修改其他文件
- ✅ **类型安全**：TypeScript 自动推导类型
- ✅ **易维护**：添加/删除语言都很简单

---

## 架构图

### 优化前的依赖关系

```
翻译文件 (it-IT.ts)
    ↓
手动修改 types/index.ts ────────┐
    ↓                          │
手动修改 I18nContext.tsx ───────┼── 容易不一致
    ↓                          │
手动修改 SettingsModal.tsx ─────┤
    ↓                          │
手动修改所有翻译文件 ────────────┘
```

### 优化后的依赖关系

```
翻译文件 (it-IT.ts)
    ↓
locales/index.ts (注册中心)
    ↓ 自动生成
    ├─→ Language 类型
    ├─→ translations 映射
    ├─→ languageNames 映射
    ├─→ detectionMap 映射
    ├─→ supportedLanguages 数组
    └─→ detectSystemLanguage()
    ↓
自动使用
    ├─→ types/index.ts (导入 Language 类型)
    ├─→ I18nContext.tsx (导入 translations + detectSystemLanguage)
    └─→ SettingsModal.tsx (导入 LANGUAGE_CONFIGS 动态渲染)
```

---

## 代码对比

### 类型定义

**优化前**：
```typescript
// types/index.ts - 需要手动维护
export type Language = 'zh-CN' | 'en-US' | 'ru-RU' | 'de-DE' | 'ja-JP' | 'ko-KR' | 'hi-IN' | 'zh-TW' | 'es-ES' | 'ar-SA' | 'fr-FR' | 'pt-BR'
```

**优化后**：
```typescript
// types/index.ts - 自动从 locales 导入
export type { Language } from '@/locales'

// locales/index.ts - 自动推导
export type Language = typeof LANGUAGE_CONFIGS[number]['code']
// 结果：'zh-CN' | 'en-US' | ... （自动生成）
```

---

### 翻译映射

**优化前**：
```typescript
// I18nContext.tsx - 需要手动导入和注册
import { zhCN } from '@/locales/zh-CN'
import { enUS } from '@/locales/en-US'
// ... 12 个导入

const translations: Record<Language, Translations> = {
  'zh-CN': zhCN,
  'en-US': enUS,
  // ... 12 个手动映射
}
```

**优化后**：
```typescript
// I18nContext.tsx - 直接导入使用
import { translations } from '@/locales'

// locales/index.ts - 自动生成
export const translations = LANGUAGE_CONFIGS.reduce(
  (acc, config) => {
    acc[config.code] = config.translations
    return acc
  },
  {}
)
```

---

### 语言检测

**优化前**：
```typescript
// I18nContext.tsx - 硬编码 50+ 行的映射表
function detectSystemLanguage(): Language {
  const langMap: Record<string, Language> = {
    'zh': 'zh-CN',
    'zh-CN': 'zh-CN',
    'zh-TW': 'zh-TW',
    // ... 30+ 行手动映射
  }
  // ... 检测逻辑
}
```

**优化后**：
```typescript
// locales/index.ts - 自动从配置生成
const detectionMap = LANGUAGE_CONFIGS.reduce(
  (acc, config) => {
    config.detectCodes.forEach(code => {
      acc[code] = config.code
    })
    return acc
  },
  {}
)

export function detectSystemLanguage(): Language {
  // 使用自动生成的 detectionMap
}
```

---

### UI 渲染

**优化前**：
```typescript
// SettingsModal.tsx - 手动列出所有选项
<SelectContent>
  <SelectItem value="zh-CN">{t('settings.languageChinese')}</SelectItem>
  <SelectItem value="zh-TW">{t('settings.languageTraditionalChinese')}</SelectItem>
  <SelectItem value="en-US">{t('settings.languageEnglish')}</SelectItem>
  {/* ... 12 行手动复制粘贴 */}
</SelectContent>
```

**优化后**：
```typescript
// SettingsModal.tsx - 自动渲染
import { LANGUAGE_CONFIGS } from '@/locales'

<SelectContent>
  {LANGUAGE_CONFIGS.map((config) => (
    <SelectItem key={config.code} value={config.code}>
      {config.nativeName}
    </SelectItem>
  ))}
</SelectContent>
```

---

## 性能对比

| 指标 | 优化前 | 优化后 |
|-----|--------|--------|
| 添加新语言需修改文件数 | 5 个 | 2 个（翻译文件 + 注册中心） |
| 手动维护的代码行数 | ~150 行 | ~10 行 |
| 出错风险 | 高（多处修改） | 低（单点配置） |
| TypeScript 类型安全 | 部分（手动类型） | 完全（自动推导） |
| 运行时性能 | 无差异 | 无差异 |
| 构建时间 | 无差异 | 无差异 |

---

## 扩展性对比

### 添加 10 种新语言

**优化前**：
- 修改 5 个文件 × 10 次 = 50 次文件修改
- 约 500 行手动代码
- 容易遗漏或出错

**优化后**：
- 创建 10 个翻译文件
- 在注册中心添加 10 个配置对象（每个约 7 行）
- 约 70 行配置代码
- 其他全部自动生成

---

## 维护性对比

### 删除一种语言

**优化前**：
1. 删除翻译文件
2. 修改 `types/index.ts` 删除类型
3. 修改 `I18nContext.tsx` 删除导入、映射、检测
4. 修改 `SettingsModal.tsx` 删除选项
5. 修改所有翻译文件删除相关 key

**优化后**：
1. 在 `locales/index.ts` 删除配置对象
2. （可选）删除翻译文件

---

## 总结

优化后的架构实现了：

✅ **DRY 原则**（Don't Repeat Yourself）- 单一数据源
✅ **开闭原则**（Open-Closed Principle）- 对扩展开放，对修改封闭
✅ **依赖倒置**（Dependency Inversion）- 高层模块依赖抽象配置
✅ **类型安全**（Type Safety）- 编译时自动推导和检查
✅ **可维护性**（Maintainability）- 集中管理，易于修改

这是一个典型的**数据驱动**架构优化案例，通过将配置集中化和自动化代码生成，大幅降低了维护成本和出错概率。
