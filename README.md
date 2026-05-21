# 卡牌地下城 - 重构版 v0.7

> 纯前端网页游戏 | 卡牌构筑 + 倍率牌桌（类Balatro）+ Rogue-lite爬塔

---

## 🚀 快速开始

### 环境要求
- 现代浏览器（Chrome/Firefox/Edge），支持 ES6 Modules 和 Canvas 2D
- Node.js 16+（用于运行测试和本地服务器）

### 运行方式

由于项目使用 ES6 Modules，`index.html` 必须通过 **HTTP 服务器** 访问，不能直接 `file://` 打开。

**Windows 用户可直接双击 `dev.bat` 一键启动（含服务器、测试、模拟选项）**

`dev.bat` 会自动切换到项目目录、检查 Node.js、检测 8080 端口占用；如果本地服务器已在运行，会直接打开 `http://localhost:8080`。

```bash
# 方式1：使用项目自带的 Node.js 服务器
node serve.js
# 然后访问 http://localhost:8080

# 方式2：使用 npx（无需安装）
npx serve .

# 方式3：Python 3
python -m http.server 8080

# 方式4：VS Code Live Server 插件
```

### 测试

```bash
# 运行完整测试（引擎断言 + 渲染回归）
npm test

# 单独运行引擎测试
npm run test:engine

# 单独运行非战斗界面渲染回归测试
npm run test:render

# 运行胜率模拟
npm run simulate
# 或
node test_simulate.js
```

---

## 📁 项目结构

```
WebGameDevPlace/
├── index.html              # 入口：DOM容器、Canvas、调试面板
├── css/style.css           # 暗色主题、UI覆盖层
├── serve.js                # Node.js 静态文件服务器（绑定 127.0.0.1，支持查询串 URL）
├── dev.bat                 # Windows 本地开发菜单（服务器、测试、模拟）
├── package.json            # 项目配置（type: module）
├── test_engine.js          # 引擎单元测试
├── test_render_screens.js  # 非战斗界面渲染回归测试
├── test_simulate.js        # 自动战斗胜率模拟
├── js/
│   ├── main.js             # 主入口、游戏循环、快捷键
│   ├── autotest.js         # 调试面板、自动出牌、控制台指令
│   ├── audio.js            # Web Audio API 合成音效
│   │
│   ├── core/               # 🏗️ 基础设施层
│   │   ├── utils.js        # 工具函数（UUID、洗牌、颜色处理等）
│   │   ├── constants.js    # 全局常量、触发时机枚举、优先级枚举
│   │   ├── state.js        # 状态机、RunData、战斗状态创建
│   │   └── battle-core.js  # 战斗基础工具（抽牌、日志、提示）
│   │
│   ├── data/               # 📦 数据层（纯静态数据定义）
│   │   ├── index.js        # 数据统一入口：卡牌实例工厂、牌组创建
│   │   ├── keywords.js     # 关键词定义（名称、描述、颜色）
│   │   ├── cards.js        # 卡牌定义（CARD_DEFS、奖励卡池）
│   │   ├── monsters.js     # 怪物定义、颜色主题
│   │   ├── classes.js      # 职业定义、初始牌组
│   │   ├── stages.js       # 关卡配置
│   │   ├── relics.js       # 遗物与事件数据
│   │   └── shop.js         # 商店库存生成
│   │
│   ├── effects/            # ⚡ 效果系统（重构核心）
│   │   ├── index.js        # 效果系统统一入口（导入即注册所有效果）
│   │   ├── core.js         # EffectSystem, EffectContext, EffectHandler
│   │   ├── play.js         # ON_PLAY 效果（打出时触发）
│   │   ├── calc.js         # ON_CALC_VALUE / ON_CALC_FINAL（数值计算）
│   │   ├── turn.js         # ON_TURN_START / ON_TURN_END（回合效果）
│   │   ├── exit.js         # ON_EXIT（离场效果）
│   │   └── slot.js         # ON_SLOT_CALC（格子倍率计算）
│   │
│   ├── systems/            # 🎮 游戏系统层
│   │   ├── battle.js       # 战斗流程：initBattleFromRun, endTurn
│   │   ├── board.js        # 牌桌逻辑：playCardToSlot, 伤害计算, 放置规则
│   │   ├── shop.js         # 商店库存管理
│   │   └── post-battle.js  # 战后结算、奖励生成
│   │
│   ├── render/             # 🎨 渲染层
│   │   ├── core.js         # 基础绘制工具（背景、圆角矩形、文字换行）
│   │   ├── battle.js       # 战斗界面渲染（怪物、牌桌、手牌、UI）
│   │   ├── screens.js      # 所有非战斗界面（标题、地图、商店等）
│   │   └── renderer.js     # 主渲染器入口、屏幕分发
│   │
│   └── input/              # 🖱️ 输入层
│       └── index.js        # 输入处理核心 + 所有界面点击/悬停逻辑
```

