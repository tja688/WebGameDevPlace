# 2026-06-15 — 加载 gyy.glb 模型

## 本轮需求

启动网页，将 `res/gyy.glb` 放入 Three.js 场景并运行。

## 设计方案

- 使用 `GLTFLoader` + Vite `?url` 导入模型
- 配置 `OrbitControls` 支持拖拽旋转/缩放查看
- 按包围盒自动缩放、落地、相机取景
- 若模型含动画，用 `AnimationMixer` 自动播放全部 clip

## 实现要点

- `gyy.glb` 含 Draco 压缩，必须 `loader.setDRACOLoader(dracoLoader)`
- Draco 解码器使用 Google CDN：`gstatic.com/draco/versioned/decoders/1.5.7/`
- 开发服务器：`npm run dev` → http://127.0.0.1:5174/

## 遇到的问题及解决

- **模型不显示**：GLB 使用 Draco 压缩，未配置 `DRACOLoader` 时解析失败；补上后即可正常显示。

## 文件变更清单

| 文件 | 变更 |
|------|------|
| `src/main.js` | GLTF/Draco 加载、取景、轨道控制、动画播放 |
| `AGENTS.md` | 记录 gyy.glb Draco 坑点 |
