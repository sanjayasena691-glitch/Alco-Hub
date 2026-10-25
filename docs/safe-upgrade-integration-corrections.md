# Safe-upgrade integration corrections

Base checked: 78decdc5719d8a9c2db4bf49cec113086d480bee.
The checkout was clean before these changes.

## Result

The IPC contract now requires an explicit operation, install or upgrade. Renderer
entry points startAppInstallation and startAppUpgrade select these operations
separately. Every Update action uses upgrade, including when release metadata is
missing; no catalog version is promoted to simulate installation.

First installation uses the shared trusted download, SHA-256, cache confinement
and canonical per-application lock, but executes the interactive installer with
an empty argument array. It does not request /S, select another scope, close a
running application, uninstall, or fall back from a rejected upgrade. Main checks
that the app is absent both before download and immediately before installation.
An existing, unknown or ambiguous installation blocks this operation.

The installer process must complete with exit zero, followed by registry discovery
of the expected product, executable and target version, before INSTALL_SUCCESS.
Launch errors, cancellation, wrong checksum, stale/missing executable/version,
ambiguous discovery and early bootstrap completion produce INSTALL_FAILED.
Windows discovery for other ALCO products also verifies registry name,
executable ProductName/FileVersion, production path and uniqueness. Custom
directories are read from the uninstall registry rather than guessed.

Open App now uses fresh verified registry discovery, including the Content Engine
custom path. It refuses missing, ambiguous, unsupported or unknown-version
installations and does not fall back to a guessed Content Engine path.

ApplicationCard, UpdatesView and status evaluation use a shared progress
projection. All uppercase upgrade stages and first-install terminal stages are
handled. Pending operations stay busy through VERIFYING_INSTALLATION.
Success appears only for INSTALL_SUCCESS or UPDATE_SUCCESS. The old UpdatesView
success timers and App's catalog-only version mutation have been removed.
First-install and upgrade retries preserve their operation. Progress events retain
the caller's catalog/alias key while cache and locking use canonical identity.

## Security boundary retained

- upgrade-profiles.json remains unchanged and empty.
- Silent Content Engine updates still require exact-artifact approval.
- Per-machine silent updates remain blocked pending cross-user coordination and
  real Windows validation. This includes the existing Program Files installation.
- Other products do not gain a silent-upgrade path through first installation.
- SHA-256, trusted GitHub URL/redirect restrictions, confined installer paths,
  no shell execution, no forced termination, transaction locks, downgrade rejection,
  and final installed-version verification remain.
- No license, device-fingerprint, or application-data logic was changed.

## Validation

- node --test tests/*.test.cjs: 71 passed, 0 failed.
- node --import tsx --test tests/install-ui.test.tsx tests/installer-service.test.ts:
  16 passed, 0 failed.
- npm run lint (tsc --noEmit): passed.
- node --check for electron/main.cjs, electron/windows-upgrade.cjs and
  electron/first-install.cjs: passed.
- git diff --check: passed.

Tests cover interactive first installation for Content Engine and other ALCO apps,
explicit routing/retries, no upgrade fallback, canonical aliases and locks, cache
reuse and integrity, installer completion/error/cancellation, registry verification,
custom executable launching, ambiguous-launch refusal, and actual server-rendered
React markup for each progress stage. Network, Electron shell, and installer
process effects are mocked. Main-process tests use real temporary cache files and
SHA-256. React markup tests do not establish browser layout or interactive Windows
dialog behavior.

Live read-only Windows discovery still finds Content Engine 0.1.0 at
C:\Program Files\ALCO Content Engine, machine scope. The same query identifies
Auto Motion as not installed without using fallback paths. No application was
launched or closed and no installer executed during validation.

## Remaining blockers and manual checks

No real Windows installation or upgrade was exercised. Before releasing the
restored installer workflow, test existing official installers in a disposable VM:

1. First install Content Engine and another ALCO app from verified release bytes.
   Exercise default/custom paths, paths with spaces, user-selected scope, cache
   reuse, corrupted cache and interrupted download.
2. Cancel the wizard, decline UAC, simulate nonzero exit, locked files and a
   bootstrapper that returns before its elevated child. No case may report success
   before registry and executable verification.
3. Attempt Install against an existing/unknown/multiple installation and attempt
   concurrent aliases or another Hub instance. Confirm no second installation
   and no automatic route from failed upgrade to interactive setup.
4. Open a verified installation in a custom folder through Hub. Missing or
   conflicting registry identity/executable must stop launching.
5. Observe progress across Library, cards and Updates. Verify busy states, explicit
   failure reasons, operation-specific retry, and success only after verification.
6. Compare project/settings/license/backup content before and after failure and
   successful installation using prepared VM fixtures.

Silent updates are not production-ready: exact release approvals remain absent,
and per-machine silent execution needs system-wide cross-user locking plus the
Windows/UAC/data-preservation matrix from the phase document.

No packaging, release publication, commit, push, or live licensing validation was
performed.

## Files

Changed: electron/main.cjs, electron/windows-upgrade.cjs, src/App.tsx,
src/components/ApplicationCard.tsx, src/components/UpdatesView.tsx,
src/services/installerService.ts, src/types.ts, src/utils/versioning.ts,
tests/upgrade-main.test.cjs, tests/windows-upgrade.test.cjs and the historical
docs/safe-upgrade-phase-2a.md pointer.

Added: electron/first-install.cjs, src/utils/installProgress.ts,
tests/first-install.test.cjs, tests/install-ui.test.tsx,
tests/installer-service.test.ts and this report.
