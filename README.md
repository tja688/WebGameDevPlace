# 卡牌地下城 - 项目全景导航

> 版本：v0.2 "地图循环" | 最后更新：2026-05-18
> 本文档为项目现状的客观全景拆解，作为后续修改的核心事实锚点。

---

## 一、项目定位与运行方式

| 项 | 事实 |
|---|---|
| 项目类型 | 纯前端网页游戏（单HTML + JS + CSS） |
| 游戏类型 | 卡牌构筑 + 倍率牌桌（类Balatro）+ Rogue-lite爬塔 |
| 运行方式 | 直接打开 `index.html`，无需构建工具/服务器 |
| 浏览器依赖 | 依赖 Canvas 2D、Web Audio API、ES6+ |
| 后端 | 无 |
| 包管理 | 无（零依赖） |

---

## 二、文件结构（7+4 体系）

```
WebGameDevPlace/
├── index.html              # 入口：DOM容器、script加载顺序、开始界面规则说明
├── css/style.css           # 353行：全局暗色主题、UI覆盖层、调试面板、模态框
├── js/
│   ├── data.js             # 542行：所有静态数据定义（关键词/卡牌/怪物/职业/关卡/商店）
│   ├── engine.js           # 1068行：核心状态机、战斗引擎、卡牌结算、战后系统
│   ├── renderer.js         # 2039行：Canvas 2D渲染器，13个屏幕的绘制逻辑
│   ├── input.js            # 1001行：鼠标/触摸输入处理，所有界面的点击/悬停逻辑
│   ├── audio.js            # 83行：Web Audio API合成音效（放置/伤害/胜利等）
│   ├── main.js             # 85行：主入口、游戏循环、快捷键绑定
│   └── autotest.js         # 285行：调试面板、自动出牌、控制台快捷指令
├── test_engine.js          # 168行：Node.js引擎单元测试（12个断言）
└── test_simulate.js        # 21行：自动战斗胜率模拟脚本
```

**加载顺序（严格依赖链）：**
```
data.js → engine.js → audio.js → renderer.js → input.js → autotest.js → main.js
```

---

## 三、核心数据规模

| 数据类型 | 数量 | 说明 |
|---|---|---|
| 关键词 | 14种 | agile/stack/mighty/absorb/devour/exit/remain/field/unity/response/grow/echo/dedicate/levy/stackjoy/reinforce/reuse |
| 卡牌定义 | 15张 | data.js中CARD_DEFS，分为"生长体系"10张+"无体系"5张 |
| 怪物 | 11种 | 6普通 + 1精英 + 1BOSS + 1训练靶子 + 2占位 |
| 职业 | 3种 | 仅"兵大哥(soldier)"可用，法师/村民占位锁死 |
| 关卡节点 | 8个 | 线性1-1到1-8，固定配置 |
| 遗物 | 5种 | 纯文本占位，无实际效果（除初始遗物） |
| 事件名池 | 8个 | 纯文本，无分支逻辑 |

---

## 四、架构拆解

### 4.1 状态机（engine.js）

```
screen 枚举（共13个）：
  title → class_select → map → battle → post_battle → card_pick → card_select
  → shop → blacksmith → event → treasure → act_transition → game_over
```

**全局状态：** `window.gameState` —— 单例状态对象，screen字段决定当前界面。

**Run Data（持久化进度）：** `runDataRef` 挂载在战斗state上，包含：
- act/stageIndex（当前大关/节点）
- souls（魂货币）
- deck（牌组，CardInstance数组）
- relics（遗物数组）
- slotCount=5 / unlockedSlots（可用格数，初始3，过关后+1）
- slotUpgrades（格子倍率升级次数）
- 商店/铁匠费用递增状态

### 4.2 战斗核心流程

```
initBattleFromRun(runData)
  ↓ 生成5格牌桌（中间格2X遗物加成，铁匠升级叠加）
  ↓ 从runData.deck复制牌库并洗牌
  ↓ 抽4张牌
  → phase='playing'

playing阶段：
  - 玩家拖拽手牌 → 格子（canPlaceCard校验）
  - playCardToSlot()：14步打出时结算（见4.3）
  - 按E或点击结束回合

endTurn()：
  1. 救兵牌自动打出到空位
  2. 计算总伤害 → 扣怪物HP
  3. 若未击杀：扣心（普通怪有virusPenalty递增）
  4. 触发非留场牌离场效果
  5. 清理牌桌（留场牌保留，复用牌回牌组，其余入弃牌堆）
  6. 抽4张牌
  7. 留场牌获得【堆叠】
  8. turn++

phase='ended' → Input.checkBattleEnd() → 战后结算/切换屏幕
```

### 4.3 卡牌打出时结算顺序（engine.js:404-585）

