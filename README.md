# skills

我自己的 agent skill 库，给 Claude Code、Codex 等支持 `SKILL.md` 的 agent 使用。另外附带新项目模板（`templates/project/`）。

## 安装

```bash
git clone https://github.com/sudongyuer/skills.git ~/work/skills
cd ~/work/skills
./install.sh            # 把每个 skill 软链接到 ~/.claude/skills 和 ~/.agents/skills
./install.sh --dry-run  # 只打印将要做什么
```

之后 `git pull` 就能更新，不用重新安装。新增 skill 后重新运行一次 `./install.sh`。

`session-to-skill` 的脚本需要知道仓库在哪里：

```bash
mkdir -p ~/.config/skills
echo '{ "skill_repo_dir": "~/work/skills" }' > ~/.config/skills/config.json
```

## 目录

```text
skills/<领域>/<skill>/SKILL.md   skill 本体，另有可选的 references/ scripts/ assets/
templates/                       新 skill 的模板
templates/project/               新项目模板：AGENTS.md、设计文档和计划模板、检查清单、PR 模板等
scripts/validate.mjs             仓库校验（CI 也跑这个）
```

写 skill 的规则见 [AGENTS.md](AGENTS.md)。

## Skill 列表

### Workflow

> 和 agent 协作的方式：交接、沉淀、提示词、保持判断。

| Skill | 用途 |
| ----- | ---- |
| [`escalate-correction`](skills/workflow/escalate-correction/SKILL.md) | 被纠正或修完 bug 后，按五层顺序（代码结构 > 静态检查/CI/hook > 规则 > skill > 人工 review）决定防再犯落在哪层，给出改动和证明它生效的检查 |
| [`holding-analytical-judgment`](skills/workflow/holding-analytical-judgment/SKILL.md) | 对方情绪化反驳时不随意改口，只因新证据修正结论 |
| [`prompting-playbook`](skills/workflow/prompting-playbook/SKILL.md) | 只写约束的启动指令、编号方案、先讨论后实现、审阅反馈与自检循环 |
| [`session-handoff`](skills/workflow/session-handoff/SKILL.md) | 为另一个 agent 或新会话生成可直接接手的交接说明 |
| [`session-to-skill`](skills/workflow/session-to-skill/SKILL.md) | 把一次完成的会话分类沉淀为 skill、项目文档或全局规则 |
| [`start-mobile-app`](skills/workflow/start-mobile-app/SKILL.md) | 开一个新的 iOS App：采访 → 可行性 → 只写约束的初始化 → 设计语言 → CI 和 TestFlight → 离线界面验证 → 第一个功能，四个关卡等你拍板，进度记在 docs/KICKOFF.md |

### Quality

> 验证与文档准确性。

| Skill | 用途 |
| ----- | ---- |
| [`acceptance`](skills/quality/acceptance/SKILL.md) | 驱动真实产品取证（截图、录屏、输出），生成不可变的验收轮次并附到 PR；功能地图 FEATURES.md 告诉 agent 改动涉及哪些功能、从哪进入、怎么验证 |
| [`break-ui`](skills/quality/break-ui/SKILL.md) | 用最坏的真实数据冲击界面（长名字、空列表、计数为 1、超大字号），报告坏在哪、怎么修 |
| [`catch-single-frame-flicker-on-iphone`](skills/quality/catch-single-frame-flicker-on-iphone/SKILL.md) | 有线 120fps 录 iPhone 真机屏幕，逐帧找出并证明只闪一帧的界面问题（遮罩闪回、残影），修复前后对比异常帧数 |
| [`find-animation-opportunities`](skills/quality/find-animation-opportunities/SKILL.md) | 找出真正值得加动效的地方，同时列出被否决的候选和理由 |
| [`improve-animations`](skills/quality/improve-animations/SKILL.md) | 全库动效体检：问题清单，选中后写成可交给其他 agent 执行的计划 |
| [`ios-ui-verify`](skills/quality/ios-ui-verify/SKILL.md) | iOS 模拟器离线界面验证：验证模式、Debug 场景、AXe 脚本、浅色深色截图录屏 |
| [`measure-iphone-interaction-hangs`](skills/quality/measure-iphone-interaction-hangs/SKILL.md) | 在 iPhone 真机 Release 包上用 xctrace 挂载进程，测一个交互的主线程卡顿时长，修复前后同脚本对比 |
| [`prune-bad-precedents`](skills/quality/prune-bad-precedents/SKILL.md) | 扫描不希望被 agent 模仿的写法（无理由的 lint 屏蔽、无工单 TODO、为 workaround 辩解的注释、跳过的测试、固定 sleep、和规则矛盾的 agent 配置），出清单并指出哪些该变成 lint（只能手动调用） |
| [`react-rerender-audit`](skills/quality/react-rerender-audit/SKILL.md) | 从外部测量 React 重渲染，定位具体 hook，下放状态修复并用 Profiler 测试锁定 |
| [`review-animations`](skills/quality/review-animations/SKILL.md) | 严格审查一处动效改动：缺陷直接标出，品味选择给编号方案（只能手动调用） |
| [`spec-lifecycle`](skills/quality/spec-lifecycle/SKILL.md) | 设计文档状态管理、实现后回填实施记录、推翻时写取代文档、索引与校验脚本 |

