import Phaser from "phaser";

class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x15181b);

    this.add
      .text(width / 2, height / 2 - 20, "Phaser 4 Ready", {
        color: "#f5c86a",
        fontSize: "32px",
        fontStyle: "bold",
        fontFamily: "Inter, sans-serif",
        stroke: "#0f1113",
        strokeThickness: 4
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 24, `Phaser v${Phaser.VERSION}`, {
        color: "#aeb5b6",
        fontSize: "16px",
        fontFamily: "Inter, sans-serif"
      })
      .setOrigin(0.5);
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: "#15181b",
  width: 960,
  height: 540,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene]
});
