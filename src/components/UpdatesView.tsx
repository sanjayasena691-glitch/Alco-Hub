/**
 * ALCO Hub - Centralized Updates Control Center
 * Menampilkan status update seluruh aplikasi ekosistem ALCO & integrasi live GitHub Registry
 */

import React from 'react';
import {
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Server,
  Layers,
  Sparkles,
} from 'lucide-react';
import { EcosystemApp, ContentEngineUpdateResult, ContentEngineUpdateStatus } from '../types';

interface UpdatesViewProps {
  apps: EcosystemApp[];
  updateResult: ContentEngineUpdateResult | null;
  updateStatus: ContentEngineUpdateStatus;
  onRefreshUpdates: () => void;
  onUpdateApp: (app: EcosystemApp) => void;
  isChecking: boolean;
}

export const UpdatesView: React.FC<UpdatesViewProps> = ({
  apps,
  updateResult,
  updateStatus,
  onRefreshUpdates,
  onUpdateApp,
  isChecking,
}) => {
  const contentEngineApp = apps.find((a) => a.id === 'content-engine');
  const hasContentEngineUpdate = updateStatus === 'update-available';

  return (
    <div id="alco-updates-view" className="space-y-8">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Ecosystem Update Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pusat pemantauan versi dan pembaruan rilis untuk seluruh aplikasi ALCO.
          </p>
        </div>

        <button
          id="refresh-updates-btn"
          type="button"
          onClick={onRefreshUpdates}
          disabled={isChecking}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          <span>{isChecking ? 'Checking Registry...' : 'Check for Updates'}</span>
        </button>
      </div>

      {/* Main Feature: ALCO Content Engine Update Inspector */}
      {contentEngineApp && (
        <section
          id="content-engine-update-inspector"
          className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 sm:p-7 space-y-6 shadow-xl"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-white">
                    {contentEngineApp.name}
                  </h2>
                  {hasContentEngineUpdate ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      Update Available
                    </span>
                  ) : updateStatus === 'up-to-date' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Up to Date
                    </span>
                  ) : updateStatus === 'checking' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                      Checking...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Unable to Check (Preview)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {contentEngineApp.functionLabel}
                </p>
              </div>
            </div>

            {hasContentEngineUpdate && (
              <button
                id="update-content-engine-action-btn"
                type="button"
                onClick={() => onUpdateApp(contentEngineApp)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-tight transition-all shadow-md active:scale-[0.99]"
              >
                <Download className="w-4 h-4" />
                <span>Update Now</span>
              </button>
            )}
          </div>

          {/* Version Details Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Installed Local Version
              </span>
              <p className="text-base font-bold font-mono text-slate-100">
                v{updateResult?.localVersion || contentEngineApp.version || '0.1.0'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Latest Registry Release
              </span>
              <p className="text-base font-bold font-mono text-cyan-400">
                v{updateResult?.latestVersion || updateResult?.registry?.latestVersion || '0.1.1'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Registry Source
              </span>
              <p className="text-xs font-medium text-slate-300 truncate">
                GitHub: Alco-Releases
              </p>
            </div>
          </div>

          {/* Registry Payload Details if update available */}
          {updateResult?.registry && (
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Release Payload Verification</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                <div className="truncate">
                  <span className="text-slate-500">URL: </span>
                  <span className="text-slate-300">{updateResult.registry.downloadUrl}</span>
                </div>
                <div className="truncate">
                  <span className="text-slate-500">SHA-256: </span>
                  <span className="text-slate-300">{updateResult.registry.sha256}</span>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Overview Table of Other Ecosystem Applications */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Ecosystem Applications Version Registry
        </h2>

        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/60">
          <div className="divide-y divide-slate-800">
            {apps.map((app) => {
              const isCE = app.id === 'content-engine';
              const isComing = app.comingSoon || app.status === 'coming-soon';

              return (
                <div
                  key={app.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                    <div>
                      <h4 className="font-bold text-white truncate">{app.name}</h4>
                      <p className="text-[11px] text-slate-400 truncate">{app.functionLabel}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="font-mono text-slate-300">
                        {isComing ? 'In Development' : `v${app.version || '1.0.0'}`}
                      </span>
                    </div>

                    <div className="w-32 flex justify-end">
                      {isCE && hasContentEngineUpdate ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Update Available
                        </span>
                      ) : isComing ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-500 border border-slate-700">
                          Coming Soon
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Up to Date
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
