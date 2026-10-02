# PROJECT-DEV — 开发文档

> 这是 `[项目代号]` 的**工程规范**。它回答：产品怎么被实现、数据结构长什么样、哪些决策一旦定下来就不可更改。
>
> **边界**：`PROJECT.md` 回答「是什么」，`PROJECT-DESIGN.md` 回答「长什么样」，本文档回答「怎么被实现」。三份文档冲突时，`PROJECT.md` 是意图，`PROJECT-DESIGN.md` 是视觉契约，本文档是实现当前的草稿。意图先改，视觉契约再跟上，实现最后跟上。
>
> **跨文档引用约定**：`产品文档 §X.Y` 引用 `PROJECT.md`，`设计文档 §X.Y` 引用 `PROJECT-DESIGN.md`，`开发文档 §X.Y` 引用本文档。AI 在生成代码时，注释中应使用上述格式精确定位依据。

---

## 一、工程底座

### 1.1 技术栈

| 层级 | 选型 | 约束/备注 |
|------|------|----------|
| UI 框架 | `[例如：React 19]` | `[例如：函数组件 + Hooks，不用 class]` |
| 构建工具 | `[例如：Vite 8]` | |
| 路由 | `[例如：React Router v7 · Framework mode]` | `[例如：file-based routing，开启 prerender]` |
| 状态管理 | `[例如：Zustand]` | `[例如：多 store 按领域拆分，见 §1.3]` |
| 类型系统 | `[例如：TypeScript strict]` | |
| 样式方案 | `[例如：vanilla-extract]` | **[设计文档 §2–§6] 的视觉契约通过此方案落地** |
| 包管理器 | `[例如：pnpm]` | |
| 部署平台 | `[例如：Vercel]` | |

### 1.2 渲染策略

`[描述整体策略，例如："两静一动"——首屏无白屏走 SSG，客户端专属数据走纯 SPA]`

| 路由 | 渲染方式 | 说明 |
|------|---------|------|
| `/` | `[SSG 预渲染 / SSR / SPA]` | `[例如：首屏散文式开场，静态可预渲染，hydrate 后激活交互]` |
| `/[flow]` | `[SSG 预渲染 / SSR / SPA]` | `[例如：壳预渲染，数据打入 bundle，hydrate 后激活]` |
| `/result/:id` | `[SSG 预渲染 / SSR / SPA]` | `[例如：纯 SPA，不参与 SSG——hash 内容千差万别，无法预渲染]` |

### 1.3 状态管理

`[描述整体策略，例如：多 store 按领域拆分，不共用根 store]`

**规则：**
- **store 之间不互相 import**。组件需要组合多个 store 时，在组件层同时调用多个 hook，不做 store → store 引用。
- **持久化边界要守住**。只有明确需要持久化的 store 走 `persist` 中间件，其余绝对不落 localStorage。
- **`persist` 必须用 `partialize` 白名单**，只序列化状态字段，不序列化 setter 和派生值。
- **每个 `persist` store 独立键名**，格式：`[project-code]-[domain]`（如 `myapp-theme`）。

```ts
// app/stores/useXxxStore.ts
//   职责：[描述这个 store 管理什么]
//   服务：[例如：仅在 /quiz 路由内被读写，进入 /result 时 consume 一次然后 reset]
//   持久化：[例如：不落 localStorage] / [例如：通过 persist 写 localStorage，键名 'myapp-xxx']

interface XxxState {
  // ── 状态字段 ──
  field: Type;

  // ── 操作 ──
  setField(value: Type): void;
  reset(): void;
}

// app/stores/useYyyStore.ts  （持久化示例）
//   职责：[描述]
//   持久化：[键名]，partialize 只写 { yyy } 字段，version: 1，升级结构时写 migrate 函数

interface YyyState {
  yyy: YyyRecord | null;
  setYyy(record: YyyRecord): void;
  clearYyy(): void;
}
```

