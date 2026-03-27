import type { RuntimeAdapter, RuntimeHandle, RuntimeMountContext } from '../types';

export function createPhaserAdapter(options: { accent: string; title: string }): RuntimeAdapter {
  return {
    runtime: 'phaser',
    async mount(context: RuntimeMountContext): Promise<RuntimeHandle> {
      const { default: Phaser } = await import('phaser');
      context.container.innerHTML = '';
      const host = document.createElement('div');
      host.className = 'phaser-host';
      context.container.append(host);

      const color = Phaser.Display.Color.HexStringToColor(options.accent).color;

      const sceneClass = class extends Phaser.Scene {
        private hero!: Phaser.GameObjects.Rectangle;
        private caption!: Phaser.GameObjects.Text;
        private orb!: Phaser.GameObjects.Arc;

        constructor() {
          super('demo-scene');
        }

        create() {
          const { width, height } = this.scale;
          this.cameras.main.setBackgroundColor('#0b1020');

          this.add.rectangle(width / 2, height / 2, width - 48, height - 48, 0x0f1730, 0.72);

          this.caption = this.add.text(32, 28, options.title, {
            color: '#f4f7ff',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
            fontSize: '24px',
            fontStyle: '700',
          });

          this.add.text(32, 64, 'Phaser 3 base template', {
            color: '#9aa6d1',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
            fontSize: '14px',
          });

          this.hero = this.add.rectangle(width / 2, height / 2 + 20, 140, 140, color, 1);
          this.orb = this.add.circle(width / 2, height / 2 + 20, 78, 0xffffff, 0.12);

          this.add.text(32, height - 78, 'Use this as the first 2D gameplay base.', {
            color: '#cdd4ec',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
            fontSize: '14px',
          });
        }

        update(_time: number, delta: number) {
          this.hero.rotation += delta * 0.0004;
          this.orb.rotation -= delta * 0.00025;
        }
      };

      const size = {
        width: Math.max(320, context.container.clientWidth),
        height: Math.max(280, context.container.clientHeight),
      };

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host,
        backgroundColor: '#0b1020',
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: size.width,
          height: size.height,
        },
        scene: [sceneClass],
      });

      const resizeObserver = new ResizeObserver(() => {
        game.scale.resize(
          Math.max(320, context.container.clientWidth),
          Math.max(280, context.container.clientHeight),
        );
      });
      resizeObserver.observe(context.container);

      return {
        resize() {
          game.scale.resize(
            Math.max(320, context.container.clientWidth),
            Math.max(280, context.container.clientHeight),
          );
        },
        pause() {
          game.scene.pause('demo-scene');
        },
        resume() {
          game.scene.resume('demo-scene');
        },
        destroy() {
          resizeObserver.disconnect();
          game.destroy(true);
          host.remove();
        },
      };
    },
  };
}
