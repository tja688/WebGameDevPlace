Original prompt: 根据文件描述，全面彻底的修复此项目的问题

## 2026-05-26

- 已执行开工前设计文档同步核对：`git pull` 已是最新；外部 Obsidian 第二版设计目录与仓库 `design/第二版设计/` 文件哈希一致，无需同步。
- 已阅读桌面质检报告，待修复范围包括战斗规则、卡牌效果、遗物、经济/事件/BOSS 奖励、测试基线、README 与版本号。
- 已定位核心实现点：`js/effects/play.js`、`js/effects/relics.js`、`js/effects/turn.js`、`js/systems/battle.js`、`js/systems/post-battle.js`、`js/input/index.js`、`js/data/shop.js` 与 `test_engine.js`。
- 修复顺序：战斗生命周期与卡牌效果 -> 遗物/BOSS奖励/经济事件 -> 测试与文档版本。
- 已完成核心修复并扩充 `test_engine.js` 回归断言；`npm test` 当前通过（77 项引擎断言 + 渲染回归）。
- 已额外验证 `node test_playground.js` 与 `node test_simulate.js` 均通过。
- 已通过 Playwright 客户端进入正式 1-1 战斗并生成 `output/web-game-battle/shot-0.png`、`state-0.json`，无控制台错误；另用浏览器脚本拖牌入格并结束回合，确认 `render_game_to_text` 与截图同步。
