import { Scene } from 'phaser';
import { FONT, COLORS } from '../config.js';
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

    this.add.text(cx, 100, '深入地牢', {
      fontFamily: FONT.family, fontSize: FONT.sizeHuge,
      color: '#f5c86a', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 170, '在九宫格中展开的卡牌冒险', {
      fontFamily: FONT.family, fontSize: FONT.sizeNormal,
      color: '#aeb5b6',
    }).setOrigin(0.5);

    this.add.text(cx, 280, '选择你的职业', {
      fontFamily: FONT.family, fontSize: FONT.sizeLarge,
      color: '#f2eee7', fontStyle: 'bold',
    }).setOrigin(0.5);

    const classKeys = Object.keys(CLASSES);
    const startX = cx - (classKeys.length - 1) * 160 / 2;

    classKeys.forEach((key, i) => {
      const cls = CLASSES[key];
      const x = startX + i * 160;
      const y = 390;

      const container = this.add.container(x, y);

      // 背景
      const bg = this.add.graphics();
      bg.fillStyle(COLORS.panel, 0.7);
      bg.fillRoundedRect(-70, -70, 140, 150, 8);
      bg.lineStyle(1, COLORS.line, 0.5);
      bg.strokeRoundedRect(-70, -70, 140, 150, 8);

      const hitZone = this.add.zone(0, 0, 140, 150).setInteractive({ useHandCursor: true });

      const nameText = this.add.text(0, -35, `◈ ${cls.name}`, {
        fontFamily: FONT.family, fontSize: '20px',
        color: '#52c6b8', fontStyle: 'bold',
      }).setOrigin(0.5);

      const statText = this.add.text(0, 10, `生命 ${cls.hp}  攻击 ${cls.atk}  防御 ${cls.def}`, {
        fontFamily: FONT.family, fontSize: '14px',
        color: '#f2eee7', align: 'center',
      }).setOrigin(0.5);

      const descText = this.add.text(0, 45, cls.description, {
        fontFamily: FONT.family, fontSize: '12px',
        color: '#aeb5b6', align: 'center',
        wordWrap: { width: 120 },
      }).setOrigin(0.5);

      container.add([bg, hitZone, nameText, statText, descText]);

      hitZone.on('pointerover', () => {
        nameText.setColor('#f5c86a');
        this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 150 });
      });

      hitZone.on('pointerout', () => {
        nameText.setColor('#52c6b8');
        this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 150 });
      });

      hitZone.on('pointerdown', () => {
        audio.playPickUp();
        const state = createInitialGameState(key);
        state.layerNodes = generateLayerRooms(1);
        this.scene.start('GameScene', { state });
      });
    });

    // 继续游戏
    let savedData = null;
    try {
      const raw = localStorage.getItem('deepDungeon_save');
      if (raw) savedData = JSON.parse(raw);
    } catch { /* ignore */ }

    if (savedData) {
      const continueBtn = this.add.text(cx, 560, '继续游戏', {
        fontFamily: FONT.family, fontSize: FONT.sizeNormal,
        color: '#74a8ff',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      continueBtn.on('pointerover', () => continueBtn.setColor('#f5c86a'));
      continueBtn.on('pointerout', () => continueBtn.setColor('#74a8ff'));
      continueBtn.on('pointerdown', () => {
        this.scene.start('GameScene', { state: savedData });
      });
    }

    this.buildSettingsBtn();
  }

  buildSettingsBtn() {
    const btn = this.add.text(this.scale.width - 40, 40, '⚙', {
      fontFamily: FONT.family, fontSize: '28px', color: '#aeb5b6',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#f2eee7'));
    btn.on('pointerout', () => btn.setColor('#aeb5b6'));
    btn.on('pointerdown', () => this.showSettings());
  }

  showSettings() {
    const cx = this.scale.width / 2, cy = this.scale.height / 2;
    const els = [];

    const overlay = this.add.zone(cx, cy, this.scale.width, this.scale.height)
      .setInteractive().setDepth(400);
    overlay.on('pointerdown', () => {});
    els.push(overlay);

    els.push(this.add.text(cx, cy - 60, '◆ 设置', {
      fontFamily: FONT.family, fontSize: '22px', color: '#f2eee7', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(402));

    const muteText = this.add.text(cx, cy, audio.muted ? '音量: 静音' : '音量: 开', {
      fontFamily: FONT.family, fontSize: '18px', color: '#f2eee7',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(402);

    muteText.on('pointerdown', () => {
      audio.toggleMute();
      muteText.setText(audio.muted ? '音量: 静音' : '音量: 开');
    });
    els.push(muteText);

    const close = this.add.text(cx, cy + 60, '关闭', {
      fontFamily: FONT.family, fontSize: '18px', color: '#f2eee7',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(402);
    close.on('pointerdown', () => els.forEach(e => e.destroy()));
    els.push(close);
  }
}
