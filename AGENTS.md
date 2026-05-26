# Agent 工作规范

## 代码与文档同步

每次改动代码后，必须同步维护 `README.md` 作为**事实文档（Source of Truth）**。包括但不限于：
- 项目结构变更
- 新增功能、API 或 配置项
- 行为逻辑变更
- 版本号更新

## 提交规范

维护完成后，必须执行**全量提交**到 Git：
```bash
git add .
git commit -m "<描述变更的提交信息>"
```

## 版本号管理

每次完成改动并提交前，必须将当前版本号 **+0.1**（语义化版本 minor 位递增）：

| 文件 | 格式示例 |
|------|---------|
| `package.json` | `"version": "0.6.0"` |
| `README.md` 标题 | `# 卡牌地下城 - 重构版 v0.6` |
| `README.md` 版本历史 | 在版本历史表格中追加一条记录 |

> 版本历史格式：`| v0.6 | YYYY-MM-DD | 变更内容摘要 |`

---

## Unity 迁移友好原则（强制）

本项目 Web 端的终极目标是**让未来的 AI 能零摩擦翻译成 Unity C#**。所有后续开发必须遵守以下三条原则，拒绝任何增加 AI 理解成本的过度设计。

### 原则1：数据置顶（Data on Top）

所有卡牌、敌人、效果、Buff 的定义，必须是**顶层纯对象常量**，不能埋在函数或 DOM 操作里。

```javascript
// ✅ 正确：AI 一眼能看懂，未来直接翻译成 C# ScriptableObject 或 JSON
export const CARDS = {
  fireball: {
    id: 'fireball',
    name: '火球术',
    baseValue: 10,
    keywords: ['grow']
  }
};

// ❌ 错误：数据逻辑耦合在 UI 事件里，AI 找不到
function onCardClick(cardId) {
  if (cardId === 'fireball') {
    enemy.hp -= 10;  // 数据埋在函数里
  }
}
```

### 原则2：效果用"配置+工厂"，不用类继承

**禁止** `class DamageEffect extends CardEffectBase` 这种多态架构。效果必须是纯对象配置 + switch/工厂函数。

```javascript
// ✅ 正确：简单、直接、AI 能秒懂
registerEffect({
  id: 'damage',
  triggers: 'on_play',
  priority: 100,
  condition: (ctx) => ctx.card.keywords.includes('damage'),
  execute: (ctx) => { ctx.target.hp -= ctx.amount; }
});

// ❌ 错误：过度抽象，AI 迁移时要理解继承链
class DamageEffect extends EffectBase {
  execute(ctx) { ... }
}
```

### 原则3：状态保持"JSON 可打印"

战斗状态必须是**纯对象/数组**，禁止用 `Map`、`Set`、`class` 实例。方法抽成纯函数，接收对象作为参数。

```javascript
// ✅ 正确：console.log(state) 就能看全貌
let state = {
  turn: 1,
  player: { hp: 50, maxHp: 60, buffs: [] },
  hand: [{ id: 'fireball', baseValue: 10 }]
};

// ❌ 错误：包含 class 实例、Map、闭包，AI 无法迁移
class CombatState {
  constructor() {
    this.player = new PlayerEntity();
    this.enemies = new Map();
  }
}
```

### 禁止清单

| 禁止项 | 原因 |
|-------|------|
| ❌ 拆 package / 拆 repo | 增加构建复杂度，无此需求 |
| ❌ 引入 TypeScript | 增加编译步骤，vibe coding 变慢 |
| ❌ 引入 Luban / Excel 配表 | 策划不用 Excel，Obsidian 就是源数据 |
| ❌ 引入 JSON Schema 校验 | 增加维护负担，AI 生成代码时自然会校验 |
| ❌ 写单元测试框架 | 先保证能玩，测试靠 playtest |
| ❌ 引入 Redux / XState 等状态管理库 | 回合制卡牌用 async/await 足够 |
| ❌ 搞 Command 模式 / 事件溯源 | 过度抽象，增加 AI 理解成本 |
| ❌ 把效果系统搞成类继承 + 多态 | switch 工厂对 AI 更友好 |

> **核心洞察**：AI 迁移 Unity 时，最需要的不是"完美的跨平台架构"，而是**清晰、集中、无歧义的代码**。

---