import { createPlaceholderAdapter } from './dom';

export function createThreeAdapter(title: string, description: string, accent: string) {
  return createPlaceholderAdapter({
    runtime: 'three',
    title,
    description,
    accent,
  });
}