### 1.4 路由与目录结构

`[描述路由配置方式，例如：React Router v7 Framework mode，file-based routing]`

```
app/
  root.tsx           ← 根布局，主题注入，防闪烁脚本
  routes.ts          ← 路由表（或 file-based，按框架约定）
  routes/            ← 页面路由
  components/        ← UI 组件
  stores/            ← 全局状态（每个 store 一个文件）
  lib/               ← 数据层 / 逻辑层 / 工具函数
  styles/            ← design token 定义、全局样式
```

### 1.5 样式系统

`[描述样式方案的具体约定，例如：所有样式写在 *.css.ts 里，build 时产出真正的 CSS 文件，不引 Tailwind / Emotion]`

**关键约束**：
- 所有颜色、字体、间距必须通过 design token 引用（见 `设计文档 §2–§4`）
- 禁止在组件文件中写死 hex 值或 px 值
- `[其他约束]`

---

## 二、数据结构

### 2.1 核心类型定义

```ts
// ═══ 静态数据层 ═══
// 来自 PROJECT-[TOPIC].md，在构建时解析为常量

interface Item {
  id: string | number;
  // ...
}

// ═══ 运行时状态层 ═══
// 答题/流程中的瞬时状态，不持久化

interface RuntimeState {
  // ...
}

// ═══ 结果/输出层 ═══
// 流程完成后的产出，可编码为分享链接

interface Result {
  // ...
}

// ═══ 持久化层 ═══
// 写入 localStorage 的内容，需要版本控制和 migrate 函数

interface PersistedRecord {
  version: number;
  // ...
}
```

### 2.2 类型边界约束

`[描述类型设计中必须遵守的约定，例如：使用判别联合（discriminated union）而非 optional 字段表达互斥状态；编码器是结果对象 → 分享字符串的唯一入口，不允许其他路径]`

---

## 三、编码/序列化（如有）

> 如果产品没有分享链接或持久化编码，可删除本节。

### 3.1 明文格式

`[描述内部数据如何被序列化为可分享的字符串，例如：维度分数拼接为 "LNMW-12-8-15-7"]`

### 3.2 编码算法

`[描述编码步骤：校验、置换、字符映射等。一旦上线不可更改，见四·冻结条款]`

### 3.3 解码算法

`[描述解码步骤和失败处理，例如：hash 非法时静默降级到首页，不报错]`

---

## 四、冻结条款（必须遵守）

以下条款在产品上线、产生可持久化用户数据后**不应更改**。更改任何一条都会导致旧链接或旧存档失效：

1. **`[条款1，例如：结果 hash 的字符集]`** — `[解释，例如：Base62 字符集固定为 0-9A-Za-z，不可增删字符]`
2. **`[条款2，例如：维度顺序]`** — `[解释，例如：编码串中四个维度的排列顺序固定为 LNMW，不可重排]`
3. **`[条款3，例如：版本字段位置]`** — `[解释]`

如果需要修改其中任何一条，那不是"版本升级"，而是一次**格式迁移**——意味着旧数据全部作废或需要迁移脚本。

---

## 五、内容数据集成

项目的具体内容资产（题目、文案、配置）存放在独立的 `PROJECT-[TOPIC].md` 文档中。开发层不负责修改这些数据，只负责：

1. 在构建时或运行时将数据文档解析为结构化格式（JSON / TS 常量）
2. 保证 UI 能正确渲染这些数据
3. 不将大量文案硬编码在组件文件中

---

## 六、错误处理与降级

### 6.1 错误呈现原则

当某个内容或资源加载失败时：`[描述错误 UI 风格，例如：显示一句诚实的句子，不用 Toast / Modal / 红色 Banner]`

### 6.2 静默降级场景

以下非致命错误静默处理，不提示用户：

- `[例如：非关键图片加载失败]`
- `[例如：可选的本地缓存读取失败]`
- `[例如：分享链接 hash 无法解析时，静默回首页]`
