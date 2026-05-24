# 卡牌地下城 Playground 实现报告

> 版本：v3.1 | 日期：2026-05-24

---

## 一、实现概述

Playground 系统经历两次迭代：

- **v3.0**：词条效果 Playground（Phase 1+2），面向 AI 批量验证和开发者 JSON 编辑。
- **v3.1**：**对战测试场**（本次改造），面向人类玩家的真实战斗测试环境。

核心交付物（v3.1）：
- **真实对战界面**：直接复用 `drawBattle()` 战斗渲染，与正常游戏画面完全一致
- **人类友好控制面板**：右侧悬浮，支持对手切换、血量重置、手牌操控、实时信息
- **参数配置面板**：可折叠，支持卡牌/怪物数值编辑，保存即持久化到 localStorage
- **战斗结束自动重置**：胜利/失败均自动恢复并继续测试，不跳屏
- **AI 测试完整保留**：原有 scenario-engine / ai-harness / 18 个预设场景全部保留

---

## 二、架构说明

```
js/playground/
├── index.js              # 入口：状态管理、screen切换、对战测试场状态引擎
├── scenario-engine.js    # 场景执行引擎（AI测试核心，零DOM依赖）
├── scenario-data.js      # 18个预设场景
├── local-storage.js      # LocalStorage读写 + JSON导入导出（AI场景用）
├── ui-controller.js      # DOM面板：AI测试编辑器 + 对战测试控制面板 + 数据编辑器
├── renderer.js           # Canvas绘制：菜单（3按钮） + AI测试简化牌桌
├── ai-harness.js         # AI Playtest Harness API
```

### 关键设计决策

| 决策 | 说明 |
|------|------|
| **零重复实现** | 对战测试场复用 `drawBattle` / `handleBattleMouseDown` / `playCardToSlot` / `endTurn`，绝不写第二份 |
| **数据覆盖持久化** | `card_dungeon_data_overrides` localStorage key，启动时自动应用，全局生效 |
| **独立虚拟 RunData** | 使用 `createRunData('veteran')` 创建虚拟 runData，不污染真实游戏进度 |
| **战斗结束自动重置** | `checkBattleEnd` 检测到 Playground 模式时，延迟后调用 `resetPlaygroundBattle` |
| **向后兼容** | AI 测试菜单/引擎/场景全部保留，Playground 菜单新增"对战测试场"入口 |

---

## 三、用户场景验证

### 场景1：选择对手
1. 主菜单点击 "🧪 Playground"
2. 点击 "🎮 对战测试场"
3. 右侧面板「对手」下拉框选择「污染之花」
4. 点击「切换对手」
5. ✅ 画面中央怪物立即变为食人花，HP 变为 250/250

### 场景2：灵活手牌控制
1. 在右侧面板「添加手牌」下拉框选择「老兵雄心」
2. 点击「添加到手牌」
3. ✅ 手牌区出现该卡牌
4. 拖拽卡牌到倍率格，点击「结束回合」
5. ✅ 伤害正确结算，怪物扣血；若未击杀，玩家扣1心

### 场景3：死亡自动重置
1. 连续结束回合直到玩家 hearts 降至 0
2. ✅ 弹出失败提示「💔 战斗失败！已自动恢复血量」
3. ✅ 约 1.2 秒后自动恢复：玩家满血、怪物满血、格子清空、重新抽5张牌
4. ✅ 停留在对战测试场，可继续测试

### 场景4：数值修改持久化
1. 展开右侧面板「⚙️ 参数配置」
2. 切换到「卡牌」标签，找到「齐心协力」
3. 将基础数值从 10 改为 8，点击「保存」
4. ✅ 当前战斗中该卡牌数值已更新
5. 点击「退出到主菜单」，再进入正常游戏
6. ✅ 修改后的数值在正常游戏中同样生效
7. 关闭浏览器重新打开
8. ✅ 数值仍然是 8（localStorage 持久化）

### 场景5：AI测试保留
1. Playground 菜单点击 "🃏 词条效果测试（AI）"
2. ✅ 进入 v3.0 的 JSON 场景编辑器，所有预设场景和 AI Harness 正常工作

---

## 四、截图验证

| 截图 | 说明 |
|------|------|
| `screenshots/02_playground_menu.png` | Playground 菜单：3个入口按钮 |
| `screenshots/03_battle_test.png` | 对战测试场：真实战斗画面 + 右侧控制面板 |
| `screenshots/04_monster_changed.png` | 切换怪物为污染之花（食人花） |
| `screenshots/05_data_editor.png` | 参数配置面板展开，显示卡牌数值编辑 |
| `screenshots/06_card_added.png` | 添加卡牌到手牌后的状态 |
| `screenshots/battle_02_after_end.png` | 战斗失败后自动重置后的状态 |

---

## 五、使用指南

### 5.1 人工使用（浏览器）

**对战测试场：**
1. 启动游戏，主菜单点击 "🧪 Playground"
2. 点击 "🎮 对战测试场"
3. 右侧面板控制测试环境：
   - 「对手」下拉框 + 「切换对手」：更换怪物
   - 「重置血量」：恢复敌我满血
   - 「清空格子」：收回所有场上卡牌
   - 「添加手牌」下拉框 + 「添加到手牌」：指定卡牌加入手牌
   - 「随机抽1张」：从牌库抽1张
   - 「参数配置」：展开后编辑卡牌/怪物数值，保存即生效
4. 拖拽手牌到倍率格进行测试
5. 点击「结束回合」或按 E 结算
6. 测试完成点击「退出到主菜单」

**AI 测试（保留）：**
1. Playground 菜单点击 "🃏 词条效果测试（AI）"
2. 选择场景，点击「运行测试」
3. 编辑 JSON 后「保存到本地」或「导出JSON」

### 5.2 AI使用（浏览器控制台）

```javascript
// AI 测试功能与 v3.0 完全一致
await AITest.run('mighty_basic');
await AITest.runAll();
const report = await AITest.report();
```

---

## 六、数据覆盖系统说明

### 存储格式
localStorage key: `card_dungeon_data_overrides`

```json
{
  "cards": {
    "unity_strike": { "baseValue": 8 }
  },
  "monsters": {
    "polluted_flower": { "hp": 300 }
  }
}
```

### API
- `applyDataOverrides()` — 启动时自动应用
- `saveDataOverride(category, id, field, value)` — 保存单条覆盖
- `getDataOverrides()` — 读取全部覆盖
- `clearDataOverrides()` — 清空全部覆盖

---

## 七、文件变更清单

### 修改文件（8个）
| 文件 | 变更内容 |
|------|---------|
| `js/data/index.js` | 新增数据覆盖系统（apply/save/get/clear overrides） |
| `js/main.js` | 启动时调用 `applyDataOverrides()`；游戏循环更新面板实时数据；调整 `initPlaygroundUI` 调用顺序 |
| `js/playground/index.js` | 新增对战测试场状态管理（init/enter/reset/change/add card） |
| `js/playground/ui-controller.js` | 重构 DOM 面板，新增对战测试控制面板和数据编辑器 |
| `js/playground/renderer.js` | Menu 视图按钮改为 3 个（新增对战测试场入口） |
| `js/render/renderer.js` | Playground screen 分支支持 pgView='battle' 调用 drawBattle |
| `js/input/index.js` | Playground 输入复用战斗逻辑；checkBattleEnd 支持自动重置 |
| `index.html` | 新增 `#pg-battle-panel` DOM 结构 |

---

> 如需进一步扩展 Playground 系统，建议从 `js/playground/index.js` 的对战状态引擎开始阅读。
