import type { PlaygroundModule } from '../platform/runtime/types';

interface ModuleListProps {
  modules: PlaygroundModule[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ModuleList({ modules, selectedId, onSelect }: ModuleListProps) {
  return (
    <div className="module-list">
      {modules.map((module) => {
        const active = module.meta.id === selectedId;

        return (
          <button
            key={module.meta.id}
            type="button"
            className={`module-card${active ? ' is-active' : ''}`}
            onClick={() => onSelect(module.meta.id)}
          >
            <div className="module-card-top">
              <strong>{module.meta.title}</strong>
              <span>{module.meta.primaryRuntime}</span>
            </div>
            <p>{module.meta.description}</p>
            <div className="module-card-bottom">
              <span>{module.meta.status}</span>
              <span>{module.meta.supportsMobile ? 'mobile' : 'desktop'}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

