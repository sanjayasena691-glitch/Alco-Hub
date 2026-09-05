const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const staging = path.join(root, '.electron-build');
const output = path.join(root, 'dist-electron');

fs.rmSync(staging, { recursive: true, force: true });
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });
fs.cpSync(path.join(root, 'dist'), path.join(staging, 'dist'), { recursive: true });
fs.cpSync(path.join(root, 'electron'), path.join(staging, 'electron'), { recursive: true });

const packageJson = {
  name: 'alco-hub-desktop',
  version: '1.0.0',
  description: 'ALCO ecosystem desktop hub',
  author: 'Aladzan Corpora',
  main: 'electron/main.cjs',
  build: {
    appId: 'ai.alco.hub',
    productName: 'ALCO Hub',
    electronVersion: '44.1.0',
    directories: { output: '../dist-electron' },
    files: ['dist/**/*', 'electron/**/*'],
    asar: true,
    win: { target: [{ target: 'nsis', arch: ['x64'] }] },
    nsis: {
      oneClick: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
    },
  },
};

fs.writeFileSync(
  path.join(staging, 'package.json'),
  `${JSON.stringify(packageJson, null, 2)}\n`,
);

const builder = path.join(root, 'node_modules', 'electron-builder', 'cli.js');
const result = spawnSync(process.execPath, [builder, '--win', '--projectDir', staging], {
  cwd: root,
  stdio: 'inherit',
});

fs.rmSync(staging, { recursive: true, force: true });
process.exit(result.status ?? 1);
