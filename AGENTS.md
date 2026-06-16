# WebGameDevPlace — Agent Guidelines

## 1. Phaser 4 技能查阅
- 开发前根据任务描述从 `.claude/skills/` 中选取匹配的 Phaser 4 技能加载
- 可用技能涵盖：场景、动画、音频、相机、曲线路径、数据管理、事件、滤镜、游戏对象组件、几何数学、图形绘制、组/容器、输入(键盘/鼠标/触摸)、资源加载、粒子、弧线物理、Matter物理、渲染纹理、响应式、文本、瓦片地图、时间/定时器、补间、动作工具、v4新特性、v3→v4迁移

## 2. 项目记忆文档
- 每次开发迭代在 `docs/` 下创建文档，格式：`docs/YYYY-MM-DD-简要描述.md`
- 内容包含：本轮需求、设计方案、实现要点、遇到的问题及解决、文件变更清单
- 新任务开始时先查看 `docs/` 近期文档，了解上下文和已做过的功能

## 3. 代码理解
- 优先使用 codegraph MCP 工具（`codegraph_codegraph_context`、`codegraph_codegraph_search`、`codegraph_codegraph_trace` 等）替代 grep/全局搜索
- 如果 `.codegraph/` 不存在或未初始化，先执行 codegraph 项目初始化
- codegraph 用于快速理解代码结构、查找符号定义、追踪调用链

## 4. Git 提交
- 每次开发任务完成后必须执行全量提交
- 提交信息必须清晰描述本轮开发内容

## 5. 每次交互必须触发技能
- 每次与用户交互前，必须从 `.claude/skills/grill-with-docs/` 加载 `grill-with-docs` 技能并执行

## 6. 高风险/坑点记录
- 开发过程中发现的高风险问题、棘手的 Bug、容易误导后续 agent 的事实，按时间顺序追加到本文件末尾

