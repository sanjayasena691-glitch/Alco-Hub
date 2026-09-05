/**
 * ALCO Navigator Component
 * Fitur AI ringan pemandu ekosistem ALCO: Konsultasi Langkah Cepat & Project Checker.
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
import { EcosystemApp } from '../config/ecosystemApps';
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
  'Saya ingin membuat konten',
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

  // Find app object from recommendedAppId
  const getAppById = (appId: string): EcosystemApp | undefined => {
    return apps.find((a) => a.id === appId);
  };

  return (
    <section
      id="section-alco-navigator"
      aria-labelledby="heading-alco-navigator"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden"
    >
      {/* Header bar */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles className="w-5 h-5 text-indigo-300" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="heading-alco-navigator" className="text-base sm:text-lg font-bold tracking-tight text-white">
                Tanya ALCO Navigator
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/20 uppercase tracking-wider">
                AI Asisten
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Pemandu langkah berikutnya di ekosistem ALCO tanpa bingung mulai dari mana.
            </p>
          </div>
        </div>

        {/* API Key Status & Management */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {apiKey ? (
            <button
              id="manage-api-key-btn"
              type="button"
              onClick={onRequestApiKey}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors"
              title="Kelola Gemini API Key"
            >
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              <span>Key: <span className="font-mono text-emerald-300">{getMaskedApiKey(apiKey)}</span></span>
            </button>
          ) : (
            <button
              id="activate-api-key-btn"
              type="button"
              onClick={onRequestApiKey}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-colors"
            >
              <Key className="w-3.5 h-3.5 text-slate-950" />
              <span>Aktivasi API Key</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="border-b border-slate-200 bg-slate-50/70 px-5 sm:px-6 flex items-center gap-2 pt-2">
        <button
          id="tab-consult-btn"
          type="button"
          onClick={() => setActiveTab('consult')}
          className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all inline-flex items-center gap-2 ${
            activeTab === 'consult'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Konsultasi Cepat</span>
        </button>
        <button
          id="tab-checker-btn"
          type="button"
          onClick={() => setActiveTab('checker')}
          className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all inline-flex items-center gap-2 ${
            activeTab === 'checker'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Project Checker (5 Langkah)</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="p-5 sm:p-6 space-y-6">

        {/* TAB 1: Konsultasi Cepat */}
        {activeTab === 'consult' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Pilih situasi Anda atau ketik sendiri:
              </label>
              <div className="flex flex-wrap gap-2">
                {QUICK_CHOICES.map((choice, idx) => (
                  <button
                    key={idx}
                    id={`quick-choice-btn-${idx}`}
                    type="button"
                    onClick={() => {
                      setCustomQuery(choice);
                      handleConsult(choice);
                    }}
                    disabled={isLoadingAdvice}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left ${
                      activeQueryText === choice
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold ring-1 ring-indigo-200'
                        : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
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
              <div className="relative flex-1">
                <input
                  id="custom-navigator-query-input"
                  type="text"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="Atau ceritakan situasi Anda secara singkat..."
                  disabled={isLoadingAdvice}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none placeholder:text-slate-400 bg-white"
                />
              </div>
              <button
                id="send-navigator-query-btn"
                type="submit"
                disabled={isLoadingAdvice || !customQuery.trim()}
                className="px-4 py-2.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tanya</span>
              </button>
            </form>

            {/* Loading State */}
            {isLoadingAdvice && (
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                <div>
                  <p className="text-sm font-bold text-slate-900">ALCO Navigator sedang menganalisis...</p>
                  <p className="text-xs text-slate-500 mt-0.5">Menyiapkan rekomendasi aplikasi dan langkah yang paling tepat.</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {adviceError && !isLoadingAdvice && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
                <div className="flex items-start gap-2.5 text-rose-900">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold">{adviceError}</p>
                    <p className="text-rose-700">Pastikan API Key sudah benar dan terhubung dengan akun Google AI Studio aktif.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleConsult(activeQueryText || customQuery)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Coba Lagi</span>
                  </button>
                  <button
                    type="button"
                    onClick={onRequestApiKey}
                    className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-800 border border-rose-300 rounded-lg text-xs font-medium"
                  >
                    Periksa API Key
                  </button>
                </div>
              </div>
            )}

            {/* Result Advice Card */}
            {adviceResult && !isLoadingAdvice && (
              <div
                id="advice-result-card"
                className="p-5 sm:p-6 rounded-xl bg-indigo-50/40 border border-indigo-100/80 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-700" />
                    <h3 className="text-sm font-bold text-indigo-950">Rekomendasi ALCO Navigator</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAdviceResult(null);
                      setCustomQuery('');
                      setActiveQueryText('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>

                {/* 1. Ringkasan Kondisi */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Ringkasan Kondisi Anda
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                    {adviceResult.userSummary}
                  </p>
                </div>

                {/* 2. Langkah Berikutnya yang Tepat */}
                <div className="p-3.5 rounded-lg bg-white border border-indigo-200/80 space-y-1.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    Langkah Berikutnya yang Paling Tepat
                  </span>
                  <p className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {adviceResult.nextStep}
                  </p>
                </div>

                {/* 3. Alasan Singkat */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Alasan
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {adviceResult.reason}
                  </p>
                  {adviceResult.additionalTip && (
                    <p className="text-[11px] text-indigo-800 italic pt-1">
                      💡 Tips: {adviceResult.additionalTip}
                    </p>
                  )}
                </div>

                {/* 4. Action CTA Button */}
                {adviceResult.recommendedAppId && adviceResult.recommendedAppId !== 'none' && (
                  <div className="pt-3 border-t border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-slate-600">
                      Modul tujuan: <strong className="text-slate-900">{adviceResult.recommendedAppName}</strong>
                    </div>
                    {(() => {
                      const matchedApp = getAppById(adviceResult.recommendedAppId);
                       const isAvailable = Boolean(matchedApp && (matchedApp.launchMode === 'desktop' || matchedApp.url.trim().length > 0));

                      if (isAvailable && matchedApp) {
                        return (
                          <button
                            id="navigator-cta-open-app-btn"
                            type="button"
                             onClick={() => onOpenAppUrl(matchedApp)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all shadow-xs"
                          >
                            <span>{matchedApp.buttonLabel}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                          </button>
                        );
                      }

                      return (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-400 text-xs font-medium border border-slate-200 cursor-not-allowed"
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{matchedApp?.name || 'Aplikasi'} (Segera Hadir)</span>
                        </button>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Project Checker */}
        {activeTab === 'checker' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Pilih kondisi project Anda saat ini:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PROJECT_CONDITIONS.map((cond) => {
                  const isSelected = selectedCondition === cond.label;
                  return (
                    <button
                      key={cond.id}
                      id={`cond-btn-${cond.id}`}
                      type="button"
                      onClick={() => handleCheckProject(cond.label)}
                      disabled={isLoadingChecker}
                      className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-200 text-indigo-950'
                          : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{cond.label}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{cond.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Loading State */}
            {isLoadingChecker && (
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                <div>
                  <p className="text-sm font-bold text-slate-900">Menyusun 5 langkah rencana aksi...</p>
                  <p className="text-xs text-slate-500 mt-0.5">Memetakan prioritas dan keterhubungan modul ekosistem ALCO.</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {checkerError && !isLoadingChecker && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
                <div className="flex items-start gap-2.5 text-rose-900">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold">{checkerError}</p>
                    <p className="text-rose-700">Gagal menyusun checklist. Silakan periksa kunci API Anda.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCheckProject(selectedCondition)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Coba Lagi</span>
                  </button>
                  <button
                    type="button"
                    onClick={onRequestApiKey}
                    className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-800 border border-rose-300 rounded-lg text-xs font-medium"
                  >
                    Periksa API Key
                  </button>
                </div>
              </div>
            )}

            {/* Result Checklist Card */}
            {checkerResult && !isLoadingChecker && (
              <div
                id="checker-result-card"
                className="p-5 sm:p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-5"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Checklist Aksi: <span className="text-indigo-700">{selectedCondition}</span>
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Maks. 5 Langkah Terarah</span>
                </div>

                {/* Ringkasan status */}
                <div className="p-3 rounded-lg bg-white border border-slate-200/80 text-xs text-slate-700">
                  <strong className="text-slate-900 block mb-0.5">Analisis Proyek:</strong>
                  {checkerResult.conditionSummary}
                </div>

                {/* 5 Checklist Steps */}
                <div className="space-y-3">
                  {checkerResult.steps.map((step) => {
                    const matchedApp = step.targetAppId ? getAppById(step.targetAppId) : undefined;
                    const hasAppUrl = Boolean(matchedApp?.url && matchedApp.url.trim().length > 0);

                    return (
                      <div
                        key={step.stepNumber}
                        id={`project-step-${step.stepNumber}`}
                        className="p-3.5 rounded-lg bg-white border border-slate-200/90 flex items-start gap-3 shadow-2xs hover:border-slate-300 transition-colors"
                      >
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {step.stepNumber}
                        </span>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                              {step.title}
                            </h4>
                            {matchedApp && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {matchedApp.shortName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                        {hasAppUrl && matchedApp && (
                          <button
                            type="button"
                            onClick={() => onOpenAppUrl(matchedApp)}
                            title={`Buka ${matchedApp.name}`}
                            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Main Focus Recommendation */}
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-900">
                  <strong className="font-bold text-emerald-950 block mb-0.5">Fokus Pertama Anda:</strong>
                  {checkerResult.mainRecommendation}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
};
