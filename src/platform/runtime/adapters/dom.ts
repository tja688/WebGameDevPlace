import type { RuntimeAdapter, RuntimeHandle, RuntimeMountContext, RuntimeKind } from '../types';

interface PlaceholderOptions {
  runtime: RuntimeKind;
  title: string;
  description: string;
  accent: string;
}

export function createPlaceholderAdapter(options: PlaceholderOptions): RuntimeAdapter {
  return {
    runtime: options.runtime,
    mount(context: RuntimeMountContext): RuntimeHandle {
      context.container.innerHTML = '';
      const host = document.createElement('div');
      host.className = 'runtime-placeholder';
      host.style.setProperty('--accent', options.accent);

      const badge = document.createElement('p');
      badge.className = 'runtime-placeholder-badge';
      badge.textContent = options.runtime;

      const title = document.createElement('h3');
      title.textContent = options.title;

      const body = document.createElement('p');
      body.textContent = options.description;

      const hint = document.createElement('p');
      hint.className = 'runtime-placeholder-hint';
      hint.textContent = context.debug
        ? 'This runtime slot is still a scaffold. Replace it with the real project adapter when implementation starts.'
        : 'Scaffold runtime slot';

      host.append(badge, title, body, hint);
      context.container.append(host);

      return {
        resize() {},
        pause() {},
        resume() {},
        destroy() {
          host.remove();
        },
      };
    },
  };
}
