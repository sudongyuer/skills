# 文档驱动 MVP 模板

适合从零开始的小项目：先和 AI 把文档聊清楚，再让 agent 按文档一次实现。

## 用法

1. **脑暴**：复制 `BRAINSTORM.md`，和 AI 讨论方向，直到"已确定"一节填满。
2. **产品**：把 `PROJECT.md` 复制为 `<代号>.md`，先回答它是什么、为谁、第一秒看到什么、拒绝什么。
3. **设计**：`PROJECT-DESIGN.md` → `<代号>-DESIGN.md`，锁定调色板、动效范围和禁止列表。
4. **开发**：`PROJECT-DEV.md` → `<代号>-DEV.md`，确定技术栈、状态边界、数据结构和冻结条款。
5. **数据**（可选）：内容资产放进 `PROJECT-DATA.md` / `PROJECT-TOPIC.md` 的副本。
6. **启动**：`AGENTS.md` 放到仓库根目录，把 `KICKOFF_PROMPT.md` 里的指令交给 agent。
7. **迭代**：先改文档章节，再让 agent 按章节修改代码。

`WORKFLOW.md` 讲完整的阶段划分，`HOW-TO-USE.md` 讲每份文档怎么写。

## 与项目模板的关系

MVP 跑通、准备长期维护时，切换到上一级目录的项目模板：`AGENTS.md` 改为约束式规则，大功能改用 `spec.template.md` 写设计文档，并启用 `spec-lifecycle`。
