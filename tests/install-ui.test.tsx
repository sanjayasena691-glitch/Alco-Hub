import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UpdatesView } from '../src/components/UpdatesView';
import { ApplicationCard } from '../src/components/ApplicationCard';
import { getInstallProgressState } from '../src/utils/installProgress';
import { evaluateAppStatus } from '../src/utils/versioning';
import type { EcosystemApp, AppInstallProgress, InstallStatus } from '../src/types';

const app: EcosystemApp = {
  id: 'alco-content-engine', name: 'ALCO Content Engine', shortName: 'Content Engine',
  functionLabel: 'Content', description: '', packId: 'core', accent: 'purple', iconName: 'sparkles',
  pricingType: 'free', published: true, version: '0.1.0', latestVersion: '0.2.0', launchMode: 'desktop',
  downloadUrl: 'https://github.com/yaladzan92-creator/Alco-Releases/releases/download/tag/setup.exe', sha256: 'a'.repeat(64),
};
const installation = { isInstalled: true, version: '0.1.0', executablePath: 'D:\\Apps\\ALCO Content Engine.exe' };
const progress = (status: InstallStatus): AppInstallProgress => ({ appId: app.id, status, progress: 45, bytesReceived: 45, totalBytes: 100 });
const updateProps = { apps: [app], localInstallations: { [app.id]: installation }, onCheckUpdate() {}, onPerformUpdate() {} };
const cardProps = { app, installation, onOpenApp() {}, onInstallApp() {}, onUpdateApp() {} };
const busy: InstallStatus[] = ['UPDATE_AVAILABLE','DOWNLOADING','VERIFYING','AWAITING_USER_CONFIRMATION','CLOSING_APPLICATION','INSTALLING','VERIFYING_INSTALLATION'];
for (const status of busy) {
  test('both screens render busy state and never premature success for ' + status, () => {
    const p = progress(status);
    const updates = renderToStaticMarkup(<UpdatesView {...updateProps} installProgressMap={{ [app.id]: p }} />);
    const card = renderToStaticMarkup(<ApplicationCard {...cardProps} installProgress={p} />);
    for (const html of [updates, card]) {
      assert.match(html,/disabled=""/);
      assert.doesNotMatch(html,/berhasil diverifikasi|berhasil diperbarui/);
    }
    assert.equal(evaluateAppStatus(app,installation,p).canUpdate,false);
    assert.match(card, /app-btn-busy-alco-content-engine/);
    assert.doesNotMatch(updates,/>Update Sekarang</);
    if (status !== 'DOWNLOADING') {
      assert.ok(updates.includes(getInstallProgressState(p).label));
      assert.ok(card.includes(getInstallProgressState(p).label));
    }
  });
}
for (const status of ['UPDATE_FAILED','INSTALL_FAILED'] as InstallStatus[]) {
  test('both screens render failure and no success for ' + status, () => {
    const p = { ...progress(status), error: 'Verified failure fixture' };
    for (const html of [
      renderToStaticMarkup(<UpdatesView {...updateProps} installProgressMap={{ [app.id]: p }} />),
      renderToStaticMarkup(<ApplicationCard {...cardProps} installProgress={p} />),
    ]) { assert.match(html,/Verified failure fixture/); assert.doesNotMatch(html,/berhasil diverifikasi|berhasil diperbarui/); }
  });
}
for (const status of ['UPDATE_SUCCESS','INSTALL_SUCCESS'] as InstallStatus[]) {
  test('both screens render success only from verified terminal event ' + status, () => {
    const p = progress(status);
    const after = { ...installation, version: '0.2.0' };
    for (const html of [
      renderToStaticMarkup(<UpdatesView {...updateProps} localInstallations={{ [app.id]: after }} installProgressMap={{ [app.id]: p }} />),
      renderToStaticMarkup(<ApplicationCard {...cardProps} installation={after} installProgress={p} />),
    ]) { assert.match(html,/role="status"/); assert.match(html,/berhasil diverifikasi/); }
  });
}
test('legacy installed or installer-opened states are never treated as verified success', () => {
  for (const status of ['installer-opened','installed','waiting-completion'] as InstallStatus[]) {
    assert.equal(getInstallProgressState(progress(status)).success,false);
  }
});
test('Updates action invokes upgrade callback directly without timers or install fallback', () => {
  let updates = 0, installs = 0;
  const tree = UpdatesView({ ...updateProps, onPerformUpdate: () => { updates++; }, onInstallApp: () => { installs++; } });
  const nodes: any[] = [];
  function visit(node: any) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (node?.props) { nodes.push(node); visit(node.props.children); }
  }
  visit(tree);
  const button = nodes.find(node => node.type === 'button' && React.Children.toArray(node.props.children).some((c: any) => c?.props?.children === 'Update Sekarang'));
  assert.ok(button);
  button.props.onClick();
  assert.equal(updates,1);
  assert.equal(installs,0);
  assert.doesNotMatch(renderToStaticMarkup(tree),/berhasil diperbarui/);
});
test('retrying a first-install failure preserves install operation instead of routing to upgrade', () => {
  let updates = 0, installs = 0;
  const tree = UpdatesView({ ...updateProps,
    installProgressMap: { [app.id]: { ...progress('INSTALL_FAILED'), operation: 'install' } },
    onPerformUpdate: () => { updates++; }, onInstallApp: () => { installs++; } });
  const nodes: any[] = [];
  function visit(node: any) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (node?.props) { nodes.push(node); visit(node.props.children); }
  }
  visit(tree);
  const button = nodes.find(node => node.type === 'button' && React.Children.toArray(node.props.children).some((c: any) => c?.props?.children === 'Coba Instalasi Lagi'));
  assert.ok(button); button.props.onClick(); assert.equal(installs,1); assert.equal(updates,0);
});
test('installation progress keeps operation busy even with old installed executable present', () => {
  const state = evaluateAppStatus(app,installation,progress('VERIFYING_INSTALLATION'));
  assert.equal(state.canLaunch,false); assert.equal(state.canInstall,false); assert.equal(state.canUpdate,false);
});
