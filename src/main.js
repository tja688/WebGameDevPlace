import Phaser from "phaser";
import "./styles.css";

class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 2, "Phaser 4 Ready", {
      color: "#ffffff",
      fontFamily: "sans-serif",
      fontSize: "32px"
    }).setOrigin(0.5);
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: 960,
  height: 540,
  backgroundColor: "#000000",
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene]
};

new Phaser.Game(config);
