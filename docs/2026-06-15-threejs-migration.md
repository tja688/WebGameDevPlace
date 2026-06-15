# 2026-06-15 — 迁移至 Three.js

## 本轮需求

清理原有 Phaser 4 脚手架，将项目渲染基础切换为 Three.js。

## 设计方案

- 依赖：`phaser` → `three`，保留 Vite 构建链
- 入口：`src/main.js` 初始化 `Scene` / `PerspectiveCamera` / `WebGLRenderer`
- 画布全屏自适应，`resize` 时更新相机与渲染尺寸
- 视觉沿用项目配色：背景 `#15181b`、主色 `#f5c86a`

## 实现要点

- `index.html` 增加全屏样式，挂载点仍为 `#game-root`
- 启动场景：环境光 + 方向光、旋转金色立方体 + 地面，作为可运行的最小验证
- `AGENTS.md` 将 Phaser 4 技能指引替换为 Three.js 开发约定

## 遇到的问题及解决

- 无阻塞问题；Phaser 仅有一个 BootScene 占位，可直接整体替换。

## 文件变更清单

| 文件 | 变更 |
|------|------|
| `package.json` | 移除 phaser，添加 three |
| `src/main.js` | 重写为 Three.js 启动模板 |
| `index.html` | 标题与全屏样式 |
| `AGENTS.md` | 更新 agent 指引 |
