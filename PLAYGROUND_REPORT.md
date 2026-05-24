# 卡牌地下城 Playground 实现报告

> 版本：v3.0 | 日期：2026-05-24

---

## 一、实现概述

本次更新落地了**词条效果 Playground**（Phase 1+2），目标解决"体量上去后效果测试乏力"和"AI实现与设计期望不一致"两大痛点。

核心交付物：
- **场景执行引擎**：纯逻辑，浏览器/Node通用，直接调用生产代码
- **18个预设场景**：覆盖全部11种词条 + 边界组合
- **LocalStorage覆盖层**：改数→保存→即时生效→跨会话保留
- **DOM编辑面板**：场景选择、JSON编辑器、导入/导出
- **AI Playtest Harness**：`window.AITest` 批量验证API
- **Canvas简化渲染**：牌桌+手牌可视化

---

## 二、架构说明

```
js/playground/
├── index.js              # 入口：状态管理、screen切换、全局暴露
├── scenario-engine.js    # 场景执行引擎（核心，零DOM依赖）
├── scenario-data.js      # 18个预设场景（JSON可序列化）
├── local-storage.js      # LocalStorage读写 + JSON导入导出
├── ui-controller.js      # DOM面板：编辑器、按钮、结果展示
├── renderer.js           # Canvas绘制：菜单 + 简化牌桌
└── ai-harness.js         # AI Playtest Harness API
```

### 关键设计决策

| 决策 | 说明 |
|------|------|
| **零重复实现** | 所有效果调用原版 `playCardToSlot` / `FX.fire` / `getCardFinalValue`，绝不写第二份 |
| **引擎纯逻辑** | `scenario-engine.js` 不引用任何DOM/Canvas/Audio，Node.js可直接运行 |
| **JSON场景格式** | 场景对象完全可序列化，支持导出为文件、保存到localStorage、AI生成 |
| **批量式API优先** | AI Harness 设计为"JSON-in / JSON-out"，浏览器控制台只是可选入口 |
| **向后兼容** | 不修改任何现有效果处理器，只新增Playground文件 |

---

## 三、已验证场景（18个 / 18个通过）

| # | 场景ID | 词条 | 测试点 |
|---|--------|------|--------|
| 1 | `mighty_basic` | 伟力 | 5→10触发 |
| 2 | `mighty_not_trigger` | 伟力 | 场上有更大点数时不触发 |
| 3 | `echo_chain` | 回响+连携 | ON_PLAY效果触发2次，抽2张 |
| 4 | `echo_grow` | 回响+成长 | 成长触发2次，永久+2 |
| 5 | `twin_no_twin` | 双生 | 复制体去除双生词条 |
| 6 | `chain_basic` | 连携 | 抽1张 |
| 7 | `chain_2` | 连携2 | 抽2张 |
| 8 | `spread_draw` | 蔓延 | 加入0点扩散牌 |
| 9 | `grow_basic` | 成长 | 永久+1 |
| 10 | `grow_2` | 成长2 | 永久+2 |
| 11 | `dedicate_half` | 奉献 | 8→下一张+4（向下取整） |
| 12 | `devotion_stacking` | 奉献+堆叠 | 多张奉献顺序触发，连锁加成 |
| 13 | `social_adjacent` | 合群 | 相邻格2张→+2 |
| 14 | `unison_same_slot` | 齐心 | 同格3张→+3 |
| 15 | `retain_hand` | 保留 | 回合结束保留在手牌 |
| 16 | `remain_stay` | 留场 | 回合结束不移入弃牌堆 |
| 17 | `mighty_vs_penalty` | 伟力+惩罚 | 优先级导致的执行顺序差异 |
| 18 | `social_unison_combo` | 合群+齐心 | 同一张牌同时获得两种加成 |

---

## 四、发现的设计与实现差异

Playground 的核心价值之一就是**暴露设计与实现的不一致**。本次验证发现2处：

### 差异1：奉献bonus基于当前值而非原始值

**场景**：`devotion_stacking`

**现象**：奉献A（6点）先打出 → 奉献B（10点）打出，获得A的+3 → 奉献B当前值13 → 测试牌打出，获得B的 floor(13/2)=6，而非 floor(10/2)=5。

**根因**：`js/effects/play.js` 中奉献效果使用 `ctx.getCardBaseValue(c)`，包含了 `tempBonus`。

```javascript
const val = ctx.getCardBaseValue(c);  // 含 tempBonus
const bonus = Math.floor(val / 2);
```

**设计文档**："下一张打出在本牌所在倍率格的卡牌获得本牌一半的点数"

**结论**：当前代码行为与文字描述存在歧义。如需修正，应将 `getCardBaseValue` 改为 `c.baseValue + c.permanentBonus`（排除临时加成）。

### 差异2：伟力优先级高于怪物惩罚

**场景**：`mighty_vs_penalty`

**现象**：hard_skin（左右格-1）与伟力同时作用于同一张牌时，先翻倍(5→10)再惩罚(10→9)，而非先惩罚(5→4)再翻倍(4→8)。

