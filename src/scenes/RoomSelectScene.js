import { Scene } from 'phaser';
import { FONT, COLORS } from '../config.js';
import { audio } from '../audio/AudioManager.js';
import { saveGame, getTotalStats } from '../core/gameState.js';
import { tweenFadeIn, tweenPop } from '../utils/tweens.js';

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

    this.add.text(cx, 100, '选择下一个房间', {
      fontFamily: FONT.family, fontSize: FONT.sizeLarge,
      color: '#f2eee7', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 当前状态提示
    const p = this.gameState.player;
    const s = getTotalStats(this.gameState);
    this.add.text(cx, 145, `第${this.gameState.layer}层 · 节点${this.gameState.nodeIndex + 1}/9 · ♥${p.hp} ⚔${s.atk} 🛡${s.def} · ${p.gold}金币`, {
      fontFamily: FONT.family, fontSize: '14px', color: '#aeb5b6',
    }).setOrigin(0.5);

    const roomInfo = {
      normal: { name: '普通战斗', desc: '面对普通怪物。', color: '#f2eee7', icon: '⚔' },
      elite: { name: '精英战斗', desc: '更强的怪物，更好的奖励。', color: '#e76457', icon: '💀' },
      shop: { name: '商店', desc: '购买强化和道具。', color: '#f5c86a', icon: '🏪' },
      gold: { name: '金币房', desc: '额外获得金币。', color: '#f5c86a', icon: '💰' },
      chest: { name: '宝箱房', desc: '额外发现宝箱。', color: '#f5c86a', icon: '📦' },
      attr: { name: '属性房', desc: '提升一项属性。', color: '#7ec86a', icon: '⬆' },
    };

    const gap = 170;
    const startX = cx - (this.options.length - 1) * gap / 2;

    this.options.forEach((roomType, i) => {
      const info = roomInfo[roomType] || { name: roomType, desc: '', color: '#f2eee7', icon: '?' };
      const x = startX + i * gap;
      const y = cy + 20;

      const container = this.add.container(x, y);

      // 背景
      const bg = this.add.graphics();
      bg.fillStyle(COLORS.panel, 0.8);
      bg.fillRoundedRect(-70, -80, 140, 160, 8);
      bg.lineStyle(1, COLORS.line, 0.6);
      bg.strokeRoundedRect(-70, -80, 140, 160, 8);

      const hitZone = this.add.zone(0, 0, 140, 160).setInteractive({ useHandCursor: true });

      const icon = this.add.text(0, -45, info.icon, {
        fontFamily: FONT.family, fontSize: '28px',
      }).setOrigin(0.5);

      const name = this.add.text(0, -10, info.name, {
        fontFamily: FONT.family, fontSize: '18px',
        color: info.color, fontStyle: 'bold',
      }).setOrigin(0.5);

      const desc = this.add.text(0, 25, info.desc, {
        fontFamily: FONT.family, fontSize: '13px',
        color: '#aeb5b6', align: 'center',
        wordWrap: { width: 120 },
      }).setOrigin(0.5);

      const arrow = this.add.text(0, 60, '→ 进入', {
        fontFamily: FONT.family, fontSize: '14px', color: '#f5c86a',
      }).setOrigin(0.5).setAlpha(0);

      container.add([bg, hitZone, icon, name, desc, arrow]);
      tweenFadeIn(this, container, 400);

      hitZone.on('pointerover', () => {
        name.setColor('#f5c86a');
        arrow.setAlpha(1);
        this.tweens.add({ targets: container, scaleX: 1.06, scaleY: 1.06, duration: 150 });
      });

      hitZone.on('pointerout', () => {
        name.setColor(info.color);
        arrow.setAlpha(0);
        this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 150 });
      });

      hitZone.on('pointerdown', () => {
        audio.playPickUp();
        // 禁用所有选项
        this.children.list.forEach(child => {
          if (child.type === 'Zone') child.removeInteractive();
        });
        tweenPop(this, container, 200).then(() => {
          this.enterRoom(roomType);
        }).catch(err => {
          console.error('[RoomSelect] enter error:', err);
          this.enterRoom(roomType);
        });
      });
    });

    // 保存按钮
    const saveBtn = this.add.text(cx, this.scale.height - 60, '保存进度并退出', {
      fontFamily: FONT.family, fontSize: '15px', color: '#74a8ff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    saveBtn.on('pointerover', () => saveBtn.setColor('#f5c86a'));
    saveBtn.on('pointerout', () => saveBtn.setColor('#74a8ff'));
    saveBtn.on('pointerdown', () => {
      saveGame(this.gameState);
      this.showToast('已保存进度');
    });

    this.buildSettingsBtn();
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
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: toast, y: cy - 30, alpha: 0,
      duration: 1500, ease: 'Quad.easeOut',
      onComplete: () => toast.destroy(),
    });
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

    els.push(this.add.text(cx, cy - 80, '◆ 设置', {
      fontFamily: FONT.family, fontSize: '22px', color: '#f2eee7', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(402));

    const muteText = this.add.text(cx, cy - 20, audio.muted ? '音量: 静音' : '音量: 开', {
      fontFamily: FONT.family, fontSize: '18px', color: '#f2eee7',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(402);

    muteText.on('pointerdown', () => {
      audio.toggleMute();
      muteText.setText(audio.muted ? '音量: 静音' : '音量: 开');
    });
    els.push(muteText);

    const menuBtn = this.add.text(cx, cy + 30, '回到主菜单', {
      fontFamily: FONT.family, fontSize: '18px', color: '#e76457',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(402);
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    els.push(menuBtn);

    const close = this.add.text(cx, cy + 80, '关闭', {
      fontFamily: FONT.family, fontSize: '18px', color: '#f2eee7',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(402);
    close.on('pointerdown', () => els.forEach(e => e.destroy()));
    els.push(close);
  }
}
