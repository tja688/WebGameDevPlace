import { useEffect, useRef } from 'react';
import type { ProjectModule, RuntimeHandle } from '../platform/runtime/types';

interface ProjectViewportProps {
  project: ProjectModule;
  paused: boolean;
  onHandleChange?: (handle: RuntimeHandle | null) => void;
}

export function ProjectViewport({ project, paused, onHandleChange }: ProjectViewportProps) {
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
    onHandleChange?.(null);
    container.innerHTML = '';
    container.dataset.state = 'loading';
    container.textContent = 'Loading project runtime...';

    const adapter = project.createAdapter();
    Promise.resolve(
      adapter.mount({
        container,
        module: project.meta,
        debug: false,
        report: (message) => {
          console.info(`[${project.meta.id}] ${message}`);
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
        onHandleChange?.(handle);
        if (paused) {
          handle.pause();
        } else {
          handle.resize();
        }
      })
      .catch((error: unknown) => {
        if (disposed) {
          return;
        }

        console.error(error);
        container.dataset.state = 'error';
        container.textContent = 'Project runtime failed to boot.';
      });

    return () => {
      disposed = true;
      handleRef.current?.destroy();
      handleRef.current = null;
      onHandleChange?.(null);
      container.innerHTML = '';
    };
  }, [project]);

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) {
      return;
    }

    if (paused) {
      handle.pause();
      return;
    }

    handle.resume();
    handle.resize();
  }, [paused]);

  return <div ref={viewportRef} className="project-viewport" />;
}
