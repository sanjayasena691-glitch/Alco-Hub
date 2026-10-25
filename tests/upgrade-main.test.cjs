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
function harness(t, contents = Buffer.from('fixture installer bytes')) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alco-main-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  let config, downloads = 0;
  const handlers = new Map();
  const electron = {
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
      ? { createWindowsRunner: options => { config = options; return async () => ({ success: false }); } } : load(name),
    __dirname: path.dirname(mainFile), process, console, Buffer, URL, setTimeout, clearTimeout,
  }, { filename: mainFile });
  const hash = crypto.createHash('sha256').update(contents).digest('hex');
  const params = { appId: 'alco-content-engine', latestVersion: '0.2.0', sha256: hash,
    downloadUrl: 'https://github.com/yaladzan92-creator/Alco-Releases/releases/download/tag/setup.exe' };
  return { directory, config, params, handlers, downloads: () => downloads };
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
