export type EngineCard = {
  name: string;
  packageName: string;
  focus: string;
  description: string;
  accent: string;
};

export const engineCatalog: EngineCard[] = [
  {
    name: 'PixiJS',
    packageName: 'pixi.js',
    focus: '2D renderer',
    description: '适合高性能精灵、UI、粒子效果和轻量级 2D 场景。',
    accent: '#ff8a5b',
  },
  {
    name: 'Phaser 3',
    packageName: 'phaser',
    focus: '2D game framework',
    description: '包含场景、输入、动画、物理与资产管理，适合完整玩法开发。',
    accent: '#8dd26d',
  },
  {
    name: 'Three.js',
    packageName: 'three',
    focus: '3D rendering',
    description: '用于自定义 3D 场景、模型展示、灯光材质和后处理效果。',
    accent: '#7dc9ff',
  },
  {
    name: 'Babylon.js',
    packageName: '@babylonjs/core',
    focus: '3D engine',
    description: '偏完整引擎能力，适合复杂 3D 交互、资产管线和实时渲染。',
    accent: '#c58cff',
  },
];

export const stackHighlights = [
  'Vite 快速启动和热更新',
  'React 作为控制台 / 工具层',
  'TypeScript 严格模式',
  '按引擎拆分的可扩展目录',
];