**根因**：`js/effects/calc.js` 中优先级设置：
```javascript
Priority.VALUE_MIGHTY = 400;
Priority.VALUE_PENALTY = 500;
```
数值小的先执行。

**结论**：这是明确的优先级设计选择。如需"先惩罚再翻倍"，应将 `VALUE_PENALTY` 调至 `VALUE_MIGHTY` 之前。

---

## 五、使用指南

### 5.1 人工使用（浏览器）

1. 启动游戏，主菜单点击 "🧪 Playground"
2. 选择 "🃏 词条效果测试"
3. 在场景下拉框选择要测试的场景
4. 点击 "▶ 运行测试" 查看结果
5. 在JSON编辑器中修改参数 → "💾 保存到本地" → 再次运行
6. "📤 导出JSON" / "📥 导入JSON" 分享场景

### 5.2 AI使用（浏览器控制台）

```javascript
// 运行单个场景
await AITest.run('mighty_basic');

// 运行全部场景
await AITest.runAll();

// 运行AI自定义场景
await AITest.runCustom({
    id: 'ai_test_1',
    name: 'AI测试',
    setup: { /* ... */ },
    actions: [ /* ... */ ],
    assertions: [ /* ... */ ]
});

// 快速验证
AITest.quickTest({
    cardName: '测试牌',
    baseValue: 10,
    keywords: ['mighty'],
    actions: [{ type: 'play', handIndex: 0, slotIndex: 1 }]
});

// 生成完整报告
const report = await AITest.report();
console.table(report.details);
```

### 5.3 Node.js 使用

```bash
# 运行预设场景验证
node test_playground.js

# 未来可扩展：包装为正式测试脚本
```

---

## 六、后续开发指导

### 6.1 添加新的Playground类型（如商店、铁匠铺）

1. 在 `js/playground/index.js` 的 menu 中新增按钮
2. 创建 `scenario-data-shop.js` / `scenario-data-blacksmith.js`
3. 在 `scenario-engine.js` 的 `executeAction` 中新增动作类型（如 `buy`、`upgrade`）
4. 在 `renderer.js` 中新增绘制分支
5. 在 `ui-controller.js` 中新增场景分类显示

### 6.2 添加新的测试场景

编辑 `js/playground/scenario-data.js`，按以下格式添加：

```javascript
{
    id: 'your_scene_id',
    name: '场景名称',
    category: 'keyword',
    description: '场景说明',
    setup: {
        player: { hearts: 4, maxHearts: 4 },
        monster: { hp: 100, maxHp: 100 },
        slots: [
            { index: 0, multiplier: 1, cards: [] },
            { index: 1, multiplier: 1, cards: [] },
            { index: 2, multiplier: 1, cards: [] }
        ],
        hand: [
            { template: 'card_def_id', baseValue: 10, keywords: ['mighty'] }
        ],
        deck: [],
        discard: []
    },
    actions: [
        { type: 'play', handIndex: 0, slotIndex: 1 }
    ],
    assertions: [
        { path: 'slots[1].cards[0].finalValue', expected: 20, desc: '期望说明' }
    ]
}
```

**动作类型**：
- `play`：打出卡牌，`handIndex` + `slotIndex`（或 `cardUuid` + `slotIndex`）
- `endTurn`：结束回合
- `draw`：抽牌，`count`

**断言路径**：
- 支持对象路径如 `slots[0].cards[0].finalValue`
- `.finalValue` 后缀会自动调用 `getCardFinalValue` 计算
- 运算符：`eq`（默认）、`gt`、`gte`、`lt`、`lte`、`contains`、`notEq`

### 6.3 扩展JSON配置覆盖

当前 `local-storage.js` 以 `card_dungeon_playground_scenarios` 为 key 存储。

如需添加新的配置维度（如"商店价格倍率"、"事件概率"），建议：
1. 新增 key，如 `card_dungeon_playground_config`
2. 在 `local-storage.js` 中新增读写函数
3. 在 `ui-controller.js` 中新增配置面板

### 6.4 扩展AI Harness

在 `js/playground/ai-harness.js` 的 `AITest` 对象中添加新方法：

```javascript
async runMonsterTest(monsterId, scenarioSetup) {
    // 实现...
}
```

所有方法应保持 **JSON-in / JSON-out** 的契约，不依赖DOM。

---

## 七、文件变更清单

### 新建文件（8个）
- `js/playground/index.js`
- `js/playground/scenario-engine.js`
- `js/playground/scenario-data.js`
- `js/playground/local-storage.js`
- `js/playground/ui-controller.js`
- `js/playground/renderer.js`
- `js/playground/ai-harness.js`
- `test_playground.js`
- `PLAYGROUND_REPORT.md`

### 修改文件（5个）
- `index.html` — 添加Playground按钮、DOM UI层
- `js/main.js` — 导入Playground、初始化UI、BGM处理
- `js/render/renderer.js` — 添加 `playground` screen分支
- `js/input/index.js` — 添加Playground输入处理
- `package.json` — 版本号 2.2.0 → 3.0.0
- `README.md` — 标题和版本历史更新

---

> 如需进一步扩展Playground系统，建议从 `js/playground/scenario-engine.js` 开始阅读，这是整个系统的核心引擎。
