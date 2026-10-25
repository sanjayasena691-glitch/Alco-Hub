const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { identity } = require('../electron/safe-upgrade.cjs');
function loadAdapter(queryError = false) {
  const child = new EventEmitter(), calls = [];
  const code = fs.readFileSync(path.join(__dirname,'../electron/windows-upgrade.cjs'),'utf8');
  const entries = [{ key: identity.guid, name: identity.name + ' 0.1.0', version: '0.1.0', executableVersion: '0.1.0',
    location: 'D:\\Custom Apps\\Engine', installLocation: 'D:\\Custom Apps\\Engine', scope: 'user', view: 'Registry64' }];
  const module = { exports: {} };
  vm.runInNewContext(code, { module, Buffer, setTimeout,
    process: { platform: 'win32', env: { SystemRoot: 'C:\\Windows' } },
    require: name => {
      if (name === 'path') return path.win32;
      if (name === 'fs') return { existsSync: () => true, statSync: () => ({ isFile: () => true }), realpathSync: p => p };
      if (name === './upgrade-profiles.json') return [];
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