---

## 🏛️ 架构核心：效果系统

### 为什么重构效果系统？

旧架构中，所有卡牌效果硬编码在 `engine.js` 的 `playCardToSlot()` 函数里，形成一段**14步的顺序结算代码**。每新增一张有特殊效果的卡牌，都要：
1. 在 `playCardToSlot()` 里增加一个 `if` 分支
2. 手动确定这个效果在14步中的位置
3. 修改伤害计算公式以支持新逻辑

这种设计导致：
- ❌ 效果之间高度耦合，互相影响难以追踪
- ❌ 新增卡牌需要深入修改核心战斗代码
- ❌ 相同关键词的不同卡牌可能有完全不同的处理路径
- ❌ 数值计算链（effective → final）与效果逻辑纠缠不清

### 新架构：基于触发时机的效果系统

**核心思想**：将所有卡牌效果抽象为 **"触发时机(Trigger) + 效果处理器(Handler)"** 的插件模型。

```
卡牌打出 → 创建 EffectContext → FX.fire(ON_PLAY, ctx)
              ↓
    按优先级排序，遍历所有注册的 ON_PLAY 处理器
              ↓
    每个处理器检查 condition → 执行 execute(ctx)
              ↓
    ctx 中包含 state/card/slotIndex 等全部上下文，处理器通过 ctx 读写状态
```

#### 触发时机（Triggers）

| 触发时机 | 触发时机点 | 典型效果 |
|---|---|---|
| `ON_PLAY` | 卡牌打出到格子后 | 生长、征收、吞噬、奉献、抽牌等 |
| `ON_CALC_VALUE` | 计算卡牌**有效点数**时（光环加成阶段） | 佯攻+2、磨练技巧+4、训练纲领+N |
| `ON_CALC_FINAL` | 计算卡牌**最终点数**时（翻倍/惩罚阶段） | 伟力翻倍、硬质皮肤-1 |
| `ON_TURN_START` | 回合开始时 | 留场牌获得堆叠 |
| `ON_TURN_END` | 回合结束时 | 救兵自动打出 |
| `ON_EXIT` | 卡牌离开牌桌时 | 再训练给相邻牌复用、加练给留场 |
| `ON_SLOT_CALC` | 计算格子倍率时 | 完美境界给相邻格+1倍率 |

#### 优先级（Priority）

同一触发时机下，多个效果按 `priority` 数值**从小到大**依次执行：

```javascript
Priority = {
    SLOT_MODIFIER: 100,   // 格子倍率修改（保养装备、完美境界）
    VALUE_AURA: 200,      // 驻场光环加点数（佯攻、磨练技巧）
    VALUE_BONUS: 300,     // 临时/永久加成（奉献、团结、叠叠乐）
    VALUE_MIGHTY: 400,    // 伟力翻倍
    VALUE_PENALTY: 500,   // 惩罚（硬质皮肤）
    DRAW: 600,            // 抽牌（理清头绪、忆往昔）
    GROW: 700,            // 生长
    SPECIAL: 800,         // 特殊效果（训练痕迹连锁、炫耀肌肉）
    CLEANUP: 900,         // 清理（灵动进入弃牌堆）
};
```

#### EffectContext（效果上下文）

每次触发效果时传递的上下文对象，包含效果执行所需的全部信息：

```javascript
const ctx = new EffectContext({
    state,        // 当前游戏状态
    trigger,      // 触发时机
    card,         // 当前触发效果的卡牌
    slotIndex,    // 当前格子索引
    targetCard,   // 目标卡牌（如给相邻牌加点数）
    targetSlotIndex,
    amount,       // 通用数值参数
    value,        // 计算链中的当前数值（可被修改）
    extra: {}     // 扩展字段
});
```

常用辅助方法：
- `ctx.log(msg)` - 记录战斗日志
- `ctx.getCardSlotIndex(card)` - 查找卡牌所在格子
- `ctx.getCardBaseValue(card)` - 获取卡牌基础值
- `ctx.getBoardCards()` - 获取所有在牌桌上的卡牌
- `ctx.getAdjacentSlots(index)` - 获取相邻格子
- `ctx.getTopCard(slotIndex)` - 获取某格最上方的卡牌

