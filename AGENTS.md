# WebGameDevPlace — Agent Guidelines

## 1. Three.js 开发
- 渲染栈为 **Three.js + Vite**，入口 `src/main.js`，挂载点 `#game-root`
- 场景组织建议：`Scene` → 分组 `Group` → `Mesh` / `Light` / `Camera`
- 资源加载使用 `THREE.LoadingManager` + `TextureLoader` / `GLTFLoader` 等
- 动画优先 `requestAnimationFrame` 循环；复杂补间可用 `three/examples/jsm/animation/*` 或轻量 tween 库
- 响应式：监听 `resize`，同步更新 `camera.aspect` 与 `renderer.setSize`

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
- `res/gyy.glb` 使用 **Draco 网格压缩**，加载时必须配置 `DRACOLoader`（见 `src/main.js`），否则 GLTFLoader 会静默失败、场景只剩地面
- 2026-06-15：`流动模型` 是沿管道内部路径预留的网格；如果流动 overlay 材质开启 `depthTest`，会被外层不透明管道遮挡，表现为 hover 已触发但完全看不到。流动可视化需要使用叠加/发光材质并关闭深度测试。