### Mobile

> 移动应用上架与宣传。

| Skill | 用途 |
| ----- | ---- |
| [`app-store-listing`](skills/mobile/app-store-listing/SKILL.md) | App Store 上架材料：多语言文案、官方机框截图、Connect 问卷 |
| [`mobile-native`](skills/mobile/mobile-native/SKILL.md) | 让网页在手机上像 App：hover、点击高亮、100vh、输入缩放、安全区等 |
| [`product-visuals`](skills/mobile/product-visuals/SKILL.md) | 用真实截图和官方机框合成产品宣传图 |

### Design

> 设计系统、设计文档与动效。

| Skill | 用途 |
| ----- | ---- |
| [`animate`](skills/design/animate/SKILL.md) | 网页动效：先判断该不该动，再选工具、属性、曲线、时长，给编号方案后实现 |
| [`animate-expo`](skills/design/animate-expo/SKILL.md) | RN / Expo 动效：Reanimated、手势、原生 sheet、触感反馈、减弱动态效果 |
| [`animation-vocabulary`](skills/design/animation-vocabulary/SKILL.md) | 动效术语反查：把模糊描述变成准确的词，方便给 AI 或设计师下指令 |
| [`apple-design`](skills/design/apple-design/SKILL.md) | Apple 交互与动效原则：响应、可打断、速度衔接、材质、字体；原生项目只作判断标准 |
| [`design-system`](skills/design/design-system/SKILL.md) | 设计系统骨架：任务分流、速查表、禁用写法、token 检查脚本、mockup 模板 |
| [`emil-design-eng`](skills/design/emil-design-eng/SKILL.md) | 界面打磨与动效的判断方法，持有唯一的动效标准（motion-standards） |
| [`generate-design-md`](skills/design/generate-design-md/SKILL.md) | 分析一个品牌或网站的视觉体系，生成 DESIGN.md |
| [`prototype`](skills/design/prototype/SKILL.md) | 同一界面做 3–5 个真正不同的方向，用切换器对比并标出推荐（只能手动调用） |
| [`replicate-interaction-from-video`](skills/design/replicate-interaction-from-video/SKILL.md) | 照着录屏复刻交互动效：逐帧取样、状态表、假数据驱动、逐帧步进截图、几何与逐字曲线拟合、对比到误差达标 |

### Engineering

> 语言与工程实践。

| Skill | 用途 |
| ----- | ---- |
| [`write-swift`](skills/engineering/write-swift/SKILL.md) | 现代 Swift：值类型、Swift 6 并发、泛型、性能、Swift Testing；含 Expo 模块的例外 |

### Research

> 分析与审计。

| Skill | 用途 |
| ----- | ---- |
| [`codebase-value-audit`](skills/research/codebase-value-audit/SKILL.md) | 代码量是否合理：严格行数统计、按子产品归属、逐块给出价值判断 |

### Infrastructure

> 构建、CI、诊断。

| Skill | 用途 |
| ----- | ---- |
| [`capture-output-via-sidechannel`](skills/infrastructure/capture-output-via-sidechannel/SKILL.md) | 拿不到 runner/CI/容器日志时，让任务把输出写到可读取的存储里 |
| [`ci-smoke-needs-real-deps`](skills/infrastructure/ci-smoke-needs-real-deps/SKILL.md) | CI 冒烟测试因缺少数据库等依赖失败时，补服务容器和环境变量 |
| [`electron-native-lib-extraction`](skills/infrastructure/electron-native-lib-extraction/SKILL.md) | 把 Electron 应用里的原生模块集成抽成独立的源码分发 npm 库 |
| [`profiling-electron-startup`](skills/infrastructure/profiling-electron-startup/SKILL.md) | 分段测量 Electron 启动耗时，只对占比大的阶段下手 |

## 项目模板

`templates/project/` 里的文件用于新项目起步，说明见 [NEW_PROJECT_CHECKLIST.md](templates/project/NEW_PROJECT_CHECKLIST.md)。从零做小项目时，可以先用 [doc-driven-mvp](templates/project/doc-driven-mvp/README.md)。

## 校验

```bash
node scripts/validate.mjs
node --test 'scripts/*.test.mjs' 'skills/**/*.test.mjs'
```