---

## 🛠️ 开发者指南：如何扩展

### 1. 新增一个关键词效果

假设你要新增关键词 **爆发(burst)**：打出时，如果本回合已打出3张牌，此牌点数+5。

**步骤1**：在 `js/data/keywords.js` 中定义关键词：

```javascript
burst: {
    name: '爆发',
    desc: '本回合已打出3张牌时，该卡牌点数+5',
    color: '#FF4500'
}
```

**步骤2**：在 `js/effects/play.js` 中注册效果处理器：

```javascript
import { EffectHandler, FX } from './core.js';
import { Trigger, Priority } from '../core/constants.js';

FX.register(new EffectHandler({
    id: 'burst',
    triggers: Trigger.ON_PLAY,
    priority: Priority.VALUE_BONUS,
    condition: (ctx) => ctx.card.keywords.includes('burst'),
    execute: (ctx) => {
        // 统计本回合已打出的牌数
        const playedThisTurn = ctx.getBoardCards().filter(c => c.hasBeenPlayed).length;
        if (playedThisTurn >= 3) {
            ctx.card.tempBonus = (ctx.card.tempBonus || 0) + 5;
            ctx.log(`${ctx.card.name} 爆发！本回合点数+5`);
        }
    }
}));
```

> 无需修改 `playCardToSlot()`！效果系统会自动在合适的时机调用你的处理器。

**步骤3**：在卡牌定义中使用该关键词：

```javascript
// js/data/cards.js
my_new_card: {
    id: 'my_new_card',
    name: '我的新卡',
    baseValue: 3,
    size: 1,
    keywords: ['burst', 'grow'],
    rarity: 'blue',
    description: '爆发：本回合已打出3张牌时+5；生长：每次打出后永久+1',
    color: '#FF4500',
    accentColor: '#FF6347',
    iconType: 'fire'
}
```

### 2. 新增一个卡牌专属效果（无关键词）

假设某张特殊卡牌的效果不是通用关键词，而是独一无二的机制。

**步骤1**：在 `js/effects/play.js`（或其他时机文件）中注册：

```javascript
FX.register(new EffectHandler({
    id: 'my_special_card',
    triggers: Trigger.ON_PLAY,
    priority: Priority.SPECIAL,
    condition: (ctx) => ctx.card.defId === 'my_special_card',
    execute: (ctx) => {
        // 任意自定义逻辑
        ctx.state.monster.hp -= 10;
        ctx.log(`${ctx.card.name} 造成10点直击伤害！`);
    }
}));
```

**步骤2**：卡牌定义中不需要 keywords，只需定义 defId 与效果处理器的 condition 匹配即可。

### 3. 新增一个数值计算效果（光环/惩罚）

假设新增怪物特性 **魔法护盾**：所有卡牌有效点数-1。

在 `js/effects/calc.js` 中添加：

```javascript
FX.register(new EffectHandler({
    id: 'magic_shield',
    triggers: Trigger.ON_CALC_VALUE,
    priority: Priority.VALUE_AURA,
    condition: (ctx) => ctx.state.monster.keywords.includes('magic_shield'),
    execute: (ctx) => {
        ctx.value -= 1;
    }
}));
```

### 4. 新增一个回合效果

在 `js/effects/turn.js` 中添加 `ON_TURN_START` 或 `ON_TURN_END` 处理器。

### 5. 新增一个格子效果

在 `js/effects/slot.js` 中添加 `ON_SLOT_CALC` 处理器，通过修改 `ctx.value` 来改变格子倍率。

---

## 🧪 测试体系

### 单元测试（test_engine.js）

覆盖：
- 初始状态正确性
- 伟力翻倍逻辑（包括不触发场景）
- 驻场光环（佯攻相邻+2）
- 堆叠规则
- 每回合固定扣心机制
- 击杀胜利/失败
- 保养装备倍率提升
- 牌库流转（不洗牌）
- 未解锁格子限制
- 硬质皮肤惩罚

运行：
```bash
node test_engine.js
```

### 冒烟测试（游戏内）

按 `D` 打开调试面板，控制台运行：
```javascript
testCombat()           // 运行冒烟测试
simulateBattles(100)   // 模拟100场自动战斗
```

### 输入与光标回归

