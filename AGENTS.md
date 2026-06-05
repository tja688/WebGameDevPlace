# 深入地牢 — Agent 开发规范

## 项目基本信息

- **引擎**：Phaser 4.1.0
- **类型**：文字风格 Roguelike 卡牌冒险游戏
- **构建工具**：Vite 6
- **入口文件**：`src/main.js`
- **HTML**：`index.html`

## 必读文档

**每次开发前，必须先阅读 `开发文档.md`**，了解：
- 项目架构与目录结构
- 卡牌对象格式
- 色卡配置
- 状态管理方式
- 扩展指南

开发过程中持续维护 `开发文档.md`，确保其与代码保持一致。

## 开发规范

### 代码风格

- 使用 ES Modules（`import/export`）
- 场景类继承 `Phaser.Scene`，构造函数中调用 `super('SceneName')`
- 纯文字渲染，禁止引入图片资源
- 颜色统一使用 `src/config.js` 中定义的色卡
- 尽量使用phaser4原生功能，能不造轮子就绝对不引入额外复杂度

### 文件组织

- 数据定义放在 `src/data/` 目录
- 游戏核心逻辑放在 `src/core/` 目录
- 场景放在 `src/scenes/` 目录
- UI 辅助组件放在 `src/ui/` 目录（如有新增）
- 音频放在 `src/audio/` 目录
- 工具函数放在 `src/utils/` 目录

### Phaser 4 注意事项

- C:\Users\jinji\Documents\GitHub\WebGameDevPlace\node_modules\phaser\skills 开始前需阅读skills目录，根据自己的开发任务挑选合适的skill

### 状态管理

- 场景间通过 `this.scene.start('SceneName', { state })` 传递状态
- 不要直接修改其他场景的状态
- 存档使用 `localStorage`，通过 `src/core/gameState.js` 中的 `saveGame/loadGame`

## 提交规范

**每次开发完成后，必须进行全量 git 提交：**

```bash
git add -A
git commit -m "描述本次修改内容"
```

禁止只提交部分文件。确保工作区干净后再结束任务。
