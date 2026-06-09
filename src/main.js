import Phaser from "phaser";
import { BattleScene } from "./scenes/BattleScene.js";
import { GAME_W, GAME_H } from "./config/LayoutConfig.js";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: "#1a1c20",
  width: GAME_W,
  height: GAME_H,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BattleScene]
});
