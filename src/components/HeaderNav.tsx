/**
 * ALCO Hub - Header & Ecosystem Navigation
 * Desktop-first control center header
 */

import React from 'react';
import {
  Layers,
  Home,
  Grid,
  Package,
  RefreshCw,
  Settings,
  Key,
  Monitor,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { NavigationTab, ContentEngineUpdateStatus } from '../types';
import { getMaskedApiKey } from '../services/aiNavigatorService';

interface HeaderNavProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  apiKey: string;
  onRequestApiKey: () => void;
  updateStatus: ContentEngineUpdateStatus;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  activeTab,
  onSelectTab,
  apiKey,
  onRequestApiKey,
  updateStatus,
}) => {
  const hasUpdate = updateStatus === 'update-available';

  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: React.ReactNode }[] = [
    {
      id: 'home',
      label: 'HOME',
      icon: <Home className="w-4 h-4" aria-hidden="true" />,
    },
    {
      id: 'apps',
      label: 'APPS',
      icon: <Grid className="w-4 h-4" aria-hidden="true" />,
    },
    {
      id: 'packs',
      label: 'PACKS',
      icon: <Package className="w-4 h-4" aria-hidden="true" />,
    },
    {
      id: 'updates',
      label: 'UPDATES',
      icon: <RefreshCw className="w-4 h-4" aria-hidden="true" />,
      badge: hasUpdate ? (
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      ) : undefined,
    },
    {
      id: 'settings',
      label: 'SETTINGS',
      icon: <Settings className="w-4 h-4" aria-hidden="true" />,
    },
  ];

  return (
    <header
      id="alco-header"
      className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Identity */}
          <div
            id="alco-brand-container"
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div
              id="alco-brand-badge"
              className="w-9 h-9 rounded-lg bg-gradient-to-tr from-slate-900 to-indigo-900 text-white border border-indigo-500/30 flex items-center justify-center font-black text-base tracking-wider shadow-inner group-hover:border-indigo-400/50 transition-colors"
            >
              A
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  id="alco-brand-title"
                  className="text-sm font-extrabold text-white tracking-wider uppercase leading-none"
                >
                  ALCO HUB
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  v1.0
                </span>
              </div>
              <p
                id="alco-brand-subtitle"
                className="text-[11px] text-slate-400 font-medium tracking-tight truncate mt-0.5"
              >
                Aladzan Corpora Ecosystem
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav id="alco-main-nav" className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold tracking-wider transition-all relative ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: API Key & Desktop Status */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              id="header-api-key-btn"
              type="button"
              onClick={onRequestApiKey}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors"
              title="Gemini AI Key for Ecosystem Navigator"
            >
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">
                {apiKey ? getMaskedApiKey(apiKey) : 'Set Gemini Key'}
              </span>
              <span className="sm:hidden">
                {apiKey ? 'AI Ready' : 'Key'}
              </span>
            </button>

            <div
              id="desktop-runtime-badge"
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/80 text-slate-400 border border-slate-800"
            >
              <Monitor className="w-3.5 h-3.5 text-emerald-400" />
              <span>Electron Desktop</span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-800/60 overflow-x-auto gap-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-mobile-${item.id}`}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
