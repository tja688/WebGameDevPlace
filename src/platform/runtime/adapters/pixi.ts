import { createPlaceholderAdapter } from './dom';

export function createPixiAdapter(title: string, description: string, accent: string) {
  return createPlaceholderAdapter({
    runtime: 'pixi',
    title,
    description,
    accent,
  });
}

