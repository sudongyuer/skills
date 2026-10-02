# 启动指令

文档（`AGENTS.md`、`PROJECT.md`、`PROJECT-DESIGN.md`、`PROJECT-DEV.md` 以及需要的 `PROJECT-*.md`）都放进仓库根目录后，把下面这段交给 agent，让它一次跑完整个实现。

```text
阅读仓库根目录的 AGENTS.md，然后按其中规定的顺序阅读 PROJECT.md、PROJECT-DESIGN.md、
PROJECT-DEV.md 和相关的 PROJECT-*.md 数据文档。

根据这些文档实现整个 MVP：
- 技术栈、目录结构和数据结构以 PROJECT-DEV.md 为准；
- 视觉与交互以 PROJECT-DESIGN.md 为准，禁止列表是红线；
- 内容和文案从数据文档读取，不要硬编码进组件。

文档之间冲突时按 AGENTS.md 的优先级处理，并把冲突列出来告诉我，不要自行改写文档意图。
文档没有覆盖、但必须做决定的地方，给出编号选项并说明你的推荐，先按推荐继续，最后统一汇报。

每完成一个可运行的里程碑：跑通 lint、类型检查和测试，截图或录屏验证界面，然后提交
（Conventional Commits）。全部完成后，列出：已实现的文档章节、偏离文档的地方和原因、
你代我做的决定、尚未实现的部分。
```

## 之后的改动

"文档优先"：先改对应文档的章节，再让 agent 按新章节修改代码，例如：

```text
PROJECT-DESIGN.md §4.2 已更新（列表改为卡片布局）。请按新版本修改实现，
其他章节不变；完成后告诉我改了哪些文件，并附截图。
```
