const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { identity, discover, compareVersions, createUpgradeRunner, validateReleaseUrl } = require('../electron/safe-upgrade.cjs');
const params = { appId: identity.catalogId, latestVersion: '0.2.0', sha256: 'a'.repeat(64),
  downloadUrl: 'https://github.com/yaladzan92-creator/Alco-Releases/releases/download/alco-content-engine-v0.2.0/Setup.exe' };
const entry = (overrides = {}) => ({ key: identity.guid, name: identity.name, version: '0.1.0', executableVersion: '0.1.0',
  location: 'D:\\Custom Apps\\Content Engine', installLocation: 'D:\\Custom Apps\\Content Engine', scope: 'user', view: 'Registry64', ...overrides });
const installed = version => discover([entry({ version, executableVersion: version })], [], () => true);
function fixture(overrides = {}) {
  let state = installed('0.1.0');
  const calls = [], statuses = [];
  const io = { discover: async () => state, prepare: async () => { calls.push('prepare'); return 'cached.exe'; },
    verify: async () => true, supports: () => true, running: async () => false,
    confirm: async () => true, close: async () => { calls.push('close'); },
    install: async (file, args) => { calls.push(args); state = installed('0.2.0'); return 0; }, ...overrides };
  return { run: createUpgradeRunner(io), calls, statuses, io, emit: s => statuses.push(s) };
}
test('successful in-place upgrade waits, preserves custom location/scope, verifies before success', async () => {
  const f = fixture(); const result = await f.run(params, f.emit);
  assert.equal(result.installed, true);
  assert.equal(result.executablePath, 'D:\\Custom Apps\\Content Engine\\ALCO Content Engine.exe');
  assert.deepEqual(f.calls, ['prepare', ['/S', '/currentuser']]);
  assert.deepEqual(f.statuses, ['UPDATE_AVAILABLE','DOWNLOADING','VERIFYING','INSTALLING','VERIFYING_INSTALLATION','UPDATE_SUCCESS']);
});
for (const [name, overrides, input] of [
  ['already up to date', {}, { latestVersion: '0.1.0' }],
  ['older release rejected', {}, { latestVersion: '0.0.9' }],
  ['unknown location rejected', { discover: async () => ({ discoveryStatus: 'NOT_INSTALLED' }) }],
  ['unknown version rejected', { discover: async () => ({ ...installed('0.1.0'), discoveryStatus: 'INSTALLED_UNKNOWN_VERSION' }) }],
  ['multiple installations rejected', { discover: async () => ({ discoveryStatus: 'MULTIPLE_INSTALLATIONS' }) }],
  ['application still running', { running: async () => true }],
  ['user declines close', { running: async () => true, confirm: async () => false }],
  ['installer error exit', { install: async () => 2 }],
  ['installer completes but version remains old', { install: async () => 0 }],
  ['SHA256 mismatch', { verify: async () => false }],
  ['unexpected launch failure', { install: async () => { throw new Error('spawn EACCES'); } }],
  ['unknown installer behavior', { supports: () => false }],
  ['process discovery error', { running: async () => { throw new Error('access denied'); } }],
  ['invalid URL', {}, { downloadUrl: 'https://evil.test/setup.exe' }],
  ['invalid SHA256', {}, { sha256: 'z'.repeat(64) }],
]) {
  test(name, async () => {
    const f = fixture(overrides); const result = await f.run({ ...params, ...input }, f.emit);
    assert.equal(result.success, false); assert.ok(!f.statuses.includes('UPDATE_SUCCESS'));
    assert.equal(f.statuses.at(-1), 'UPDATE_FAILED');
    if (name === 'user declines close') assert.ok(!f.calls.includes('close'));
    if (['already up to date', 'older release rejected'].includes(name)) assert.deepEqual(f.calls, []);
  });
}
test('graceful shutdown only after explicit confirmation and all processes exit', async () => {
  let running = true; const f = fixture({ running: async () => running,
    confirm: async () => { f.calls.push('confirm'); return true; },
    close: async () => { f.calls.push('close'); running = false; } });
  assert.equal((await f.run(params, f.emit)).success, true);
  assert.deepEqual(f.calls.slice(0,3), ['prepare', 'confirm', 'close']);
  assert.ok(f.statuses.includes('AWAITING_USER_CONFIRMATION')); assert.ok(f.statuses.includes('CLOSING_APPLICATION'));
});
test('concurrent canonical and alias updates are rejected; lock survives until completion', async () => {
  let release; const waiting = new Promise(r => { release = r; });
  const f = fixture({ install: async () => { await waiting; return 1; } });
  const first = f.run(params, f.emit); await new Promise(r => setImmediate(r));
  assert.equal((await f.run({ ...params, appId: 'content-engine' })).success, false);
  release(); await first;
  assert.equal((await f.run({ ...params, latestVersion: '0.1.0' })).success, false);
});
test('installer completion is awaited before success or verification', async () => {
  let release; const waiting = new Promise(r => { release = r; });
  const f = fixture({ install: async () => { await waiting; return 1; } });
  const first = f.run(params, f.emit); await new Promise(r => setImmediate(r));
  assert.equal(f.statuses.at(-1), 'INSTALLING'); release(); await first;
  assert.ok(!f.statuses.includes('VERIFYING_INSTALLATION'));
});
test('machine installation uses allusers and preserves machine identity', async () => {
  let version = '0.1.0', args;
  const f = fixture({ discover: async () => discover([entry({ scope: 'machine', version, executableVersion: version })], [], () => true),
    install: async (_, a) => { args = a; version = '0.2.0'; return 0; } });
  assert.equal((await f.run(params)).success, true); assert.deepEqual(args, ['/S','/allusers']);
});
test('different path or scope after installation fails', async () => {
  for (const change of [{ location: 'C:\\Second', installLocation: 'C:\\Second' }, { scope: 'machine' }]) {
    let after = false;
    const f = fixture({ discover: async () => after ? discover([entry({ version: '0.2.0', executableVersion: '0.2.0', ...change })], [], () => true) : installed('0.1.0'),
      install: async () => { after = true; return 0; } });
    assert.equal((await f.run(params)).success, false);
  }
});
test('custom directory discovered from strict NSIS identity', () => {
  const result = discover([entry()], [], () => true);
  assert.equal(result.directory, entry().location); assert.equal(result.discoveryStatus, 'INSTALLED_KNOWN_VERSION');
});
test('NSIS display name may contain its exact registered version', () => {
  assert.equal(discover([entry({ name: identity.name + ' 0.1.0' })], [], () => true).discoveryStatus, 'INSTALLED_KNOWN_VERSION');
  assert.equal(discover([entry({ name: identity.name + ' Other' })], [], () => true).discoveryStatus, 'UNSUPPORTED_INSTALLATION');
  assert.equal(discover([entry(), entry({ key: 'custom-guid', name: identity.name + ' 0.1.0' })], [], () => true).discoveryStatus, 'MULTIPLE_INSTALLATIONS');
});
test('persistent lock blocks independent runners and releases after failure', async () => {
  let locked = false, unlocks = 0;
  const acquire = () => {
    if (locked) throw new Error('lock exists');
    locked = true; return () => { locked = false; unlocks++; };
  };
  let release; const wait = new Promise(r => { release = r; });
  const first = fixture({ acquire, install: async () => { await wait; return 1; } });
  const second = fixture({ acquire });
  const pending = first.run(params); await new Promise(r => setImmediate(r));
  assert.equal((await second.run(params)).success, false); assert.equal(locked, true);
  release(); await pending; assert.equal(locked, false); assert.equal(unlocks, 1);
  assert.equal((await second.run(params)).success, true); assert.equal(unlocks, 2);
});
test('browser and main semver implementations stay identical', () => {
  const browser = fs.readFileSync(path.join(__dirname,'../src/utils/upgradeVersion.ts'),'utf8')
    .replace(/^\/\/[^\n]*\n/,'').replace('export function parseVersion(v: string): [bigint, bigint, bigint, string] | null','function parseVersion(v)')
    .replace('export function compareVersions(a: string, b: string)','function compareVersions(a, b)').trim();
  const main = fs.readFileSync(path.join(__dirname,'../electron/upgrade-version.cjs'),'utf8').split('module.exports')[0].trim();
  assert.equal(browser, main);
});
test('missing exe, conflicting install registry, impostor identity, dev builds fail closed', () => {
  assert.equal(discover([entry()], [], () => false).discoveryStatus, 'UNSUPPORTED_INSTALLATION');
  for (const change of [{ installLocation: 'C:\\Other' }, { key: 'other-app' }, { location: 'C:\\repo\\dist-electron\\win-unpacked' }]) {
    assert.equal(discover([entry(change)], [], () => true).discoveryStatus, 'UNSUPPORTED_INSTALLATION');
  }
  assert.equal(discover([], ['C:\\repo\\dist-electron\\win-unpacked\\ALCO Content Engine.exe'], () => true).discoveryStatus, 'NOT_INSTALLED');
});
test('multiple registry matches never select first; unknown version and fallback are distinct', () => {
  assert.equal(discover([entry(),entry({ scope: 'machine' })], [], () => true).discoveryStatus, 'MULTIPLE_INSTALLATIONS');
  assert.equal(discover([entry({ version: 'invalid' })], [], () => true).discoveryStatus, 'INSTALLED_UNKNOWN_VERSION');
  assert.equal(discover([entry({ executableVersion: '0.0.9' })], [], () => true).discoveryStatus, 'INSTALLED_UNKNOWN_VERSION');
  assert.equal(discover([], ['C:\\Apps\\ALCO Content Engine.exe'], () => true).discoveryStatus, 'UNSUPPORTED_INSTALLATION');
});
test('existing data/license/settings/backup bytes are preserved in mocked upgrade', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alco-upgrade-test-'));
  try {
    const files = ['userData','projects','license','settings','backups'].map(n => path.join(directory,n));
    files.forEach(file => fs.writeFileSync(file, 'existing user content'));
    const f = fixture(); assert.equal((await f.run(params)).success, true);
    files.forEach(file => assert.equal(fs.readFileSync(file,'utf8'), 'existing user content'));
    // This proves Hub orchestration has no data deletion effect, not the real NSIS binary.
    assert.deepEqual(f.calls, ['prepare',['/S','/currentuser']]);
  } finally { fs.rmSync(directory, { recursive: true }); }
});
test('semver does not sanitize garbage, supports numeric prerelease order', () => {
  assert.equal(compareVersions('0.1.0-beta.10','0.1.0-beta.2'), 1);
  assert.equal(compareVersions('0.1.0-beta.2','0.1.0'), -1);
  for (const invalid of ['', '1.2garbage','1.2.3.4','01.2.3','1.2.3-01','../../1.2.3']) assert.equal(compareVersions(invalid,'1.2.3'), null);
});
test('installer URLs reject alternate hosts, credentials, other repos and executables outside releases', () => {
  assert.equal(validateReleaseUrl(params.downloadUrl), true);
  for (const url of ['https://github.com.evil.test/x.exe','https://u:p@github.com/yaladzan92-creator/Alco-Releases/releases/download/tag/setup.exe',
    'https://github.com/other/repo/releases/download/tag/setup.exe','file:///C:/setup.exe']) assert.equal(validateReleaseUrl(url), false);
});
