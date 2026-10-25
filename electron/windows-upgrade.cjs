const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');
const { identity, discover, createUpgradeRunner } = require('./safe-upgrade.cjs');
const profiles = require('./upgrade-profiles.json');
const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
function ps(script, env = {}) {
  if (process.platform !== 'win32') return Promise.reject(new Error('Upgrade memerlukan Windows.'));
  return new Promise((resolve, reject) => execFile(powershell, ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from("$ErrorActionPreference='Stop'; " + script, 'utf16le').toString('base64')],
    { shell: false, windowsHide: true, timeout: 30000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, ...env } },
    (error, stdout) => error ? reject(new Error('Pemeriksaan Windows gagal. Periksa registry/proses secara manual.')) : resolve(stdout.trim())));
}
async function registryEntries(definition = null) {
  const script = [
    '$rows = @();',
    "foreach ($view in @([Microsoft.Win32.RegistryView]::Registry64,[Microsoft.Win32.RegistryView]::Registry32)) {",
    "foreach ($scope in @('user','machine')) {",
    "$hive = if ($scope -eq 'user') {[Microsoft.Win32.RegistryHive]::CurrentUser} else {[Microsoft.Win32.RegistryHive]::LocalMachine};",
    '$root = [Microsoft.Win32.RegistryKey]::OpenBaseKey($hive,$view);',
    "try { $uninstall = $root.OpenSubKey('Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall');",
    'if ($null -eq $uninstall) {continue};',
    'try { foreach ($name in $uninstall.GetSubKeyNames()) { $key = $uninstall.OpenSubKey($name);',
    "if ($null -eq $key) {throw 'Registry inaccessible'};",
    "try { $display=[string]$key.GetValue('DisplayName'); if ($name -eq '__GUID__' -or $name -eq '__APPID__' -or $display -eq $env:ALCO_DISCOVERY_NAME -or $display.StartsWith($env:ALCO_DISCOVERY_NAME + ' ',[StringComparison]::OrdinalIgnoreCase)) {",
    "$installKey=if ($env:ALCO_DISCOVERY_GENERIC -eq '1') {$name} else {'__GUID__'}; $install = $root.OpenSubKey('Software\\' + $installKey); $location=$null;",
    "if ($install) {try {$location=$install.GetValue('InstallLocation')} finally {$install.Dispose()}};",
    "$icon = [string]$key.GetValue('DisplayIcon');",
    '$exe = ($icon -replace \',0$\',\'\').Trim(\'"\');',
    "$dir = [string]$key.GetValue('InstallLocation');",
    "if (!$dir -and $exe -and [IO.Path]::GetExtension($exe) -in @('.exe','.ico')) {$dir=[IO.Path]::GetDirectoryName($exe)};",
    "$binaryVersion=$null; if ($dir -and [IO.Path]::IsPathRooted($dir)) { $binary=Join-Path $dir $env:ALCO_DISCOVERY_EXE; if ([IO.File]::Exists($binary)) {$info=[Diagnostics.FileVersionInfo]::GetVersionInfo($binary); if ($info.ProductName -eq $env:ALCO_DISCOVERY_NAME) {$binaryVersion=$info.FileVersion}}};",
    "$rows += @{executableVersion=$binaryVersion;key=$name;name=$key.GetValue('DisplayName');version=$key.GetValue('DisplayVersion');location=$dir;installLocation=$location;scope=$scope;view=[string]$view};",
    '}} finally {$key.Dispose()}',
    '}} finally {$uninstall.Dispose()}',
    '} finally {$root.Dispose()}',
    "}}; ConvertTo-Json -InputObject @($rows) -Compress",
  ].join('\n').replaceAll('__GUID__', definition ? '__not_content_engine__' : identity.guid).replaceAll('__APPID__', definition ? '__not_content_engine__' : identity.appId);
  const rows = JSON.parse(await ps(script, { ALCO_DISCOVERY_NAME: definition?.label || identity.name,
    ALCO_DISCOVERY_EXE: definition?.executableNames[0] || identity.exe, ALCO_DISCOVERY_GENERIC: definition ? '1' : '0' }));
  // HKCU can share registry views. Collapse only identical observations of the same key/scope.
  return rows.filter((e, i) => !rows.slice(0, i).some(p => e.scope === 'user' && p.scope === e.scope && p.key === e.key && p.location === e.location && p.installLocation === e.installLocation && p.version === e.version && p.name === e.name));
}
async function discoverWindows(fallback = []) {
  try { return discover(await registryEntries(), fallback, p => {
    if (!fs.existsSync(p) || !fs.statSync(p).isFile()) return false;
    const real = fs.realpathSync(p);
    return real.toLowerCase() === path.normalize(p).toLowerCase()
      && !/[\\/](?:dist-electron|win-unpacked)[\\/]/i.test(real);
  }); }
  catch { return { isInstalled: false, version: null, executablePath: null, discoveryStatus: 'UNSUPPORTED_INSTALLATION', error: 'Registry Windows tidak dapat diperiksa. Periksa instalasi secara manual.' }; }
}
async function discoverForApp(definition, fallback = []) {
  if (definition.id === identity.catalogId) return discoverWindows(fallback);
  try {
    const rows = await registryEntries(definition);
    const base = { isInstalled: false, version: null, executablePath: null };
    if (rows.length > 1) return { ...base, discoveryStatus: 'MULTIPLE_INSTALLATIONS', error: 'Beberapa instalasi ditemukan. Periksa instalasi Windows secara manual.' };
    if (!rows.length) {
      const found = fallback.some(p => fs.existsSync(p) && !/[\\/](?:dist-electron|win-unpacked)[\\/]/i.test(p) && path.basename(p).toLowerCase() !== 'electron.exe');
      return { ...base, isInstalled: found, discoveryStatus: found ? 'UNSUPPORTED_INSTALLATION' : 'NOT_INSTALLED' };
    }
    const row = rows[0];
    const { safeDirectory, compareVersions, parseVersion } = require('./safe-upgrade.cjs');
    if (!safeDirectory(row.location) || ![definition.label, definition.label + ' ' + row.version].includes(row.name)
      || (row.installLocation && path.normalize(row.installLocation).toLowerCase() !== path.normalize(row.location).toLowerCase())) return { ...base, discoveryStatus: 'UNSUPPORTED_INSTALLATION' };
    const executablePath = path.join(row.location, definition.executableNames[0]);
    if (!fs.existsSync(executablePath) || !fs.statSync(executablePath).isFile() || fs.realpathSync(executablePath).toLowerCase() !== path.normalize(executablePath).toLowerCase()) return { ...base, discoveryStatus: 'UNSUPPORTED_INSTALLATION' };
    const known = parseVersion(row.version) && compareVersions(row.version, row.executableVersion) === 0;
    return { isInstalled: true, version: known ? row.version : null, executablePath, directory: row.location,
      source: 'registry', scope: row.scope, discoveryStatus: known ? 'INSTALLED_KNOWN_VERSION' : 'INSTALLED_UNKNOWN_VERSION' };
  } catch { return { isInstalled: false, version: null, executablePath: null, discoveryStatus: 'UNSUPPORTED_INSTALLATION', error: 'Pemeriksaan instalasi Windows gagal.' }; }
}
async function runningForApp(definition) {
  const name = definition.executableNames[0];
  const data = await ps("$p=@(Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object {$_.Name -eq $env:ALCO_PROCESS_NAME}); $p.Count", { ALCO_PROCESS_NAME: name });
  if (!/^\d+$/.test(data)) throw new Error('Status proses tidak diketahui.');
  return Number(data) > 0;
}
async function running() {
  const data = await ps("$p=@(Get-CimInstance Win32_Process -Filter \"Name = 'ALCO Content Engine.exe'\" -ErrorAction Stop); $p.Count");
  if (!/^\d+$/.test(data)) throw new Error('Status proses tidak diketahui.');
  return Number(data) > 0;
}
async function closeGracefully() {
  const installation = await discoverWindows();
  if (!installation.executablePath) throw new Error('Lokasi aplikasi tidak diketahui. Tutup aplikasi secara manual.');
  await ps("foreach ($p in @(Get-Process -Name 'ALCO Content Engine' -ErrorAction SilentlyContinue)) { if ($p.Path -eq $env:ALCO_UPGRADE_TARGET) { $null=$p.CloseMainWindow() }}",
    { ALCO_UPGRADE_TARGET: installation.executablePath });
  for (let i = 0; i < 30; i++) { if (!(await running())) return; await new Promise(r => setTimeout(r, 500)); }
  throw new Error('Aplikasi masih aktif atau menunggu penyimpanan. Simpan pekerjaan dan tutup aplikasi secara manual.');
}
function install(file, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { shell: false, windowsHide: true, stdio: 'ignore', detached: false });
    child.once('error', () => reject(new Error('Installer gagal dijalankan. Periksa izin Windows/UAC.')));
    child.once('close', (code, signal) => signal ? reject(new Error('Proses installer terhenti.')) : resolve(code));
  });
}
function createWindowsRunner({ prepare, verify, confirm, acquire }) {
  return createUpgradeRunner({ discover: () => discoverWindows(), prepare, verify, confirm, acquire, running, close: closeGracefully, install,
    // Per-machine execution stays blocked until a system-wide cross-user lock is implemented.
    supports: (sha256, version, scope) => scope === 'user' && profiles.some(p => p.sha256 === sha256.toLowerCase() && p.version === version && p.appId === identity.appId
      && p.registryGuid === identity.guid && p.registryLocationPreserved === true && p.waitsForCompletion === true && p.preservesAppData === true) });
}
module.exports = { discoverForApp, runningForApp, discoverWindows, running, closeGracefully, install, createWindowsRunner };
