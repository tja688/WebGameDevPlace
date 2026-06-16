import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "./config/GameConfig.js";
import BootScene from "./scenes/BootScene.js";
import MenuScene from "./scenes/MenuScene.js";
import GameScene from "./scenes/GameScene.js";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: "#1e2a38",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  disableContextMenu: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // 先启动 BootScene，生成贴图后它会自动切到 MenuScene
  scene: [BootScene, MenuScene, GameScene],
});
