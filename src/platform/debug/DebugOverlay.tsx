import type { ProjectModule } from '../runtime/types';

interface DebugOverlayProps {
  module: ProjectModule;
}

export function DebugOverlay({ module }: DebugOverlayProps) {
  return (
    <footer className="debug-overlay">
      <div>
        <span className="debug-label">module</span>
        <strong>{module.meta.id}</strong>
      </div>
      <div>
        <span className="debug-label">runtime</span>
        <strong>{module.meta.primaryRuntime}</strong>
      </div>
      <div>
        <span className="debug-label">tags</span>
        <strong>{module.meta.tags.join(', ')}</strong>
      </div>
      <div>
        <span className="debug-label">entry</span>
        <strong>{module.meta.entryPath}</strong>
      </div>
    </footer>
  );
}