打出到格子后，按以下固定顺序结算：
1. 格子的 `nextCardBonus`（怒意上涌）
2. **征收** levy：从牌组拉一张堆叠牌到同格
3. **合理训练** proper_training：同格卡牌+1
4. **生长** grow：永久加点（受30小时训练/训练激素/合理训练影响）
5. **训练痕迹** training_trace：点数≥3时连锁打出牌组内所有同名卡
6. **团结** unity：同名牌在场则+2
7. **奉献** dedicate：左侧相邻格牌加自身一半点数
8. **叠叠乐** stackjoy：叠放超3张则+3
9. **吞噬** devour：清空两侧格子，吸收其数值
10. **吸收** absorb：获得两侧数值（不清空）
11. **保养装备** maintain_gear：格子倍率+1
12. **炫耀肌肉** show_muscle：伟力触发时相邻牌永久+1
13. **理清头绪** clear_mind：抽2张，左侧牌-1
14. **忆往昔** recall_past：从弃牌堆随机拿回1张
15. **怒意上涌** surging_anger：设置下一张同格+5
16. **灵动** agile：不锁定，直接进入弃牌堆（或复用回牌组）

### 4.4 伤害计算公式

```
单卡伤害 = getCardFinalValue(card) × getSlotEffectiveMultiplier(slot)

getCardFinalValue 计算链：
  baseValue + permanentBonus                          ← 基础值
  + 驻场光环（佯攻+2 / 磨练技巧+4 / 训练纲领+N）      ← 有效值
  × 伟力翻倍（若场上无更大有效值牌）                   ← 伟力后
  - 硬质皮肤惩罚（最左/最右格-1）                      ← 最终值
```

### 4.5 地图系统（renderer.js:204-348 / input.js:241-270）

- **纯线性**：8个节点横向排列，虚线连接
- 节点类型固定：`1-1普通 → 1-2普通 → 1-3普通 → 1-4精英 → 1-5普通 → 1-6普通 → 1-7普通 → 1-8 BOSS`
- 战后奖励类型固定配置于 `STAGE_CONFIG`：
  - 普通怪：先card_pick（三选一牌）→ 再two_events/treasure/shop_choice
  - 精英：three_events
  - BOSS：act_clear（解锁第4格）

---

## 五、各屏幕详细功能矩阵

| 屏幕 | 渲染 | 输入 | 数据 | 完成度 |
|---|---|---|---|---|
| title（标题） | ✓ 光效+按钮 | ✓ 点击进入class_select | - | 完整 |
| class_select（职业选择） | ✓ 三卡片 | ✓ 仅soldier可点 | CLASS_DEFS | 2/3占位锁死 |
| map（地图） | ✓ 8节点+连线+顶部栏 | ✓ 仅当前节点可进 | runData | 完整 |
| battle（战斗） | ✓ 怪物/牌桌/手牌/UI | ✓ 拖拽/点击/悬停提示 | battleState | 完整 |
| post_battle（战后） | ✓ 事件选项/宝箱/商店选择 | ✓ 点击选择 | resolveBattleEnd | 完整 |
| card_pick（选牌） | ✓ 三选一 | ✓ 点击/跳过 | CARD_REWARD_POOL | 完整 |
| card_select（通用选卡） | ✓ 网格展示 | ✓ 点击/返回 | 多模式复用 | 完整 |
| shop（牌店） | ✓ 卡牌商品+服务按钮 | ✓ 购买/删牌/强化/刷新/返回 | shopStock | 完整 |
| blacksmith（铁匠铺） | ✓ 三栏布局 | ✓ 购买遗物/升级倍率/附魔/刷新 | blacksmithStock | 完整 |
| event（事件） | ✓ 事件卡片+两个按钮 | ✓ 接受/离开 | EVENT_NAMES | **纯占位**：所有事件效果相同（buff_card+2） |
| treasure（宝箱） | ✓ 开箱动画+遗物展示 | ✓ 点击开启/收下 | RELIC_DEFS | 完整（遗物无实际效果） |
| act_transition（大关过渡） | ✓ 黑屏+奖励说明+按钮 | ✓ 点击进入下一大关 | runData | 仅Act1→Act2，内容未扩展 |
| game_over（失败） | ✓ 到达关卡+累计魂+重启 | ✓ 点击重新开始 | runData | 完整 |

---

## 六、已知占位/未完成区域

### 6.1 硬占位（功能缺失）

| 区域 | 现状 | 影响 |
|---|---|---|
| 事件系统 | 所有事件效果固定为"选一张牌+2" | 事件多样性为零 |
| 遗物效果 | 仅初始遗物"兵团装备"有效果（中间格+1倍率） | 宝箱/铁匠遗物纯装饰 |
| 职业系统 | 法师、村民未实现（startingDeck为空，relic效果none） | 仅兵大哥可玩 |
| 第二大关 | act_transition后act=2，但STAGE_CONFIG无act=2配置 | 通关后重复act1内容或崩溃 |
| 多格卡牌 | canPlaceCard直接返回"多格卡暂未实现" | 所有卡牌size>1不可使用 |
| 怪物AI | 怪物无行动，仅作为血量和被动存在 | 纯DPS检测 |

### 6.2 软占位（功能简化）

| 区域 | 现状 |
|---|---|
| 怪物绘制 | 所有怪物共用同一个Canvas手绘老鼠，仅换色（normal/elite/boss/stone/dummy五套色板） |
| 卡牌图标 | 仅5种图标（sword/shadow/gear/shield/star），其他类型无绘制 |
| 音效 | 全部Web Audio API合成，无外部音频文件 |
| 动画 | 仅有slotFlashes/monsterFlash/拖拽高亮，无复杂动画系统 |
| 存档 | 无localStorage，刷新页面进度丢失 |

