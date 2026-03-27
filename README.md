# Web Game Dev Place

Web 游戏开发基础设施仓库，预装了：

- PixiJS
- Phaser 3
- Three.js
- Babylon.js
- Vite
- React
- TypeScript

## 快速开始

```bash
npm install
npm run dev
```

## 结构

- `src/App.tsx`：当前的启动页和引擎总览
- `src/engineCatalog.ts`：引擎信息与后续扩展入口
- `src/styles.css`：全局样式

## 后续建议

- 如果要做单个引擎 demo，可以在 `src/engines/` 下按引擎拆分
- 如果要做多场景路由，可以再接 `react-router`
- 如果要加状态管理或资源加载管线，可以再补 `zustand`、`howler`、`vite-plugin-glsl` 之类的工具

