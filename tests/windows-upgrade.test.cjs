const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { identity } = require('../electron/safe-upgrade.cjs');
function loadAdapter(queryError = false, options = {}) {
  const child = new EventEmitter(), calls = [];
  const code = fs.readFileSync(path.join(__dirname,'../electron/windows-upgrade.cjs'),'utf8');
  const entries = options.entries || [{ key: identity.guid, name: identity.name + ' 0.1.0', version: '0.1.0', executableVersion: '0.1.0',
    location: 'D:\\Custom Apps\\Engine', installLocation: 'D:\\Custom Apps\\Engine', scope: 'user', view: 'Registry64' }];
  const module = { exports: {} };
  vm.runInNewContext(code, { module, Buffer, setTimeout,
    process: { platform: 'win32', env: { SystemRoot: 'C:\\Windows' } },
    require: name => {
      if (name === 'path') return path.win32;
      if (name === 'fs') return { existsSync: () => true, statSync: () => ({ isFile: () => true }), realpathSync: p => p };
      if (name === './upgrade-profiles.json') return options.profiles || [];
      if (name === './safe-upgrade.cjs') return require('../electron/safe-upgrade.cjs');
      if (name === 'child_process') return {
        spawn: (...args) => { calls.push(args); return child; },
        execFile: (file,args,options,cb) => { calls.push([file,args,options]);
          const script = Buffer.from(args.at(-1),'base64').toString('utf16le');
          queueMicrotask(() => cb(queryError ? new Error('failed') : null, script.includes('ConvertTo-Json') ? JSON.stringify(entries) : '0'));
        },
      };
      throw new Error('unexpected dependency');
    },
  });
  return { child, calls, api: module.exports };
}
test('Windows installer uses explicit arguments, shell disabled, and awaits close', async () => {
  const h = loadAdapter(); let settled = false;
  const promise = h.api.install('C:\\cache\\setup.exe',['/S','/currentuser']).then(code => { settled = true; return code; });
  await Promise.resolve(); assert.equal(settled, false);
  assert.equal(h.calls[0][2].shell, false); assert.equal(h.calls[0][2].detached, false);
  assert.deepEqual(Array.from(h.calls[0][1]), ['/S','/currentuser']);
  h.child.emit('close',0,null); assert.equal(await promise,0);
});
test('Windows spawn failure and signal are rejected without fallback execution', async () => {
  for (const event of ['error','close']) {
    const h = loadAdapter(); const promise = h.api.install('C:\\cache\\setup.exe',['/S']);
    if (event === 'error') h.child.emit('error',new Error('EACCES')); else h.child.emit('close',null,'SIGTERM');
    await assert.rejects(promise); assert.equal(h.calls.length,1);
  }
});
test('Windows registry adapter recognizes a custom directory and fails closed on query error', async () => {
  const h = loadAdapter();
  assert.equal((await h.api.discoverWindows()).directory,'D:\\Custom Apps\\Engine');
  assert.equal(h.calls[0][2].shell,false);
  assert.equal((await loadAdapter(true).api.discoverWindows()).discoveryStatus,'UNSUPPORTED_INSTALLATION');
  await assert.rejects(loadAdapter(true).api.running());
});
const autoMotion = { id: 'alco-auto-motion', label: 'ALCO Auto Motion', executableNames: ['ALCO Auto Motion.exe'] };
const motionRow = { key: 'motion-guid', name: 'ALCO Auto Motion 1.2.3', version: '1.2.3', executableVersion: '1.2.3',
  location: 'D:\\Custom Apps\\Auto Motion', scope: 'user', view: 'Registry64' };
test('other ALCO apps verify custom registry directories and executable versions for first installation', async () => {
  const h = loadAdapter(false,{ entries: [motionRow] });
  const installed = await h.api.discoverForApp(autoMotion);
  assert.equal(installed.discoveryStatus,'INSTALLED_KNOWN_VERSION'); assert.equal(installed.version,'1.2.3');
  assert.equal(installed.executablePath,'D:\\Custom Apps\\Auto Motion\\ALCO Auto Motion.exe');
  assert.equal(h.calls[0][2].env.ALCO_DISCOVERY_NAME,'ALCO Auto Motion');
  assert.equal(h.calls[0][2].env.ALCO_DISCOVERY_EXE,'ALCO Auto Motion.exe');
});
test('generic discovery fails closed for duplicate, development, invalid identity and stale executable versions', async () => {
  for (const [rows, expected] of [
    [[motionRow,{ ...motionRow, scope: 'machine' }],'MULTIPLE_INSTALLATIONS'],
    [[{ ...motionRow, name: 'Other App' }],'UNSUPPORTED_INSTALLATION'],
    [[{ ...motionRow, installLocation: 'D:\\Another Install' }],'UNSUPPORTED_INSTALLATION'],
    [[{ ...motionRow, location: 'D:\\repo\\win-unpacked' }],'UNSUPPORTED_INSTALLATION'],
    [[{ ...motionRow, executableVersion: '1.2.2' }],'INSTALLED_UNKNOWN_VERSION'],
  ]) assert.equal((await loadAdapter(false,{ entries: rows }).api.discoverForApp(autoMotion)).discoveryStatus,expected);
});
test('first-install discovery distinguishes absent from filesystem-only installations', async () => {
  const h = loadAdapter(false,{ entries: [] });
  assert.equal((await h.api.discoverForApp(autoMotion)).discoveryStatus,'NOT_INSTALLED');
  assert.equal((await h.api.discoverForApp(autoMotion,['D:\\Apps\\ALCO Auto Motion.exe'])).discoveryStatus,'UNSUPPORTED_INSTALLATION');
});
test('Windows upgrade adapter keeps empty approvals and machine scope blocked', async () => {
  const params = { appId: identity.catalogId, latestVersion: '0.2.0', sha256: 'a'.repeat(64),
    downloadUrl: 'https://github.com/yaladzan92-creator/Alco-Releases/releases/download/tag/setup.exe' };
  const io = { prepare: async () => 'verified.exe', verify: async () => true, confirm: async () => true };
  const unapproved = loadAdapter();
  assert.equal((await unapproved.api.createWindowsRunner(io)(params)).success,false);
  assert.ok(!unapproved.calls.some(call => call[0] === 'verified.exe'));
  const machine = loadAdapter(false,{ entries: [{ key: identity.guid, name: identity.name, version: '0.1.0', executableVersion: '0.1.0',
    location: 'C:\\Program Files\\ALCO Content Engine', installLocation: 'C:\\Program Files\\ALCO Content Engine', scope: 'machine', view: 'Registry64' }] });
  const result = await machine.api.createWindowsRunner(io)(params);
  assert.equal(result.success,false); assert.match(result.error,/per-machine/);
  assert.ok(!machine.calls.some(call => call[0] === 'verified.exe'));
});
