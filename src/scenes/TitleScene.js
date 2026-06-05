// ============================================================
// 深入地牢 - 标题场景
// ============================================================
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../constants.js';
import { GameState } from '../GameState.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const { width, height } = this.scale;

    // 背景装饰
    this.drawBackground();

    // 标题
    this.add.text(width / 2, height * 0.28, '深入地牢', {
      fontFamily: 'sans-serif',
      fontSize: '64px',
      color: COLORS.textGold,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 8, fill: true },
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.40, 'Into the Dungeon', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: COLORS.textGray,
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // 职业选择 (目前只有一个)
    this.add.text(width / 2, height * 0.52, '选择职业', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: COLORS.textGray,
    }).setOrigin(0.5);

    // 兵大哥按钮
    const btnContainer = this.add.container(width / 2, height * 0.64);
    const btnBg = this.add.image(0, 0, 'btn_bg').setInteractive({ useHandCursor: true });
    const btnText = this.add.text(0, -5, '兵大哥', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: COLORS.textWhite,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const btnDesc = this.add.text(0, 14, 'HP:8  ATK:3  DEF:1', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: COLORS.textGray,
    }).setOrigin(0.5);
    btnContainer.add([btnBg, btnText, btnDesc]);

    btnBg.on('pointerover', () => {
      btnBg.setTint(0x4a45a0);
      this.tweens.add({ targets: btnContainer, scaleX: 1.05, scaleY: 1.05, duration: 100 });
    });
    btnBg.on('pointerout', () => {
      btnBg.clearTint();
      this.tweens.add({ targets: btnContainer, scaleX: 1, scaleY: 1, duration: 100 });
    });
    btnBg.on('pointerdown', () => {
      GameState.initGame('soldier');
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('MapScene');
      });
    });

    // 底部信息
    this.add.text(width / 2, height * 0.88, '在3×3的卡牌地牢中探索、战斗、收集遗物', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: COLORS.textGray,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.93, '拖拽玩家卡移动和互动 · 翻开相邻卡牌探索', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#666680',
    }).setOrigin(0.5);

    this.cameras.main.fadeIn(400);
  }

  drawBackground() {
    const { width, height } = this.scale;
    // 简单渐变背景
    for (let i = 0; i < 20; i++) {
      const ratio = i / 20;
      const r = Math.floor(18 + ratio * 8);
      const gVal = Math.floor(16 + ratio * 4);
      const b = Math.floor(30 + ratio * 34);
      const color = (r << 16) | (gVal << 8) | b;
      this.add.rectangle(width / 2, i * (height / 20) + (height / 40), width, height / 20, color, 0.3);
    }

    // 装饰性粒子
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = 1 + Math.random() * 2;
      const dot = this.add.circle(x, y, size, 0x4a45a0, 0.3);
      this.tweens.add({
        targets: dot,
        alpha: { from: 0.1, to: 0.5 },
        duration: 2000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
      });
    }
  }
}
