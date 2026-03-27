# Web Game Dev Place

一个本地开发优先的 Web 游戏实验平台。它不是单个游戏，而是一个用于快速验证玩法、演出、交互和技术方案的 playground / play test 底座。

## 快速开始

```bash
npm install
npm run dev
```

## 技术栈

- React 负责平台壳层、路由、工具面板和调试 UI
- Vite 负责本地开发与构建
- Phaser 3 适合 2D 游戏玩法原型
- PixiJS 适合 2D 渲染、特效和展示型 demo
- Three.js 适合 3D 场景、相机、模型和空间交互
- Babylon.js 适合完整 3D 引擎型原型和更重的 3D 交互场景

## 核心约定

- 平台层支持多个 runtime
- 单个 playground 只允许一个主 runtime
- 不用长期分支区分玩法，main 保持干净、可运行、可维护
- 分支只用于短期开发过程
- 不强行统一引擎 API，只统一平台生命周期和公共能力

## 平台分层

- `app/`：React 平台壳层，负责列表、路由、参数面板、日志和调试入口
- `platform/`：runtime 适配层和公共能力层，统一 mount、unmount、resize、pause、resume、destroy
- `playgrounds/`：具体实验单元，每个文件夹对应一个独立 playground
- `templates/`：新实验的基模，优先从模板拉起，而不是从零搭建

## 每个 Playground 的规则

- 每个 playground 有唯一 id、标题、描述、主 runtime、入口和资源目录
- 每个 playground 内部保持收敛，不随意混用 Phaser、Pixi、Three 或 Babylon
- 2D 游戏玩法优先 Phaser
- 2D 渲染和特效优先 PixiJS
- 3D 场景优先 Three.js 或 Babylon.js，按实验目标选择其一

## 目录建议

```txt
src/
  app/
  platform/
  playgrounds/
  templates/
```

## 当前最小落地目标

- React 壳层跑通
- playground 列表页
- runtime adapter 基础接口
- Phaser adapter 先接通
- 至少 1 到 2 个 playground 示例
- 最小版 debug overlay
- playground 注册机制

## 仓库状态

当前仓库已经预装：

- PixiJS
- Phaser 3
- Three.js
- Babylon.js
- Vite
- React
- TypeScript

