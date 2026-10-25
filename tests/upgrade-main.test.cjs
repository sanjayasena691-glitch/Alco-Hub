const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const { EventEmitter } = require('node:events');
const { createRequire } = require('node:module');
const mainFile = path.join(__dirname, '../electron/main.cjs');
const load = createRequire(mainFile);
function harness(t, contents = Buffer.from('fixture installer bytes'), behavior = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alco-main-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  let config, downloads = 0;
  const handlers = new Map();
  let installation = behavior.installation || { isInstalled: false, version: null, executablePath: null, discoveryStatus: 'NOT_INSTALLED' };
  const installs = [], upgrades = [], launches = [], discoveries = [];
  const windows = {
    createWindowsRunner: options => { config = options; return async params => { upgrades.push(params); return { success: false, error: 'blocked upgrade' }; }; },
    discoverForApp: async definition => { discoveries.push(definition.id); return installation; },
    runningForApp: async () => false,
    install: async (file, args) => { installs.push({ file, args }); installation = behavior.after || installation; return behavior.exit ?? 0; },
  };
  const electron = {
    shell: { openPath: async file => { launches.push(file); return behavior.openError || ''; } },
    app: { getPath: () => directory, whenReady: () => ({ then() {} }), on() {} },
    ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
    dialog: { showMessageBox: async () => ({ response: 0 }) },
  };
  const https = { get: (url, options, callback) => {
    downloads++;
    const request = new EventEmitter(); request.setTimeout = () => {};
    request.destroy = error => request.emit('error', error);
    queueMicrotask(() => {
      const response = Readable.from([contents]);
      response.statusCode = 200; response.headers = { 'content-length': String(contents.length) };
      callback(response);
    });
    return request;
  } };
  vm.runInNewContext(fs.readFileSync(mainFile,'utf8'), {
    require: name => name === 'electron' ? electron : name === 'https' ? https : name === './windows-upgrade.cjs'
      ? windows : load(name),
    __dirname: path.dirname(mainFile), process, console, Buffer, URL, setTimeout, clearTimeout,
  }, { filename: mainFile });
  const hash = crypto.createHash('sha256').update(contents).digest('hex');
  const params = { appId: 'alco-content-engine', latestVersion: '0.2.0', sha256: hash,
    downloadUrl: 'https://github.com/yaladzan92-creator/Alco-Releases/releases/download/tag/setup.exe' };
  return { directory, config, params, handlers, installs, upgrades, launches, discoveries, downloads: () => downloads };
}
test('main downloads, verifies and caches exact bytes; verified cache reused and force redownload works', async t => {
  const h = harness(t); const events = [];
  const file = await h.config.prepare(h.params, status => events.push(status));
  assert.equal(h.downloads(), 1); assert.ok(events.includes('VERIFYING'));
  assert.equal(await h.config.verify(file, h.params.sha256), true);
  assert.equal(await h.config.prepare(h.params, () => {}), file);
  assert.equal(h.downloads(), 1);
  await h.config.prepare({ ...h.params, forceRedownload: true }, () => {});
  assert.equal(h.downloads(), 2);
});
test('main rejects checksum mismatch and removes only its temporary download', async t => {
  const h = harness(t); const marker = path.join(h.directory, 'license.fixture'); fs.writeFileSync(marker, 'keep');
  await assert.rejects(h.config.prepare({ ...h.params, sha256: 'b'.repeat(64) }, () => {}), /SHA-256/);
  assert.equal(fs.readFileSync(marker,'utf8'), 'keep');
  assert.deepEqual(fs.readdirSync(path.join(h.directory,'installer-cache')), []);
});
test('tampered cache is replaced; verification never accepts installer outside cache', async t => {
  const h = harness(t);
  const file = await h.config.prepare(h.params, () => {});
  fs.writeFileSync(file, 'tampered');
  await h.config.prepare(h.params, () => {});
  assert.equal(h.downloads(), 2);
  const external = path.join(h.directory,'outside.exe'); fs.copyFileSync(file,external);
  assert.equal(await h.config.verify(external,h.params.sha256), false);
});
test('main lock excludes concurrent sessions and prevents cache cleanup', async t => {
  const h = harness(t); const release = h.config.acquire();
  assert.throws(() => h.config.acquire(), /terkunci/);
  const clear = await h.handlers.get('clear-installer-cache')(null, 'alco-content-engine');
  assert.equal(clear.success, false);
  assert.equal(fs.existsSync(path.join(h.directory,'installer-cache','alco-content-engine.upgrade.lock')), true);
  release(); const nextRelease = h.config.acquire(); nextRelease();
});
test('native closure confirmation defaults to cancel', async t => {
  const h = harness(t); assert.equal(await h.config.confirm(), false);
});
const installedFixture = { isInstalled: true, version: '0.2.0', executablePath: 'D:\\Custom Apps\\Engine\\ALCO Content Engine.exe',
  discoveryStatus: 'INSTALLED_KNOWN_VERSION', source: 'registry' };
