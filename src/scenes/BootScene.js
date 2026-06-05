import { Scene } from 'phaser';
import { audio } from '../audio/AudioManager.js';

export class BootScene extends Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // 无需加载外部资源，纯文字游戏
  }

  create() {
    audio.init();

    // 启动画面
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy - 60, '深入地牢', {
      fontFamily: '"Noto Sans SC", "Microsoft YaHei", sans-serif',
      fontSize: '64px',
      color: '#f5c86a',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const hint = this.add.text(cx, cy + 40, '点击任意处开始', {
      fontFamily: '"Noto Sans SC", "Microsoft YaHei", sans-serif',
      fontSize: '24px',
      color: '#aeb5b6',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: hint,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.input.once('pointerdown', () => {
      audio.resume();
      this.scene.start('MenuScene');
    });
  }
}
