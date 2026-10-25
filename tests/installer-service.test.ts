import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { EcosystemApp, AppInstallProgress } from '../src/types';
import { startAppInstallation, startAppUpgrade, retryAppInstallation } from '../src/services/installerService';

test('renderer service sends distinct install/upgrade operations and preserves operation on failures', async () => {
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  const calls: any[] = [];
  const events: AppInstallProgress[] = [];
  const app = { id: 'alco-integration-fixture', name: 'ALCO Integration Fixture', version: '1.0.0', latestVersion: '1.1.0',
    downloadUrl: 'https://github.com/yaladzan92-creator/Alco-Releases/releases/download/tag/setup.exe', sha256: 'a'.repeat(64) } as EcosystemApp;
  try {
    Object.defineProperty(globalThis,'localStorage',{ configurable: true, value: { getItem: () => null, setItem() {}, removeItem() {} } });
    globalThis.window = { alcoHub: { downloadAndInstallApp: async (params: any) => {
      calls.push(params); return { success: false, error: 'Fixture failure' };
    } } } as unknown as Window & typeof globalThis;
    await startAppInstallation(app, p => events.push(p));
    await startAppUpgrade(app, p => events.push(p));
    await retryAppInstallation(app, p => events.push(p));
    assert.deepEqual(calls.map(c => c.operation),['install','upgrade','install']);
    assert.deepEqual(events.map(e => e.status),['INSTALL_FAILED','UPDATE_FAILED','INSTALL_FAILED']);
    assert.deepEqual(events.map(e => e.operation),['install','upgrade','install']);
  } finally {
    if (previousWindow === undefined) delete (globalThis as any).window; else globalThis.window = previousWindow;
    if (previousStorage === undefined) delete (globalThis as any).localStorage;
    else Object.defineProperty(globalThis,'localStorage',{ configurable: true, value: previousStorage });
  }
});