---

## 七、测试与调试体系

### 7.1 单元测试（test_engine.js）
```bash
node test_engine.js
```
- 12个断言，覆盖：初始状态、伟力翻倍、驻场光环、硬质皮肤、堆叠规则、病毒惩罚、击杀胜利、牌库流转、未解锁格。
- **状态**：全部通过（截至当前代码）。

### 7.2 胜率模拟（test_simulate.js）
```bash
node test_simulate.js
```
- 200场×5档HP（55/65/75/85/95），自动最优出牌策略。
- 用于数值平衡验证。

### 7.3 游戏内调试面板（D键或🛠️按钮）
| 功能 | 说明 |
|---|---|
| 自动打出最优解 | AutoTest.autoPlayOptimal()：优先找击杀组合，否则按单卡输出贪心 |
| 自动结束回合 | 直接调用endTurn |
| 指定手牌 | prompt输入1-5数字组合 |
| 补满牌库 | 添加5张精确打击 |
| 秒杀/回满/重置 | 即时修改状态 |
| 设置倍率 | 直接修改5格multiplier |

### 7.4 控制台快捷指令
```js
godMode()          // 99心，怪物HP=1
fullHand(type, n)  // 添加n张指定牌
setMonsterHp(hp)   // 设置怪物HP
testCombat()       // 运行冒烟测试
simulateBattles(n) // 模拟n场自动战斗
```

---

## 八、关键常数与数值锚点

```js
SLOT_COUNT = 5                    // 总格数
MAX_UNLOCKED_SLOTS = 3            // 初始可用格数
player.maxHearts = 3              // 初始生命（全职业）

drawCards(state, 4)               // 每回合抽牌数

// 兵大哥初始牌组（12张）
precise_strike ×5  // 基础5，伟力
feint ×5           // 基础3，驻场
maintain_gear ×2   // 基础0，堆叠，升倍率

// 魂收益
normal baseSouls = 3
elite baseSouls = 4
boss baseSouls = 5
实际收益 = baseSouls - heartsLost（不低于0）

// 商店费用基线
删牌 = 1魂
数值强化 = 1→2→3魂（首次-1）
商店刷新 = 1→2→3...魂
铁匠倍率升级 = 2→3→4...魂（按可用格顺序）
附魔 = 4→5→6...魂
铁匠刷新 = 0（首次免费）→1→2...魂
```

---

## 九、数据流图

```
[createRunData] ──→ runData（持久进度）
        ↓
[initBattleFromRun] ──→ battleState（临时战斗状态）
        ↓
战斗结束 → [resolveBattleEnd]
        ↓
    ├─ win: 同步deck回runData → 选牌/事件/宝箱/商店 → stageIndex++ → map
    ├─ lose: game_over
    └─ act_clear: unlockedSlots++ → act=2 → map
```

---

## 十、修改风险点（高精度导航）

### 高危区（牵一发动全身）
1. **`engine.js:404-585` playCardToSlot结算顺序** —— 改变顺序会直接影响卡牌 combo 逻辑。
2. **`engine.js:314-340` getCardFinalValue** —— 伤害公式的核心链，修改会波及所有测试用例。
3. **`data.js:26-273` CARD_DEFS** —— 新增/修改卡牌需同步：关键词处理逻辑、Renderer绘制、AutoTest作弊映射、单元测试。
4. **`renderer.js:203-348` drawMap** —— 地图节点布局硬编码8个，增减节点需同步input.js和STAGE_CONFIG。

### 中危区
1. **Input.js的returnData/returnScreen模式** —— card_select多场景复用，修改返回逻辑需检查shop/blacksmith/event三处调用点。
2. **`engine.js:858-917` resolveBattleEnd** —— pendingPostBattle机制防止card_pick后二次加魂，修改需谨慎。
3. **KEYWORDS新增** —— 需在engine.js添加对应处理分支（若无分支则关键词无效果）。

### 低危区
1. 纯视觉：CSS、怪物颜色主题、卡牌颜色、背景砖块
2. 音效：audio.js完全独立
3. 调试工具：autotest.js不影响主逻辑

---

## 十一、技术债务速查

| 位置 | 问题 | 建议修改方向 |
|---|---|---|
| data.js:439-460 | mage/villager空deck | 补startingDeck或移除选择界面 |
| engine.js:369-370 | 多格卡直接拒绝 | 实现size>1的跨格放置逻辑 |
| engine.js:994-1062 | createInitialState/startBattle | 仅用于测试，生产流程走runData |
| renderer.js:1399-1504 | drawMonster仅画老鼠 | 按怪物类型绘制不同造型或改用精灵图 |
| input.js:995-1001 | restartGame引用startBattle | 应改为重新创建runData并切到map |
| 全局 | 无存档 | 添加localStorage序列化runData |
| 全局 | 无第二大关内容 | 添加STAGE_CONFIG act=2 |
