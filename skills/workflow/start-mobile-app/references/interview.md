# Interview

Ask in Chinese. At most four questions per round, each with 2–4 options and a
recommended option first (marked "（推荐）"). Ask open questions — the product
in one sentence, reference repository paths — on their own, as plain text.
Stop asking as soon as Gate 1 can be written; three rounds is usually enough.

## Fast path mapping

When the first message already contains a kickoff (a feasibility question,
constraints, a reference template, scope exclusions), fill the topics below
from it, quote what you took, and ask one round only for the topics still
empty. Never re-ask something the user already stated.

## Round 1 — product (open questions, one at a time)

1. 一句话说说这个 App 是什么、给谁用？
2. 打开 App 第一屏应该看到什么？最核心的一个操作是什么？
3. 它明确**不**做什么？（可以先说"没想好"）

## Round 2 — risks and references (multiple choice + one open question)

- **技术风险**（多选）: 离线数据与同步 / 第三方 SDK 能否在所选技术栈里使用 /
  后台任务、推送、定位等系统能力 / 高性能渲染（长列表、富文本、动画）/
  暂时没有明显风险
- **是否先做可行性验证**: 每个风险都做最小原型（推荐）/ 只做调研不写原型 / 跳过
- **参照对象**（开放问题）: 有没有想参考的 App、仓库或你以前的项目？给本地路径或链接；
  我会读它们的代码结构和 AGENTS.md / CLAUDE.md。

## Round 3 — form, scale, pace

- **形态**: 先做可行性再决定（推荐）/ 纯 Swift + SwiftUI / RN + Expo + 一个 Swift 模块
- **规模**: 长期维护：设计文档 + spec-lifecycle（推荐）/ 小 MVP：文档驱动一次做完 /
  先做 MVP，之后转长期
- **最低系统版本**: 最新的两个 iOS 大版本（推荐）/ 只支持最新版 / 指定版本
- **需要我在开局里配好的外部服务**（多选）: GitHub 仓库 / TestFlight / 推送 /
  都先不配

## Gate 1 summary (one page)

```markdown
## 开局摘要（YYYY-MM-DD）

- 产品：<一句话>；用户：<…>；第一屏：<…>；核心操作：<…>
- 不做：<…>
- 技术风险（将做可行性验证）：1. <…> 2. <…>
- 参照：<路径/链接>（将读取：结构、AGENTS.md/CLAUDE.md）
- 形态：<待可行性决定 / 纯原生 / RN+Swift>
- 规模：<长期 / 小 MVP>；最低 iOS：<…>
- 开局内配置的外部服务：<…>（每次操作前仍会单独确认）

确认无误回复"确认"，需要改的直接说哪一条。
```