- 战斗界面由 `js/input/index.js` 显式管理 Canvas 光标：空白区域保持默认光标，手牌显示 `grab`，拖拽中显示 `grabbing`，结束回合按钮显示 `pointer`。
- 如果从地图或其他可点击界面进入战斗，不能沿用上一屏遗留的 `canvas.style.cursor = 'pointer'`；否则整块 Canvas 会看起来像被透明按钮覆盖。
- 鼠标离开 Canvas 时会清理 tooltip、选中牌和格子 hover，避免下次进入画面时继承旧交互状态。

### 调试指令

```javascript
godMode()                    // 99心，怪物HP=1
fullHand('precise_strike', 5) // 添加5张指定牌
setMonsterHp(50)             // 设置怪物HP
```

---

## 📐 数据流图

```
[createRunData] ──→ runData（持久进度）
        ↓
[initBattleFromRun] ──→ battleState（临时战斗状态）
        ↓
玩家打出卡牌 → [playCardToSlot] → FX.fire(ON_PLAY, ctx)
        ↓
[calculateTotalBoardDamage] → FX.fire(ON_CALC_VALUE) → FX.fire(ON_CALC_FINAL)
        ↓
[endTurn] → FX.fire(ON_TURN_END) → 扣怪HP → 扣心 → FX.fire(ON_EXIT) → 清理牌桌
        ↓
战斗结束 → [resolveBattleEnd]
        ↓
    ├─ win: 同步deck回runData → 选牌/事件/宝箱/商店 → stageIndex++ → map
    ├─ lose: game_over
    └─ act_clear: unlockedSlots++ → act=2 → map
```

---

## 🎨 视觉表现（Visual Design）

### 设计定位：暗黑地牢卡牌风格

尽管无法使用外部美术资产，我们利用纯 Canvas 2D 程序绘制技术，构建了一套完整的视觉体系，目标是让 playtest 体验者感受到**"这是一个经过认真设计的独立游戏"**。

### 核心技术手段

| 技术 | 应用场景 | 实现方式 |
|------|----------|----------|
| **程序纹理** | 石砖墙壁、羊皮纸卷轴、金属边框 | Canvas `createLinearGradient` + 噪声函数 + 多重叠加 |
| **动态光照** | 火把 flicker、怪物 eye glow、卡牌内发光 | 径向渐变 + `sin()` 驱动的脉冲动画 |
| **粒子系统** | 卡牌放置火花、怪物受击碎片、胜利礼花 | `fx.js` 中的 `ParticleSystem` 类，支持多种粒子类型 |
| **浮动文字** | 伤害数字弹出、生长提示 | `FloatingTextSystem`，带重力/淡出/放大效果 |
| **屏幕震动** | 怪物受击、心形碎裂 | `ScreenShake` 类，指数衰减 |
| **环境氛围** | 灰尘/孢子漂浮、暗角 vignette | `AmbientParticles` + 径向渐变覆盖 |

### 视觉系统架构（与逻辑完全解耦）

```
js/render/
├── fx.js          # 视觉特效引擎（粒子、浮动文字、震动、闪光）
│   ├── ParticleSystem      # 通用粒子发射器
│   ├── FloatingTextSystem  # 浮动伤害/提示文字
│   ├── ScreenShake         # 屏幕震动
│   ├── AmbientParticles    # 背景漂浮粒子
│   └── FlashEffect         # 闪电/闪光效果
│
├── core.js        # 增强绘制工具（材质、光照、文字）
│   ├── drawStoneTile()     # 石砖质感底座
│   ├── drawMetalFrame()    # 金属边框+斜面高光
│   ├── drawParchment()     # 羊皮纸卷轴
│   ├── drawGlowText()      # 发光文字
│   ├── drawButton()        # 统一按钮组件
│   ├── drawHealthBar()     # 血条+低血量闪烁
│   ├── drawHeartIcon()     # 精致心形+脉冲动画
│   └── drawRarityGlow()    # 卡牌稀有度光效
│
├── battle.js      # 战斗场景视觉升级
│   ├── 怪物：动态阴影+呼吸动画+eye glow+受击闪光
│   ├── 倍率牌桌：石砖底座+金属铭牌+锁定铁链+放置粒子
│   ├── 手牌：稀有度光效+悬浮放大+拖拽倾斜+轨迹粒子
│   └── UI：石质按钮+羊皮纸预览面板
│
├── screens.js     # 非战斗界面升级
│   ├── 标题：符文圆环+脉冲光效+发光标题
│   ├── 职业选择：塔罗牌风格+悬浮动画
│   ├── 地图：能量流动连线+发光节点徽章
│   └── 商店/事件：统一石质/羊皮纸风格
│
└── renderer.js    # 主渲染器，每帧更新 FX 系统
```

