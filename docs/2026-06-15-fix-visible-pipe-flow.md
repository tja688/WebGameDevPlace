# 2026-06-15 — 修复管道流动效果不可见

## 本轮需求

分析上一版“悬停触发管道流动效果”完全看不到的原因，并修复为可见的流动视觉效果。

## 设计方案

- 继续复用 GLB 内置的 `流动模型`，让效果沿模型作者预留的路径几何显示。
- 将流动 overlay 改为发光叠加材质，关闭深度测试，避免被外层不透明管道遮挡。
- 使用 `流动模型` 的本地包围盒计算进度，不再依赖硬编码的坐标范围。
- 增加同路径的亮点粒子层与高亮边线层，鼠标悬停时随流线一起淡入并沿路径脉冲。

## 实现要点

- `src/flowEffect.js` 新增 `getFlowBounds`，基于 `流动模型` 的 geometry bounding box 得到动画归一化范围。
- `createFlowMaterial` 改为 cyan/white 发光 shader，使用 UV 与高度进度叠加生成移动条纹。
- 新增 `createSparkMaterial`，用 `THREE.Points` 复用流动网格顶点生成可见的脉冲光点。
- 额外使用 `EdgesGeometry` 生成高亮路径边线，确保流动模型即使位于管道内部也有清晰轮廓。
- overlay、粒子、边线均挂到 `modelRoot` 下，并从原流动网格复制世界变换，避免受 GLB 辅助组可见性影响。
- overlay、粒子、边线均设置 `depthTest: false`、`AdditiveBlending`、较高 `renderOrder`，保证在悬停时肉眼可见。

## 遇到的问题及解决

- 上一版 `depthTest: true` 会让内部流动几何被实体管道遮挡，因此即使 hover 生效也几乎不可见。
- 上一版使用固定 `position.y` 范围，后续模型替换或缩放前的局部坐标变化会让条纹进度失真；改为从几何本身计算范围。

## 文件变更清单

| 文件 | 变更 |
|------|------|
| `src/flowEffect.js` | 修复流动层可见性，新增包围盒归一化、亮点粒子层与高亮边线层 |
| `docs/2026-06-15-fix-visible-pipe-flow.md` | 新增本轮开发记录 |
| `AGENTS.md` | 追加流动模型可见性坑点 |
