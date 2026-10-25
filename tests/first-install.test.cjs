const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createFirstInstallRunner } = require('../electron/first-install.cjs');
const params = { operation: 'install', appId: 'alco-auto-motion', latestVersion: '1.2.3', sha256: 'a'.repeat(64),
  downloadUrl: 'https://github.com/yaladzan92-creator/Alco-Releases/releases/download/tag/setup.exe' };
const absent = { isInstalled: false, discoveryStatus: 'NOT_INSTALLED' };
const installed = { isInstalled: true, discoveryStatus: 'INSTALLED_KNOWN_VERSION', version: '1.2.3',
  executablePath: 'D:\\Custom Apps\\ALCO Auto Motion.exe' };
function fixture(overrides = {}) {
  let state = absent;
  const events = [], calls = [];
  const io = {
    acquire: async () => { calls.push('lock'); return () => calls.push('unlock'); },
    discover: async () => state, running: async () => false,
    prepare: async () => { calls.push('download'); return 'verified.exe'; }, verify: async () => true,
    install: async (_, args) => { calls.push(args); state = installed; return 0; }, ...overrides,
  };
  return { run: createFirstInstallRunner(io), calls, events, emit: status => events.push(status) };
}
for (const appId of ['alco-content-engine','alco-auto-motion','alco-creative-system']) {
  test('interactive first installation for ' + appId + ' does not require silent approval', async () => {
    const f = fixture(); const result = await f.run({ ...params, appId }, f.emit);
    assert.equal(result.installed, true);
    assert.deepEqual(f.calls, ['lock','download',[],'unlock']);
    assert.deepEqual(f.events,['DOWNLOADING','VERIFYING','INSTALLING','VERIFYING_INSTALLATION','INSTALL_SUCCESS']);
  });
}
for (const [name, overrides, input] of [
  ['already installed cannot bypass upgrade approval', { discover: async () => installed }],
  ['ambiguous installation', { discover: async () => ({ ...absent, discoveryStatus: 'MULTIPLE_INSTALLATIONS' }) }],
  ['registry query failure', { discover: async () => ({ ...absent, discoveryStatus: 'UNSUPPORTED_INSTALLATION' }) }],
  ['unknown installed version', { discover: async () => ({ ...installed, version: null, discoveryStatus: 'INSTALLED_UNKNOWN_VERSION' }) }],
  ['running application', { running: async () => true }],
  ['checksum mismatch', { verify: async () => false }],
  ['launch error', { install: async () => { throw new Error('spawn failed'); } }],
  ['installer cancellation', { install: async () => 2 }],
  ['exit zero without verified installation', { install: async () => 0 }],
  ['unsafe download URL', {}, { downloadUrl: 'https://evil.test/setup.exe' }],
  ['missing explicit operation', {}, { operation: undefined }],
  ['upgrade never falls through to interactive setup', {}, { operation: 'upgrade' }],
]) {
  test(name, async () => {
    const f = fixture(overrides); const result = await f.run({ ...params, ...input }, f.emit);
    assert.equal(result.success,false); assert.ok(!f.events.includes('INSTALL_SUCCESS'));
    if (f.calls.includes('lock')) assert.equal(f.calls.at(-1),'unlock');
  });
}
test('first installation rechecks absence after downloading to prevent a second installation', async () => {
  let reads = 0;
  const f = fixture({ discover: async () => ++reads === 1 ? absent : installed });
  assert.equal((await f.run(params,f.emit)).success,false); assert.ok(!f.calls.some(Array.isArray));
});
test('installer completion is awaited; no time-based installation success', async () => {
  let release;
  const done = new Promise(r => { release = r; });
  const f = fixture({ install: async () => { await done; return 2; } });
  const pending = f.run(params,f.emit); await new Promise(r => setImmediate(r));
  assert.equal(f.events.at(-1),'INSTALLING'); assert.ok(!f.calls.includes('unlock'));
  release(); await pending; assert.equal(f.events.at(-1),'INSTALL_FAILED');
});