### 交互反馈设计

| 交互行为 | 视觉反馈 | 触发位置 |
|----------|----------|----------|
| 卡牌放置 | 粒子火花 + 石砖下沉 + 浮动文字 | `fx.js` via `FX.spawnCardPlace()` |
| 怪物受击 | 红色粒子爆发 + 屏幕震动 + 闪光 | `fx.js` via `FX.spawnMonsterHit()` |
| 失去心形 | 碎片粒子 + 屏幕微震 + 心形闪烁 | `fx.js` via `FX.spawnHeartBreak()` |
| 卡牌生长 | 绿色上升粒子 + "+生长" 浮动文字 | `fx.js` via `FX.spawnGrowth()` |
| 击杀预估 | 按钮变金色脉冲 + 绿色预览面板 | `battle.js` drawUI() |
| 胜利 | 金色粒子雨 | `fx.js` via `FX.spawnVictory()` |

### 关键设计决策

1. **零逻辑入侵**：所有视觉升级仅限 `js/render/` 和 `css/` 层，不修改任何游戏逻辑代码
2. **向后兼容**：所有新增参数都有默认值，移除 `fx.js` 后游戏仍可正常运行
3. **性能控制**：粒子数量上限 300，浮动文字上限 50，确保低端设备流畅
4. **纯程序绘制**：不使用任何外部图片/字体，完全依赖 Canvas 2D API

---

## 🎨 渲染层说明

渲染层完全解耦：
- `render/battle.js` 只负责战斗界面
- `render/screens.js` 负责所有非战斗界面（标题、地图、商店、选牌等）
- `render/renderer.js` 作为分发器，根据 `state.screen` 调用对应的绘制函数
- `render/fx.js` 提供全局视觉特效（粒子、浮动文字、震动），与具体界面无关
- 绘制函数不修改游戏状态，只读取

如需新增屏幕：
1. 在 `render/screens.js` 中新增 `drawXxx(renderer, ctx, state)` 函数
2. 在 `render/renderer.js` 的 `render()` switch 中增加分支
3. 在 `input/index.js` 中增加对应的点击/悬停处理
4. 在 `core/state.js` 或相关系统函数中增加屏幕切换逻辑

---

## 🔑 关键技术决策

### 为什么使用 ES6 Modules？

- 依赖关系清晰，避免全局命名空间污染
- 真正的模块化隔离，效果系统、数据层、渲染层完全解耦
- 为将来可能的打包工具（Vite/Webpack）和 TypeScript 迁移打下基础
- 现代前端行业标准

代价：需要通过 HTTP 服务器运行（已提供 `serve.js`）。

### 为什么将效果系统与数据定义分离？

- **数据层**（`data/`）只包含纯静态对象，无逻辑
- **效果层**（`effects/`）只包含行为逻辑，无数据
- 新增卡牌只需修改数据，新增效果只需注册处理器，两者通过 `keywords` 和 `defId` 松散耦合

### 效果系统的性能

当前实现中，每次数值计算都会触发 `FX.fire()`，遍历所有注册的处理器。对于本项目规模（~20个处理器，最多15张牌在场上），性能开销完全可以忽略。如果将来规模扩大，可以优化为：
- 卡牌打出时缓存其效果ID列表
- 为每个触发时机维护按关键词索引的快速查找表

---

## 📜 版本历史

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1 | - | 原型版本 |
| v0.2 | 2026-05 | 地图循环、商店/铁匠、战后系统 |
| v0.3 | 2026-05 | 大规模重构：ES6 Modules、效果系统解耦、目录重组 |
| v0.5 | 2026-05 | 设计对齐与Bug修复：数值调整、伟力结算修正、单回合倍率、手牌溢出、抽卡动画、铁匠铺词条选定、扣心规则改为每回合固定-1 |
| **v0.6** | **2026-05-21** | **全面视觉升级：暗黑地牢风格、粒子特效、浮动文字、屏幕震动、动态光照、材质质感、交互反馈增强** |
| **v0.7** | **2026-05-21** | **修复战后奖励界面黑屏：补齐视觉 helper 导入；新增非战斗界面渲染回归测试；修复 Windows 一键启动脚本换行与端口占用处理** |

---

> 如需进一步理解代码，建议从 `js/effects/core.js`（效果系统核心）和 `js/systems/board.js`（牌桌逻辑）开始阅读。
