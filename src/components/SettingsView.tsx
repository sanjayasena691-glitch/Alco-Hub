/**
 * ALCO Hub - Settings View
 * Pengaturan Kunci API Gemini, Diagnostik Environment Desktop, dan Preferensi Hub.
 */

import React, { useState } from 'react';
import {
  Settings,
  Key,
  Monitor,
  ShieldCheck,
  ExternalLink,
  Trash2,
  Check,
  Layers,
  Terminal,
  Info,
} from 'lucide-react';
import { getMaskedApiKey, removeUserApiKey, setUserApiKey } from '../services/aiNavigatorService';
import { HUB_META } from '../config/ecosystemApps';

interface SettingsViewProps {
  apiKey: string;
  onApiKeyChange: (newKey: string) => void;
  onOpenApiKeyModal: () => void;
  onOpenExternalUrl: (url: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  apiKey,
  onApiKeyChange,
  onOpenApiKeyModal,
  onOpenExternalUrl,
}) => {
  const isElectronAvailable = typeof window !== 'undefined' && Boolean(window.alcoHub);

  return (
    <div id="alco-settings-view" className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Ecosystem Settings & Diagnostics
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Kelola kredensial AI asisten, diagnostik runtime desktop, dan preferensi ALCO Hub.
        </p>
      </div>

      {/* 1. Gemini AI API Key Settings */}
      <section className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                ALCO Navigator AI Key
              </h2>
              <p className="text-xs text-slate-400">
                Gemini API Key pribadi untuk fitur konsultasi alur ekosistem dan project checker.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenApiKeyModal}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shrink-0"
          >
            {apiKey ? 'Change API Key' : 'Configure API Key'}
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Active Key Status:</span>
            <span className="font-mono text-slate-200 font-semibold">
              {apiKey ? getMaskedApiKey(apiKey) : 'No API key configured'}
            </span>
          </div>

          {apiKey && (
            <button
              type="button"
              onClick={() => {
                removeUserApiKey();
                onApiKeyChange('');
              }}
              className="text-rose-400 hover:text-rose-300 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          )}
        </div>
      </section>

      {/* 2. Environment & Desktop Diagnostic */}
      <section className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Desktop Runtime Environment
            </h2>
            <p className="text-xs text-slate-400">
              Status jembatan IPC dan akses native sistem operasi Windows.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px] block">Runtime Detection:</span>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isElectronAvailable ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span className="font-semibold text-white">
                {isElectronAvailable ? 'Electron Desktop Bridge Connected' : 'Browser Web Preview'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px] block">Local App Launching:</span>
            <span className="font-semibold text-slate-200">
              {isElectronAvailable ? 'Native OS Executable Spawning' : 'Web Fallback Mode'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px] block">Update Checker Service:</span>
            <span className="font-semibold text-slate-200">
              GitHub HTTPS Registry Integration
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px] block">Persistence:</span>
            <span className="font-semibold text-slate-200">
              Local Device Isolated Storage
            </span>
          </div>
        </div>
      </section>

      {/* 3. About ALCO Hub */}
      <section className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-bold text-white">About ALCO Hub</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-200">{HUB_META.name}</strong> • {HUB_META.ecosystem} ({HUB_META.version})
          <br />
          {HUB_META.principles}
        </p>
      </section>
    </div>
  );
};
