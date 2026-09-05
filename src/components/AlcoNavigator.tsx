/**
 * ALCO Navigator Component
 * Fitur AI pemandu ekosistem ALCO: Konsultasi Langkah Cepat & Project Checker.
 * Styled for Premium Dark Desktop Control Center.
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  CheckSquare,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Key,
  AlertCircle,
  Clock,
  Compass,
  ListOrdered,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { EcosystemApp } from '../types';
import {
  NavigatorAdviceResponse,
  ProjectCheckerResponse,
  askAlcoNavigator,
  checkProjectCondition,
  getMaskedApiKey,
} from '../services/aiNavigatorService';

interface AlcoNavigatorProps {
  apiKey: string;
  apps: EcosystemApp[];
  onRequestApiKey: () => void;
  onOpenAppUrl: (app: EcosystemApp) => void;
}

const QUICK_CHOICES = [
  'Saya ingin membuat produk digital',
  'Saya ingin membuat iklan Meta Ads',
  'Saya ingin membuat konten organik',
  'Saya sudah punya project, lanjut apa?',
  'Saya bingung mulai dari mana',
];

const PROJECT_CONDITIONS = [
  { id: 'belum-produk', label: 'Belum punya produk', desc: 'Baru memulai dari ide awal atau belum ada barang jualan.' },
  { id: 'sudah-produk', label: 'Sudah punya produk', desc: 'Produk digital siap jual, butuh audiens & pembeli.' },
  { id: 'sudah-campaign', label: 'Sudah punya campaign', desc: 'Sudah ada strategi iklan & landing page, ingin ekspansi.' },
  { id: 'sudah-konten', label: 'Sudah punya konten', desc: 'Aktif posting organik, ingin konversi penjualan lebih terarah.' },
];

export const AlcoNavigator: React.FC<AlcoNavigatorProps> = ({
  apiKey,
  apps,
  onRequestApiKey,
  onOpenAppUrl,
}) => {
  const [activeTab, setActiveTab] = useState<'consult' | 'checker'>('consult');
  const [customQuery, setCustomQuery] = useState('');
  const [activeQueryText, setActiveQueryText] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');

  // States for AI Consultation
  const [adviceResult, setAdviceResult] = useState<NavigatorAdviceResponse | null>(null);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [adviceError, setAdviceError] = useState<string | null>(null);

  // States for Project Checker
  const [checkerResult, setCheckerResult] = useState<ProjectCheckerResponse | null>(null);
  const [isLoadingChecker, setIsLoadingChecker] = useState(false);
  const [checkerError, setCheckerError] = useState<string | null>(null);

  // Helper to trigger consultation
  const handleConsult = async (queryText: string) => {
    if (!queryText.trim()) return;

    if (!apiKey) {
      onRequestApiKey();
      return;
    }

    setActiveQueryText(queryText);
    setIsLoadingAdvice(true);
    setAdviceError(null);

    try {
      const res = await askAlcoNavigator(queryText, apiKey);
      setAdviceResult(res);
    } catch (err: unknown) {
      setAdviceError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingAdvice(false);
    }
  };

  // Helper to trigger project checker
  const handleCheckProject = async (conditionLabel: string) => {
    if (!conditionLabel) return;

    if (!apiKey) {
      onRequestApiKey();
      return;
    }

    setSelectedCondition(conditionLabel);
    setIsLoadingChecker(true);
    setCheckerError(null);

    try {
      const res = await checkProjectCondition(conditionLabel, apiKey);
      setCheckerResult(res);
    } catch (err: unknown) {
      setCheckerError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingChecker(false);
    }
  };

  const getAppById = (appId: string): EcosystemApp | undefined => {
    return apps.find((a) => a.id === appId);
  };

  return (
    <section
      id="section-alco-navigator"
      aria-labelledby="heading-alco-navigator"
      className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden"
    >
      {/* Header bar */}
      <div className="bg-slate-950 p-5 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="heading-alco-navigator" className="text-base sm:text-lg font-bold tracking-tight text-white">
                Tanya ALCO Navigator
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-wider">
                AI Asisten
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Pemandu langkah berikutnya di ekosistem ALCO tanpa bingung mulai dari mana.
            </p>
          </div>
        </div>

        {/* API Key status badge */}
        <div className="flex items-center gap-2">
          {apiKey ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>AI Aktif</span>
              </span>
              <button
                type="button"
                onClick={onRequestApiKey}
                className="text-xs text-slate-400 hover:text-white underline underline-offset-2"
              >
                Ganti Key
              </button>
            </div>
          ) : (
            <button
              id="activate-ai-btn"
              type="button"
              onClick={onRequestApiKey}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Aktifkan AI Navigator</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="px-5 sm:px-6 pt-4 border-b border-slate-800 bg-slate-900/60 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('consult')}
          className={`pb-3 px-2 text-xs font-bold transition-all border-b-2 inline-flex items-center gap-2 ${
            activeTab === 'consult'
              ? 'border-indigo-400 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Konsultasi Langkah Cepat</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('checker')}
          className={`pb-3 px-2 text-xs font-bold transition-all border-b-2 inline-flex items-center gap-2 ${
            activeTab === 'checker'
              ? 'border-indigo-400 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Project Checker</span>
        </button>
      </div>

      {/* Body content */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* Tab 1: Konsultasi Langkah Cepat */}
        {activeTab === 'consult' && (
          <div className="space-y-6">
            {/* Quick choices pills */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Pilih pertanyaan umum atau ketik sendiri:
              </label>
              <div className="flex flex-wrap gap-2">
                {QUICK_CHOICES.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => {
                      setCustomQuery(choice);
                      handleConsult(choice);
                    }}
                    disabled={isLoadingAdvice}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 text-left"
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConsult(customQuery);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="Contoh: Saya punya ide jualan ebook resep, mulai dari mana?"
                className="flex-1 px-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={isLoadingAdvice || !customQuery.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                {isLoadingAdvice ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Tanyakan</span>
              </button>
            </form>

            {/* Error Message */}
            {adviceError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Gagal memproses rekomendasi</p>
                  <p className="text-rose-300/80 mt-0.5">{adviceError}</p>
                </div>
              </div>
            )}

            {/* Result Display */}
            {adviceResult && (
              <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4 animate-in fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                      Analisis Kebutuhan
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {adviceResult.userSummary}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdviceResult(null)}
                    className="text-slate-500 hover:text-slate-300 p-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                      Rekomendasi Langkah Utama
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-200">
                      {adviceResult.recommendedAppName}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white leading-snug">
                    {adviceResult.nextStep}
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {adviceResult.reason}
                  </p>

                  {adviceResult.recommendedAppId && adviceResult.recommendedAppId !== 'none' && (
                    <div className="pt-2">
                      {(() => {
                        const recApp = getAppById(adviceResult.recommendedAppId);
                        if (!recApp) return null;
                        return (
                          <button
                            type="button"
                            onClick={() => onOpenAppUrl(recApp)}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-indigo-500 hover:bg-indigo-400 text-slate-950 text-xs font-bold transition-all shadow-xs"
                          >
                            <span>Buka {recApp.name}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {adviceResult.additionalTip && (
                  <p className="text-[11px] text-slate-400 italic">
                    💡 Tips: {adviceResult.additionalTip}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Project Checker */}
        {activeTab === 'checker' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Pilih kondisi project bisnis Anda saat ini:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PROJECT_CONDITIONS.map((cond) => (
                  <button
                    key={cond.id}
                    type="button"
                    onClick={() => handleCheckProject(cond.label)}
                    disabled={isLoadingChecker}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      selectedCondition === cond.label
                        ? 'bg-indigo-500/10 border-indigo-500/40 text-white'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <p className="text-xs font-bold text-white">{cond.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{cond.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {checkerError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {checkerError}
              </div>
            )}

            {checkerResult && (
              <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4 animate-in fade-in">
                <div>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                    Status Analisis
                  </span>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {checkerResult.conditionSummary}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Checklist Rencana Aksi (Maksimal 5 Langkah)
                  </span>
                  {checkerResult.steps.map((step) => {
                    const targetApp = step.targetAppId ? getAppById(step.targetAppId) : null;
                    return (
                      <div
                        key={step.stepNumber}
                        className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs"
                      >
                        <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {step.stepNumber}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white">{step.title}</p>
                          <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">{step.description}</p>
                          {targetApp && (
                            <button
                              type="button"
                              onClick={() => onOpenAppUrl(targetApp)}
                              className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-400 hover:text-indigo-300"
                            >
                              <span>Buka {targetApp.name}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400">
                  <strong className="text-slate-200">Fokus Utama:</strong> {checkerResult.mainRecommendation}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
