import { useEffect, useRef } from 'react';
import type { PlaygroundModule, RuntimeHandle } from '../platform/runtime/types';

interface ModuleViewportProps {
  module: PlaygroundModule;
}

export function ModuleViewport({ module }: ModuleViewportProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<RuntimeHandle | null>(null);

  useEffect(() => {
    const container = viewportRef.current;
    if (!container) {
      return;
    }

    let disposed = false;
    handleRef.current?.destroy();
    handleRef.current = null;
    container.innerHTML = '';
    container.dataset.state = 'loading';
    container.textContent = 'Loading runtime...';

    const adapter = module.createAdapter();
    Promise.resolve(
      adapter.mount({
        container,
        module: module.meta,
        debug: true,
        report: (message) => {
          console.info(`[${module.meta.id}] ${message}`);
        },
      }),
    )
      .then((handle) => {
        if (disposed) {
          handle.destroy();
          return;
        }

        container.dataset.state = 'ready';
        handleRef.current = handle;
        handle.resize();
      })
      .catch((error: unknown) => {
        if (disposed) {
          return;
        }

        console.error(error);
        container.dataset.state = 'error';
        container.textContent = 'Runtime failed to boot.';
      });

    return () => {
      disposed = true;
      handleRef.current?.destroy();
      handleRef.current = null;
      container.innerHTML = '';
    };
  }, [module]);

  return <div ref={viewportRef} className="module-viewport" />;
}
