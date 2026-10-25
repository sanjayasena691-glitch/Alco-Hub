# Safe silent in-place upgrade — Phase 2A

## Confirmed causes and implementation

The original main process had two duplicated installer launch paths. Both detached
the process, returned success without waiting for an exit, and used a forced
taskkill before launch. Renderer polling accepted an existing executable, and a
separate four-second timer could mark the old installation as a completed update.
Candidate discovery included development unpacked builds and ignored custom
NSIS registry locations. Version sanitization could turn malformed versions into
apparently valid upgrade decisions.

The new main-owned transaction locks the canonical application ID through
post-install verification. It rejects equal/older releases, malformed versions,
unknown locations/versions, conflicting identities/scopes, and multiple matches.
Only Content Engine currently has a supported silent-upgrade identity.
Unsupported applications and first installations fail closed in this endpoint;
use the existing official installer manually for those cases. There is no fallback
from a rejected silent upgrade to a detached or interactive installer.
The Windows adapter also blocks machine-scope silent execution until a system-wide
cross-user lock exists. Discovery and transaction tests cover machine scope, but
that coverage does not authorize a real machine upgrade.

Discovery reads HKCU/HKLM uninstall records in both registry views and the
builder installation key. It requires the deterministic builder GUID derived from
com.alco.contentengine, the expected display name (optionally followed by the exact
registered version), matching install locations, an existing production executable,
and an executable version matching DisplayVersion. The executable's Windows
ProductName must also match. A filesystem fallback is diagnostic only and never
authorizes automatic upgrade. HKCU duplicate observations across shared views
are collapsed; distinct machine registry views remain ambiguous.

The downloader preserves verified reusable caching and SHA-256 checks. Installer
URLs are restricted to the existing official GitHub release repository, and HTTPS
redirects to GitHub asset hosts. Fuzzy cross-application/tag asset resolution is no
longer used by the upgrade endpoint. The installer is checked again immediately
before execution and must resolve inside Hub's installer cache.

Running-app detection fails closed on Windows query errors. A native dialog defaults
to Cancel. After explicit confirmation, CloseMainWindow requests closure only for
processes at the discovered executable path. The app may present its own save
dialog. If any process with the target executable name remains, the update aborts
and asks for manual closure. No forced termination or uninstall command is used.

Execution uses shell:false, no detached process, and waits for the installer close
event. Any nonzero exit, signal, or launch error fails. Registry discovery is then
repeated and must match the original app identity, registry view/key, scope,
directory, and executable; registry and executable versions must equal the target.
There is no time-based success detector.

The progress contract distinguishes UPDATE_AVAILABLE, DOWNLOADING, VERIFYING,
AWAITING_USER_CONFIRMATION, CLOSING_APPLICATION, INSTALLING,
VERIFYING_INSTALLATION, UPDATE_SUCCESS, and UPDATE_FAILED.

## Compatibility and release approval

Read-only source evidence was inspected at:

- Content Engine electron-builder.json and dist-electron/builder-effective-config.yaml.
- Its installed app-builder-lib NSIS templates: assistedInstaller.nsh,
  multiUser.nsh, include/installer.nsh, and NsisTarget.js.

Observed configuration: appId com.alco.contentengine, NSIS assisted installer,
custom directory selection enabled, executable ALCO Content Engine.exe, and no
custom GUID declared. The computed GUID is
d7af304b-5b33-5f9b-9a51-f71d67818c1f.

The templates support /S, /currentuser and /allusers, and read the prior path from
Software\<GUID>\InstallLocation in the chosen scope. Hub deliberately omits /D
because Windows quoting of paths containing spaces can alter NSIS interpretation.
It validates that this registry path equals the discovered installation directory.
Hub never invokes the uninstaller explicitly. NSIS may internally replace the old
installation according to its own upgrade implementation.

These source observations do not prove that any particular published executable
has identical behavior, waits through elevation, or preserves user data.
electron/upgrade-profiles.json is therefore intentionally empty. No real installer
is currently authorized for silent execution. Supabase/publisher fields are
unchanged; they cannot approve this profile through IPC.

Before a controlled installer test, review the exact binary's build configuration
and source provenance and add an entry in a disposable test checkout:

    {
      "appId": "com.alco.contentengine",
      "registryGuid": "d7af304b-5b33-5f9b-9a51-f71d67818c1f",
      "version": "<exact target version>",
      "sha256": "<64 lowercase hex characters>",
      "registryLocationPreserved": true,
      "waitsForCompletion": true,
      "preservesAppData": true
    }

Each boolean records a reviewed compatibility assertion, not an automatic test.
Do not approve a release without evidence. Do not ship a test-only approval until
the following real Windows matrix passes. Every changed installer hash requires
another review. A custom installer GUID, changed appId, renamed executable, custom
NSIS script, or changed registry layout requires a compatibility review.

## Validation boundary

