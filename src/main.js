import Phaser from "phaser";
import { BattleScene } from "./scenes/BattleScene.js";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: "#1a1c20",
  width: 960,
  height: 640,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BattleScene]
});
