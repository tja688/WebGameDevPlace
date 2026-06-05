// ============================================================
// 深入地牢 - 启动场景：生成程序化纹理
// ============================================================
import Phaser from 'phaser';
import { CARD_W, CARD_H, COLORS } from '../constants.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.generateTextures();
    this.scene.start('TitleScene');
  }

  generateTextures() {
    this.makeCardBack();
    this.makeCardFace('player', COLORS.playerCard, COLORS.playerBorder);
    this.makeCardFace('monster', COLORS.monsterCard, COLORS.monsterBorder);
    this.makeCardFace('trap', COLORS.trapCard, COLORS.trapBorder);
    this.makeCardFace('item', COLORS.itemCard, COLORS.itemBorder);
    this.makeCardFace('gold', COLORS.goldCard, COLORS.goldBorder);
    this.makeCardFace('treasure', COLORS.treasureCard, COLORS.treasureBorder);
    this.makeCardFace('food', COLORS.foodCard, COLORS.foodBorder);
    this.makeCardFace('shop', COLORS.shopCard, COLORS.shopBorder);
    this.makeCardFace('mentor', COLORS.mentorCard, COLORS.mentorBorder);
    this.makeCardFace('attribute', COLORS.attributeCard, COLORS.attributeBorder);
    this.makeEmptyCell();
    this.makeParticles();
    this.makeUIElements();
  }

  makeCardBack() {
    const g = this.add.graphics();
    const w = CARD_W, h = CARD_H, r = 8;

    // 阴影
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(3, 3, w, h, r);

    // 卡背主体
    g.fillStyle(COLORS.cardBack, 1);
    g.fillRoundedRect(0, 0, w, h, r);

    // 边框
    g.lineStyle(2, COLORS.cardBackBorder, 1);
    g.strokeRoundedRect(0, 0, w, h, r);

    // 内部装饰线框
    g.lineStyle(1, COLORS.cardBackPattern, 0.6);
    g.strokeRoundedRect(10, 10, w - 20, h - 20, 4);

    // 中心菱形图案
    const cx = w / 2, cy = h / 2;
    g.lineStyle(2, COLORS.cardBackBorder, 0.5);
    g.beginPath();
    g.moveTo(cx, cy - 28);
    g.lineTo(cx + 20, cy);
    g.lineTo(cx, cy + 28);
    g.lineTo(cx - 20, cy);
    g.lineTo(cx, cy - 28);
    g.strokePath();

    // 中心问号
    g.fillStyle(COLORS.cardBackBorder, 0.7);
    g.fillCircle(cx, cy, 12);

    g.generateTexture('card_back', w + 6, h + 6);
    g.destroy();
  }

  makeCardFace(key, bgColor, borderColor) {
    const g = this.add.graphics();
    const w = CARD_W, h = CARD_H, r = 8;

    // 阴影
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(3, 3, w, h, r);

    // 主体
    g.fillStyle(bgColor, 1);
    g.fillRoundedRect(0, 0, w, h, r);

    // 边框
    g.lineStyle(2, borderColor, 1);
    g.strokeRoundedRect(0, 0, w, h, r);

    // 顶部标题栏区域
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(4, 4, w - 8, 30, { tl: 4, tr: 4, bl: 0, br: 0 });

    // 底部信息区
    g.fillStyle(0x000000, 0.2);
    g.fillRoundedRect(4, h - 50, w - 8, 46, { tl: 0, tr: 0, bl: 4, br: 4 });

    g.generateTexture('card_' + key, w + 6, h + 6);
    g.destroy();
  }

  makeEmptyCell() {
    const g = this.add.graphics();
    const w = CARD_W, h = CARD_H, r = 8;
    g.fillStyle(COLORS.emptyCell, 1);
    g.fillRoundedRect(0, 0, w, h, r);
    g.lineStyle(1, COLORS.emptyCellBorder, 0.5);
    g.strokeRoundedRect(0, 0, w, h, r);
    // 虚线内框
    g.lineStyle(1, COLORS.emptyCellBorder, 0.3);
    g.strokeRoundedRect(8, 8, w - 16, h - 16, 4);
    g.generateTexture('empty_cell', w, h);
    g.destroy();
  }

  makeParticles() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();

    const g2 = this.add.graphics();
    g2.fillStyle(0xffffff, 1);
    g2.fillCircle(2, 2, 2);
    g2.generateTexture('particle_small', 4, 4);
    g2.destroy();
  }

  makeUIElements() {
    // HP bar background
    const g1 = this.add.graphics();
    g1.fillStyle(COLORS.hpBarBg, 1);
    g1.fillRoundedRect(0, 0, 160, 14, 3);
    g1.generateTexture('hp_bar_bg', 160, 14);
    g1.destroy();

    // HP bar fill
    const g2 = this.add.graphics();
    g2.fillStyle(COLORS.hpBar, 1);
    g2.fillRoundedRect(0, 0, 160, 14, 3);
    g2.generateTexture('hp_bar_fill', 160, 14);
    g2.destroy();

    // Button bg
    const g3 = this.add.graphics();
    g3.fillStyle(0x2a2550, 1);
    g3.fillRoundedRect(0, 0, 240, 50, 8);
    g3.lineStyle(2, 0x5a55a0, 1);
    g3.strokeRoundedRect(0, 0, 240, 50, 8);
    g3.generateTexture('btn_bg', 240, 50);
    g3.destroy();

    // Small button
    const g4 = this.add.graphics();
    g4.fillStyle(0x2a2550, 1);
    g4.fillRoundedRect(0, 0, 160, 40, 6);
    g4.lineStyle(2, 0x5a55a0, 1);
    g4.strokeRoundedRect(0, 0, 160, 40, 6);
    g4.generateTexture('btn_small', 160, 40);
    g4.destroy();

    // Highlight overlay for card cells
    const g5 = this.add.graphics();
    g5.lineStyle(3, COLORS.highlight, 0.8);
    g5.strokeRoundedRect(0, 0, CARD_W, CARD_H, 8);
    g5.generateTexture('cell_highlight', CARD_W, CARD_H);
    g5.destroy();

    // Panel background texture
    const g6 = this.add.graphics();
    g6.fillStyle(COLORS.panelBg, 1);
    g6.fillRoundedRect(0, 0, 64, 64, 4);
    g6.generateTexture('panel_tile', 64, 64);
    g6.destroy();
  }
}
