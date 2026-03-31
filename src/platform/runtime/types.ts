export type RuntimeKind = 'phaser' | 'pixi' | 'three' | 'babylon';

export type ProjectStatus = 'draft' | 'active' | 'stable';

export interface ProjectMeta {
  id: string;
  title: string;
  description: string;
  primaryRuntime: RuntimeKind;
  status: ProjectStatus;
  tags: string[];
  supportsMobile: boolean;
  entryPath: string;
  accent: string;
}

export interface RuntimeMountContext {
  container: HTMLDivElement;
  module: ProjectMeta;
  debug: boolean;
  report: (message: string) => void;
}

export interface RuntimePauseStat {
  label: string;
  value: string;
}

export interface RuntimePauseMeter {
  label: string;
  value: number;
}

export interface RuntimePauseSnapshot {
  accent?: string;
  kicker?: string;
  title?: string;
  subtitle?: string;
  statusLine?: string;
  stats?: RuntimePauseStat[];
  meters?: RuntimePauseMeter[];
  tips?: string[];
}

export interface RuntimeHandle {
  resize: () => void;
  pause: () => void;
  resume: () => void;
  destroy: () => void;
  getPauseSnapshot?: () => RuntimePauseSnapshot | null;
}

export interface RuntimeAdapter {
  runtime: RuntimeKind;
  mount(context: RuntimeMountContext): RuntimeHandle | Promise<RuntimeHandle>;
}

export interface ProjectModule {
  meta: ProjectMeta;
  createAdapter: () => RuntimeAdapter;
}