const event = events => ({ sender: { send: (_, payload) => events.push(payload) } });
for (const appId of ['alco-content-engine','alco-auto-motion']) {
  test('IPC interactive first installation restores ' + appId + ' without invoking upgrade', async t => {
    const h = harness(t, undefined, { after: installedFixture }); const events = [];
    const result = await h.handlers.get('download-and-install-app')(event(events), { ...h.params, appId, operation: 'install' });
    assert.equal(result.installed,true); assert.equal(h.upgrades.length,0);
    assert.equal(h.installs.length,1); assert.deepEqual(Array.from(h.installs[0].args),[]);
    assert.equal(events.at(-1).status,'INSTALL_SUCCESS'); assert.equal(events.at(-1).operation,'install');
    assert.ok(h.installs[0].file.endsWith(appId + '-0.2.0.exe'));
  });
}
test('explicit upgrade routing cannot fall through to interactive install', async t => {
  const h = harness(t); const events = [];
  const result = await h.handlers.get('download-and-install-app')(event(events), { ...h.params, appId: 'content-engine', operation: 'upgrade' });
  assert.equal(result.success,false); assert.equal(h.upgrades.length,1); assert.equal(h.upgrades[0].appId,'alco-content-engine');
  assert.equal(h.installs.length,0); assert.equal(h.downloads(),0);
});
test('missing operation and first install over existing Content Engine cannot bypass upgrade', async t => {
  const h = harness(t, undefined, { installation: installedFixture }); const events = [];
  const handler = h.handlers.get('download-and-install-app');
  assert.equal((await handler(event(events), h.params)).success,false);
  assert.equal((await handler(event(events), { ...h.params, operation: 'install' })).success,false);
  assert.equal(h.installs.length,0); assert.equal(h.upgrades.length,0); assert.equal(h.downloads(),0);
});
test('catalog aliases keep their progress key while sharing canonical cache and lock', async t => {
  const h = harness(t, undefined, { after: installedFixture }); const events = [];
  assert.equal((await h.handlers.get('download-and-install-app')(event(events), { ...h.params, appId: 'creative-system', operation: 'install' })).installed,true);
  assert.ok(events.every(e => e.appId === 'creative-system'));
  assert.ok(h.installs[0].file.endsWith('alco-creative-system-0.2.0.exe'));
});
test('first install and upgrade share the same canonical transaction lock', async t => {
  const h = harness(t); const release = h.config.acquire({ appId: 'alco-content-engine' });
  try {
    const result = await h.handlers.get('download-and-install-app')(event([]),{ ...h.params, appId: 'content-engine', operation: 'install' });
    assert.equal(result.success,false); assert.equal(h.downloads(),0); assert.equal(h.installs.length,0);
  } finally { release(); }
});
test('Open Content Engine uses freshly discovered registry executable, including custom directories and alias', async t => {
  const h = harness(t, undefined, { installation: installedFixture });
  assert.equal((await h.handlers.get('open-desktop-app')(null, 'content-engine')).success,true);
  assert.deepEqual(h.launches,[installedFixture.executablePath]); assert.deepEqual(h.discoveries,['alco-content-engine']);
});
for (const discoveryStatus of ['NOT_INSTALLED','UNSUPPORTED_INSTALLATION','MULTIPLE_INSTALLATIONS','INSTALLED_UNKNOWN_VERSION']) {
  test('Open Content Engine refuses ' + discoveryStatus + ' without filesystem fallback', async t => {
    const h = harness(t, undefined, { installation: { ...installedFixture, discoveryStatus } });
    assert.equal((await h.handlers.get('open-desktop-app')(null,'alco-content-engine')).success,false);
    assert.equal(h.launches.length,0);
  });
}
test('Open App reports operating system launch errors', async t => {
  const h = harness(t, undefined, { installation: installedFixture, openError: 'Launch denied' });
  const result = await h.handlers.get('open-desktop-app')(null,'alco-content-engine');
  assert.equal(result.success,false); assert.equal(result.error,'Launch denied');
});
