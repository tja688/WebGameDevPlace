import type { ProjectModule } from '../../platform/runtime/types';
import { meta } from './meta';
import { createGunfightmanPracticeAdapter } from './runtime';

export const gunfightmanPractice: ProjectModule = {
  meta,
  createAdapter: createGunfightmanPracticeAdapter,
};
