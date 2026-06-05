import { Scene } from 'phaser';
import { FONT, COLORS } from '../config.js';
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

    const victory = this.gameState.victory;
    const title = victory ? '通关！' : '游戏结束';
    const titleColor = victory ? '#f5c86a' : '#e76457';

    if (victory) audio.playVictory();
    else audio.playDefeat();

    // 背景面板
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.panel, 0.85);
    bg.fillRoundedRect(cx - 250, cy - 180, 500, 380, 12);
    bg.lineStyle(1, COLORS.line, 0.5);
    bg.strokeRoundedRect(cx - 250, cy - 180, 500, 380, 12);

    this.add.text(cx, cy - 150, title, {
      fontFamily: FONT.family, fontSize: '44px',
      color: titleColor, fontStyle: 'bold',
    }).setOrigin(0.5);

    // 分隔线
    this.add.text(cx, cy - 100, '━━━━━━━━━━━━━━━━━━━━', {
      fontFamily: FONT.family, fontSize: '14px', color: '#3a4045',
    }).setOrigin(0.5);

    const gs = this.gameState;
    const stats = [
      `到达层数: 第 ${gs.layer} 层`,
      `经过房间: ${gs.totalRooms}`,
      `击败怪物: ${gs.totalKills}`,
      `收集金币: ${gs.totalGold}`,
    ];

    stats.forEach((s, i) => {
      this.add.text(cx, cy - 60 + i * 36, s, {
        fontFamily: FONT.family, fontSize: '18px',
        color: '#f2eee7',
      }).setOrigin(0.5);
    });

    // 分隔线
    this.add.text(cx, cy + 100, '━━━━━━━━━━━━━━━━━━━━', {
      fontFamily: FONT.family, fontSize: '14px', color: '#3a4045',
    }).setOrigin(0.5);

    const restartBtn = this.add.text(cx, cy + 150, '回到主菜单', {
      fontFamily: FONT.family, fontSize: '22px',
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