Run node --test tests/safe-upgrade.test.cjs tests/upgrade-main.test.cjs tests/windows-upgrade.test.cjs and npm run lint (the repository's
TypeScript no-emit check). The regression suite uses injected OS/installer effects.
It covers success, equal/older releases, unknown/multiple locations, unknown
version, closure refusal, remaining processes, nonzero exit, stale version,
checksum failure, concurrency and alias locking, launch failure, custom directories,
per-machine scope, changed path/scope, unsupported release profiles, unsafe URLs,
and malformed/prerelease versions.

The user-data fixture checks that mocked orchestration leaves existing content
unchanged. It is not proof that a real installer preserves projects or licenses.
Live read-only Windows registry and process inspection is separate from installer
execution. No installer was built, published, or run for this task.

## Exact manual Windows matrix before production

Use disposable VM snapshots and existing signed/trusted installer artifacts.
Record the installer SHA-256, source config, target version, Windows version,
user identity, elevation, registry keys, process exit, and final executable version.

1. Install the old release per-user in its default folder, seed projects, settings,
   license and backups, record their bytes/hashes, then upgrade to the approved
   newer release. Check no wizard, same location/scope, one uninstall entry, target
   executable version, successful launch, and unchanged user data/license behavior.
2. Repeat per-user using a custom path with spaces and a non-ASCII path. Repeat
   per-machine with UAC approval only after system-wide coordination is implemented,
   and verify Hub waits for elevated installation completion rather than only an
   outer bootstrap process. Until then, verify Hub rejects machine-scope execution.
3. Decline UAC and test insufficient permissions, locked files, installer cancellation,
   installer crash/nonzero exit, and old executable surviving an installer exit of
   zero. Each must fail without success notification.
4. Open Content Engine with unsaved work; decline Hub's closure dialog. Confirm
   nothing closes or installs. Accept it, then cancel the application's save dialog.
   Confirm no force kill and no installation. Finally save and close normally,
   then confirm upgrade completes only after every target process exits.
5. Start two update requests, including catalog alias content-engine, and test a
   second Hub window. Only one transaction may proceed. A cache lock file also blocks another Hub
   process or a relaunch. A crash intentionally leaves the lock in place. Before
   removing it manually, verify no installer remains active and inspect the actual
   installed state. Cache cleanup must refuse while that lock exists.
6. Test equal and older target metadata, missing/invalid version, stale or missing
   registry entry, missing executable, changed ProductName, filesystem-only install,
   conflicting install/uninstall locations, duplicate per-user/per-machine installs,
   and duplicate machine registry views. All ambiguous upgrades must stop.
7. Test corrupted download, wrong SHA-256, tampered cache, valid cache reuse,
   force redownload, failed/interrupted download, untrusted URL/redirect, and a
   release hash absent from upgrade-profiles.json. No unverified installer may run.
8. Compare all seeded user-data/license/settings/project/backup bytes after both
   successful and failed upgrades. Verify appId, shortcuts, install location,
   licensing and device fingerprint behavior remain unchanged.
9. Confirm the UI displays each progress state accurately, stays busy until actual
   verification, and never reports success from an old executable or manual
   “check installation” action.

Production readiness is not established. The orchestration is available for
controlled Windows validation after exact-artifact profile review; silent execution
remains blocked by default.

## Files and observed task validation

Modified:

- electron/main.cjs
- src/App.tsx
- src/components/ApplicationCard.tsx
- src/services/installerService.ts
- src/types.ts
- src/utils/versioning.ts

Added:

- electron/safe-upgrade.cjs
- electron/windows-upgrade.cjs
- electron/upgrade-version.cjs
- electron/upgrade-profiles.json
- src/utils/upgradeVersion.ts
- tests/safe-upgrade.test.cjs
- tests/upgrade-main.test.cjs
- tests/windows-upgrade.test.cjs
- docs/safe-upgrade-phase-2a.md

On 2026-10-25 the focused regression command passed all 38 tests; npm run lint
(tsc --noEmit), Node syntax checks, and git diff --check passed.
The main-process tests exercise real temporary files and SHA-256, with mocked
network/Electron effects. Windows adapter tests mock child processes.

Actual read-only Windows discovery found Content Engine 0.1.0 at
C:\Program Files\ALCO Content Engine, machine scope, Registry64, with matching
NSIS identity and executable FileVersion/ProductName. Process inspection found
no running target. No close request or installer was executed.

The initial checkout was clean. It had no node_modules or package lock, so npm ci
could not run and the first typecheck could not find TypeScript. Dependencies were
then installed with --ignore-scripts --no-package-lock; the completed typecheck
passed. No application source outside ALCO Hub was modified. No installer build,
release publication, commit, or push was performed.

Remaining limitations: exact-artifact approvals are empty; real NSIS/UAC completion,
unsaved-work dialogs, UI rendering, and preservation of actual user data/license
state are untested. Lock files coordinate Hub processes sharing the same userData
cache; simultaneous machine upgrades from separate Windows user profiles require
additional coordination and validation before machine-scope production approval.
