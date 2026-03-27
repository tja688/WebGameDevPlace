export type RuntimeKind = 'phaser' | 'pixi' | 'three' | 'babylon';

export type ModuleKind = 'playground' | 'template';

export type ModuleStatus = 'draft' | 'active' | 'stable' | 'template';

export interface PlaygroundMeta {
  id: string;
  title: string;
  description: string;
  kind: ModuleKind;
  primaryRuntime: RuntimeKind;
  status: ModuleStatus;
  tags: string[];
  supportsMobile: boolean;
  entryPath: string;
  accent: string;
}

export interface RuntimeMountContext {
  container: HTMLDivElement;
  module: PlaygroundMeta;
  debug: boolean;
  report: (message: string) => void;
}

export interface RuntimeHandle {
  resize: () => void;
  pause: () => void;
  resume: () => void;
  destroy: () => void;
}

export interface RuntimeAdapter {
  runtime: RuntimeKind;
  mount(context: RuntimeMountContext): RuntimeHandle | Promise<RuntimeHandle>;
}

export interface PlaygroundModule {
  meta: PlaygroundMeta;
  createAdapter: () => RuntimeAdapter;
}
