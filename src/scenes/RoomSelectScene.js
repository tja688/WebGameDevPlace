import { Scene } from 'phaser';
import { FONT } from '../config.js';
import { audio } from '../audio/AudioManager.js';
import { generateRoomCards, generateLayerRooms } from '../core/dungeon.js';
import { saveGame } from '../core/gameState.js';
import { delay, tweenFadeIn, tweenPop } from '../utils/tweens.js';

export class RoomSelectScene extends Scene {
  constructor() {
    super('RoomSelectScene');
  }

  init(data) {
    this.gameState = data.state;
    this.options = data.options || [];
  }

  create() {
    audio.startBgm();

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // 背景由 Phaser Game 配置统一处理

    this.add.text(cx, 120, '选择下一个房间', {
      fontFamily: FONT.family,
      fontSize: FONT.sizeLarge,
      color: '#f2eee7',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const roomNames = {
      normal: '普通战斗',
      elite: '精英战斗',
      shop: '商店',
      gold: '金币房',
      chest: '宝箱房',
      attr: '属性房',
    };

    const roomDescs = {
      normal: '面对普通怪物。',
      elite: '更强的怪物，更好的奖励。',
      shop: '购买强化和道具。',
      gold: '额外获得金币。',
      chest: '额外发现宝箱。',
      attr: '提升一项属性。',
    };

    const roomColors = {
      normal: '#f2eee7',
      elite: '#e76457',
      shop: '#f5c86a',
      gold: '#f5c86a',
      chest: '#f5c86a',
      attr: '#7ec86a',
    };

    const startX = cx - (this.options.length - 1) * 160 / 2;

    this.options.forEach((roomType, i) => {
      const x = startX + i * 160;
      const y = cy;

      const container = this.add.container(x, y);

      const hitZone = this.add.zone(0, 0, 140, 180).setInteractive({ useHandCursor: true });

      const name = this.add.text(0, -40, roomNames[roomType] || roomType, {
        fontFamily: FONT.family,
        fontSize: '20px',
        color: roomColors[roomType] || '#f2eee7',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const desc = this.add.text(0, 20, roomDescs[roomType] || '', {
        fontFamily: FONT.family,
        fontSize: '14px',
        color: '#aeb5b6',
        align: 'center',
        wordWrap: { width: 120 },
      }).setOrigin(0.5);

      const arrow = this.add.text(0, 70, '→', {
        fontFamily: FONT.family,
        fontSize: '28px',
        color: '#f5c86a',
      }).setOrigin(0.5).setAlpha(0);

      container.add([hitZone, name, desc, arrow]);

      tweenFadeIn(this, container, 400);

      hitZone.on('pointerover', () => {
        name.setColor('#f5c86a');
        arrow.setAlpha(1);
        this.tweens.add({ targets: container, scaleX: 1.08, scaleY: 1.08, duration: 150 });
      });

      hitZone.on('pointerout', () => {
        name.setColor(roomColors[roomType] || '#f2eee7');
        arrow.setAlpha(0);
        this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 150 });
      });

      hitZone.on('pointerdown', async () => {
        audio.playPickUp();
        await tweenPop(this, container, 200);
        this.enterRoom(roomType);
      });
    });

    // 保存按钮
    const saveBtn = this.add.text(cx, this.scale.height - 60, '保存进度并退出', {
      fontFamily: FONT.family, fontSize: '16px', color: '#74a8ff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    saveBtn.on('pointerover', () => saveBtn.setColor('#f5c86a'));
    saveBtn.on('pointerout', () => saveBtn.setColor('#74a8ff'));
    saveBtn.on('pointerdown', () => {
      saveGame(this.gameState);
      this.showToast('已保存进度');
    });

    // 设置按钮
    this.createSettingsButton();
  }

  enterRoom(roomType) {
    this.gameState.nodeIndex++;
    this.scene.start('GameScene', {
      state: {
        ...this.gameState,
        currentRoom: roomType,
        grid: [],
      },
    });
  }

  showToast(message) {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2 + 120;
    const toast = this.add.text(cx, cy, message, {
      fontFamily: FONT.family, fontSize: '18px', color: '#f5c86a', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: toast,
      y: cy - 30,
      alpha: 0,
      duration: 1500,
      ease: 'Quad.easeOut',
      onComplete: () => toast.destroy(),
    });
  }

  createSettingsButton() {
    const btn = this.add.text(this.scale.width - 40, 40, '⚙', {
      fontFamily: FONT.family, fontSize: '28px', color: '#aeb5b6',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#f2eee7'));
    btn.on('pointerout', () => btn.setColor('#aeb5b6'));
    btn.on('pointerdown', () => this.showSettings());
  }

  showSettings() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    const overlay = this.add.zone(cx, cy, this.scale.width, this.scale.height).setInteractive().setDepth(400);
    overlay.on('pointerdown', () => {});
    const title = this.add.text(cx, cy - 100, '◆ 设置', {
      fontFamily: FONT.family, fontSize: FONT.sizeLarge, color: '#f2eee7', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(402);

    const muteText = this.add.text(cx, cy - 30, audio.muted ? '音量: 静音' : '音量: 开', {
      fontFamily: FONT.family, fontSize: FONT.sizeNormal, color: '#f2eee7',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(402);

    muteText.on('pointerdown', () => {
      audio.toggleMute();
      muteText.setText(audio.muted ? '音量: 静音' : '音量: 开');
    });

    const menuBtn = this.add.text(cx, cy + 30, '回到主菜单', {
      fontFamily: FONT.family, fontSize: FONT.sizeNormal, color: '#e76457',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(402);

    menuBtn.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    const close = this.add.text(cx, cy + 90, '关闭', {
      fontFamily: FONT.family, fontSize: FONT.sizeNormal, color: '#f2eee7',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(402);

    close.on('pointerdown', () => {
      overlay.destroy();
      title.destroy();
      muteText.destroy();
      menuBtn.destroy();
      close.destroy();
    });
  }
}
