import { Scene } from 'phaser';
import { FONT } from '../config.js';
import { audio } from '../audio/AudioManager.js';
import { clearSave } from '../core/gameState.js';

export class GameOverScene extends Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.gameState = data.state;
  }

  create() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // 背景由 Phaser Game 配置统一处理

    const victory = this.gameState.victory;
    const title = victory ? '通关！' : '游戏结束';
    const color = victory ? '#f5c86a' : '#e76457';

    if (victory) audio.playVictory();
    else audio.playDefeat();

    this.add.text(cx, cy - 120, title, {
      fontFamily: FONT.family,
      fontSize: FONT.sizeHuge,
      color,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const stats = [
      `击败怪物: ${this.gameState.totalKills}`,
      `经过房间: ${this.gameState.totalRooms}`,
      `收集金币: ${this.gameState.totalGold}`,
      `到达层数: ${this.gameState.layer}`,
    ];

    stats.forEach((s, i) => {
      this.add.text(cx, cy - 20 + i * 40, s, {
        fontFamily: FONT.family,
        fontSize: FONT.sizeNormal,
        color: '#f2eee7',
      }).setOrigin(0.5);
    });

    const restartBtn = this.add.text(cx, cy + 140, '回到主菜单', {
      fontFamily: FONT.family,
      fontSize: FONT.sizeLarge,
      color: '#74a8ff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    restartBtn.on('pointerover', () => restartBtn.setColor('#f5c86a'));
    restartBtn.on('pointerout', () => restartBtn.setColor('#74a8ff'));
    restartBtn.on('pointerdown', () => {
      clearSave();
      this.scene.start('MenuScene');
    });

    clearSave();
  }
}
