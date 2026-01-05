const { spawn } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');

function runCommand(label, command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: { ...process.env, ...env },
      stdio: 'inherit'
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${label} failed with code ${code}`));
      }
    });
  });
}

async function main() {
  const timeoutMs = Number.parseInt(process.env.E2E_ALL_TIMEOUT_MS || '60000', 10);
  process.env.NODE_OPTIONS = process.env.NODE_OPTIONS || '';
  const env = { E2E_ALL_TIMEOUT_MS: String(timeoutMs) };
  await runCommand(
    'task-manager e2e',
    'npm',
    ['--prefix', path.join(repoRoot, 'apps', 'task-manager'), 'run', 'e2e'],
    env
  );
  await runCommand(
    'robokit-proxy e2e',
    'npm',
    ['--prefix', path.join(repoRoot, 'apps', 'robokit-proxy'), 'run', 'e2e'],
    env
  );
  console.log('e2e-all: ok');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
