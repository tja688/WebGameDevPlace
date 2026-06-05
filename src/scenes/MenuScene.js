import { Scene } from 'phaser';
import { COLORS, FONT } from '../config.js';
import { audio } from '../audio/AudioManager.js';
import { createInitialGameState } from '../core/gameState.js';
import { generateLayerRooms } from '../core/dungeon.js';
import { CLASSES } from '../data/classes.js';

export class MenuScene extends Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    audio.startBgm();

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // 标题
    this.add.text(cx, 120, '深入地牢', {
      fontFamily: FONT.family,
      fontSize: FONT.sizeHuge,
      color: '#f5c86a',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 200, '在九宫格中展开的卡牌冒险', {
      fontFamily: FONT.family,
      fontSize: FONT.sizeNormal,
      color: '#aeb5b6',
    }).setOrigin(0.5);

    // 职业选择
    this.add.text(cx, 320, '选择你的职业', {
      fontFamily: FONT.family,
      fontSize: FONT.sizeLarge,
      color: '#f2eee7',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const classKeys = Object.keys(CLASSES);
    const startX = cx - (classKeys.length - 1) * 140 / 2;

    classKeys.forEach((key, i) => {
      const cls = CLASSES[key];
      const x = startX + i * 140;
      const y = 420;

      const btn = this.add.container(x, y);

      const bg = this.add.rectangle(0, 0, 120, 140, COLORS.panel)
        .setStrokeStyle(2, COLORS.line)
        .setInteractive({ useHandCursor: true });

      const nameText = this.add.text(0, -30, cls.name, {
        fontFamily: FONT.family,
        fontSize: FONT.sizeLarge,
        color: '#52c6b8',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const statText = this.add.text(0, 20, `生命 ${cls.hp}\n攻击 ${cls.atk}  防御 ${cls.def}`, {
        fontFamily: FONT.family,
        fontSize: FONT.sizeSmall,
        color: '#f2eee7',
        align: 'center',
      }).setOrigin(0.5);

      const descText = this.add.text(0, 55, cls.description, {
        fontFamily: FONT.family,
        fontSize: '12px',
        color: '#aeb5b6',
        align: 'center',
      }).setOrigin(0.5);

      btn.add([bg, nameText, statText, descText]);

      bg.on('pointerover', () => {
        bg.setStrokeStyle(2, COLORS.gold);
        this.tweens.add({ targets: btn, scaleX: 1.05, scaleY: 1.05, duration: 150 });
      });

      bg.on('pointerout', () => {
        bg.setStrokeStyle(2, COLORS.line);
        this.tweens.add({ targets: btn, scaleX: 1, scaleY: 1, duration: 150 });
      });

      bg.on('pointerdown', () => {
        audio.playPickUp();
        const state = createInitialGameState(key);
        state.layerNodes = generateLayerRooms(1);
        this.scene.start('GameScene', { state });
      });
    });

    // 继续游戏按钮（如果有存档）
    const saved = localStorage.getItem('deepDungeon_save');
    if (saved) {
      const continueBtn = this.add.text(cx, 600, '继续游戏', {
        fontFamily: FONT.family,
        fontSize: FONT.sizeNormal,
        color: '#74a8ff',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      continueBtn.on('pointerover', () => continueBtn.setColor('#f5c86a'));
      continueBtn.on('pointerout', () => continueBtn.setColor('#74a8ff'));
      continueBtn.on('pointerdown', () => {
        try {
          const state = JSON.parse(saved);
          this.scene.start('GameScene', { state });
        } catch {
          localStorage.removeItem('deepDungeon_save');
        }
      });
    }

    // 设置按钮
    this.createSettingsButton();
  }

  createSettingsButton() {
    const btn = this.add.text(this.scale.width - 40, 40, '⚙', {
      fontFamily: FONT.family,
      fontSize: '28px',
      color: '#aeb5b6',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#f2eee7'));
    btn.on('pointerout', () => btn.setColor('#aeb5b6'));
    btn.on('pointerdown', () => this.showSettings());
  }

  showSettings() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    const overlay = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.7);
    const panel = this.add.rectangle(cx, cy, 400, 300, COLORS.panel).setStrokeStyle(2, COLORS.line);
    const title = this.add.text(cx, cy - 100, '设置', {
      fontFamily: FONT.family, fontSize: FONT.sizeLarge, color: '#f2eee7', fontStyle: 'bold',
    }).setOrigin(0.5);

    const muteText = this.add.text(cx, cy - 20, audio.muted ? '音量: 静音' : '音量: 开', {
      fontFamily: FONT.family, fontSize: FONT.sizeNormal, color: '#f2eee7',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    muteText.on('pointerdown', () => {
      audio.toggleMute();
      muteText.setText(audio.muted ? '音量: 静音' : '音量: 开');
    });

    const close = this.add.text(cx, cy + 80, '关闭', {
      fontFamily: FONT.family, fontSize: FONT.sizeNormal, color: '#e76457',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    close.on('pointerdown', () => {
      overlay.destroy();
      panel.destroy();
      title.destroy();
      muteText.destroy();
      close.destroy();
    });
  }
}
