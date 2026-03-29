import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const cwd = process.cwd();
const playgroundsDir = resolve(cwd, 'src', 'playgrounds');
const viteBin = resolve(cwd, 'node_modules', 'vite', 'bin', 'vite.js');
const argv = process.argv.slice(2);

function readProjectIds() {
  return readdirSync(playgroundsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const metaPath = join(playgroundsDir, entry.name, 'meta.ts');

      try {
        const source = readFileSync(metaPath, 'utf8');
        const match = source.match(/id:\s*'([^']+)'/);
        return match ? [match[1]] : [];
      } catch {
        return [];
      }
    });
}

function parseProjectId(args) {
  const projectFlagIndex = args.indexOf('--project');
  if (projectFlagIndex === -1) {
    return null;
  }

  return args[projectFlagIndex + 1] ?? null;
}

if (argv.includes('--help') || argv.includes('-h')) {
  console.log('Usage:');
  console.log('  npm run dev:home');
  console.log('  npm run dev:project -- <project-id>');
  process.exit(0);
}

const projectId = parseProjectId(argv);
const knownProjectIds = readProjectIds();

if (projectId && !knownProjectIds.includes(projectId)) {
  console.error(`Unknown project id "${projectId}".`);
  console.error(`Available project ids: ${knownProjectIds.join(', ')}`);
  process.exit(1);
}

const openPath = projectId ? `/#/play/${projectId}` : '/#/';
const child = spawn(process.execPath, [viteBin, '--open', openPath], {
  cwd,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
