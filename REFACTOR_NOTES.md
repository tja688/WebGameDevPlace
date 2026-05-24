# 重构记录：超出二版设计文档的实现

> 本文档记录当前代码中超出 `C:\Users\jinji\Desktop\文档\MyNote\游戏开发项目\卡牌地下城\第二版设计` 范围的实现，
> 用于重构后逐项核对，确保功能不丢失。

---

## 1. AI Playground / 测试场系统（设计文档未提及）

**路径**：`js/playground/`

| 文件 | 功能 |
|------|------|
| `ai-harness.js` | AI 后门 API：`AITest.run()`、`AITest.runAll()`、`AITest.report()` |
| `scenario-engine.js` | 场景执行引擎，纯逻辑无 DOM |
| `scenario-data.js` | 18 个预设测试场景，覆盖 11 种词条及边界组合 |
| `index.js` | Playground 入口：词条沙盒、对战测试场 |
| `renderer.js` | Playground Canvas 渲染 |
| `ui-controller.js` | Playground DOM 面板控制 |
| `local-storage.js` | 自定义场景本地持久化 |

**必须保留**：AI Harness 是 AI 后门核心，重构后必须通过 `await AITest.runAll()` 验证。

---

## 2. 自动测试与调试后门（设计文档未提及）

**路径**：`js/autotest.js`

- 调试面板（DOM）：自动出牌、作弊手牌、秒杀怪物、回满生命、重置战斗
- 控制台全局命令：`godMode()`、`fullHand()`、`setMonsterHp()`、`simulateBattles()`

**必须保留**：全部保留，用于开发调试。

---

## 3. 数据覆盖系统（设计文档未提及）

**路径**：`js/data/index.js`（`applyDataOverrides` 等）

- `localStorage` key：`card_dungeon_data_overrides`
- 支持在 Playground 参数配置面板中实时修改卡牌/怪物数值
- 覆盖会持久化到浏览器会话间

**必须保留**：Playground 参数面板依赖此系统。

---

## 4. 衍生牌系统（设计文档未提及）

**路径**：多处

- 卡牌实例有 `isDerived` 字段
- 双生、蔓延生成的卡牌标记为衍生牌
- 战后结算、Playground 重置时过滤 `isDerived` 卡牌，不进入永久牌组

**必须保留**：防止衍生牌污染牌组。

---

## 5. 装备效果占位体系（设计文档有装备，但效果未实装）

**路径**：`js/data/relics.js`

- 定义了 `effect` 字段（如 `first_card_bonus`、`deck_bonus`、`slot_bonus` 等）
- **当前战斗中仅 `extraMultiplier` 实际生效**，其他装备效果为**占位**
- BOSS 装备带负面效果（龙心、龙骨、龙眼）

**重构后状态**：保持占位结构不变，未来 Unity 迁移时可按 `effect` 字段翻译。

---

## 6. 事件系统扩展（设计文档较简单）

**路径**：`js/systems/post-battle.js`、`js/input/index.js`

- 常见/稀有/传说三级事件池
- 具体效果：加金币、随机计策强化、卡牌强化、自助铁匠、三选一卡牌、赌局、复制卡牌、移除换金币、伟力附魔、成长附魔、打怪/打精英、最大人群+1、出土装备等
- 事件战斗（`_eventBattle`）与主线战斗状态隔离

**必须保留**：全部保留。

---

## 7. 查看牌组功能（v3.6 新增，设计文档未提及）

**路径**：`js/input/index.js`、`js/render/screens.js`

- 战斗中按 V 键或点击按钮查看当前牌组
- 牌组视图支持滚动、悬停提示
- 覆盖战斗/地图/商店/事件/战后等全部流程界面

**必须保留**：玩家刚需功能。

---

## 8. 闪避机制具体实现

**路径**：`js/systems/battle.js`

- 设计文档仅说"前2点伤害无效"
- 当前实现：每回合受到的前 2 点伤害从总伤害中扣除（`totalDmg = max(0, totalDmg - 2)`）

**必须保留**：具体数值实现。

---

## 9. BGM / 音频系统（设计文档未提及）

**路径**：`js/audio.js`

- 战斗 BGM、BOSS BGM、平时 BGM
- 卡牌放置、抽卡、伤害、胜利等音效
- 音量滑块控制

**必须保留**：游戏体验核心。

---

## 10. Canvas 渲染特效（设计文档未提及）

**路径**：`js/render/fx.js`

- 屏幕震动（screen shake）
- 伤害数字飘字
- 卡牌放置火花
- 胜利特效、心碎的特效
- 抽卡动画（延迟错峰、旋转）

**必须保留**：视觉反馈核心。

---

## 11. 训练体系专属效果（设计文档未单独定义）

**路径**：`js/effects/core.js`（`calculateGrowAmount`）、`js/effects/play.js`

- 训练痕迹：相邻倍率格成长效果多触发一次
- 猛训练：同倍率格成长效果多触发一次
- 集体训练：后续同格卡牌获得成长2

**必须保留**：训练体系卡牌的核心机制。

---

## 12. 多职业架构（设计文档仅老兵）

**路径**：`js/data/classes.js`、`js/core/state.js`

- 当前仅开放老兵，但 `CLASS_DEFS` 为字典结构，支持多职业扩展
- `createRunData(classId)` 接收职业 ID

**必须保留**：扩展性架构。

---

## 13. 战后流程的商店/铁匠费用追踪（设计文档未提及细节）

**路径**：`js/core/state.js`（`createRunData`）

- `shopUpgradeCosts`：每张卡牌独立强化费用
- `shopRemoveCost`：删牌费用每次翻倍
- `shopRefreshCost`：刷新费用递增
- `blacksmithSlotCosts`：格子升级费用累积
- `blacksmithFirstEnchantFree`：新人福利
- `firstBlacksmithRefreshFree`：首次刷新免费

**必须保留**：经济平衡核心。

---

## 14. 控制台全局暴露（设计文档未提及）

**路径**：`js/main.js`、`js/autotest.js`、`js/playground/ai-harness.js`

- `window.gameState`
- `window.AITest`
- `window.AutoTest`
- `window.Playground`
- `window.restartGame()`
- `window.GameAudio`、`window.RenderFX`

**必须保留**：AI 和调试入口。

---

## 15. 版本号与存档兼容

**路径**：`js/core/state.js`

- 内部变量沿用 `relic` 命名以保持存档结构稳定（README 中说明）
- `runData` 中保留兼容旧存档的字段（如 `shopUpgradeCost`）

**必须保留**：向后兼容。
