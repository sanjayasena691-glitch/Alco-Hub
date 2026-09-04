/**
 * Modal Pengaturan API Key Gemini
 * Menyimpan kunci secara aman di localStorage pengguna tanpa transmisi ke server backend eksternal.
 */

import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, ShieldCheck, ExternalLink, Trash2, X, Check } from 'lucide-react';
import { getUserApiKey, setUserApiKey, removeUserApiKey, getMaskedApiKey } from '../services/aiNavigatorService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (apiKey: string) => void;
  onOpenExternalUrl?: (url: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  onOpenExternalUrl,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [currentKey, setCurrentKey] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = getUserApiKey();
      setCurrentKey(stored);
      setApiKeyInput(stored);
      setErrorMessage('');
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKeyInput.trim();

    if (!cleanKey) {
      setErrorMessage('Silakan masukkan Gemini API Key Anda.');
      return;
    }

    if (cleanKey.length < 15) {
      setErrorMessage('Format API Key tampak terlalu pendek. Pastikan Anda menyalin seluruh kunci dari Google AI Studio.');
      return;
    }

    setUserApiKey(cleanKey);
    setCurrentKey(cleanKey);
    setSavedSuccess(true);
    setErrorMessage('');
    setTimeout(() => {
      onSaved(cleanKey);
      onClose();
    }, 400);
  };

  const handleRemove = () => {
    removeUserApiKey();
    setCurrentKey('');
    setApiKeyInput('');
    setSavedSuccess(false);
  };

  const handleAiStudioLink = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = 'https://aistudio.google.com/app/apikey';
    if (onOpenExternalUrl) {
      onOpenExternalUrl(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      id="api-key-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-key-modal-title"
    >
      <div
        id="api-key-modal-card"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Close button */}
        <button
          id="close-api-key-modal-btn"
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 pr-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Key className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 id="api-key-modal-title" className="text-lg font-bold text-slate-900 leading-tight">
              Aktivasi ALCO Navigator
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Gunakan Gemini API Key pribadi Anda untuk mengaktifkan asisten rekomendasi AI.
            </p>
          </div>
        </div>

        {/* Privacy badge */}
        <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-2.5 text-xs text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="font-semibold">Privasi Terjaga & Tersimpan Lokal</p>
            <p className="text-emerald-800 text-[11px] leading-relaxed">
              Kunci API disimpan hanya di memori lokal perangkat Anda. Tidak ada server perantara yang mencatat atau membagikan kunci ini.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="gemini-api-key-input" className="text-xs font-semibold text-slate-700">
                Gemini API Key
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                onClick={handleAiStudioLink}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
              >
                <span>Dapatkan API Key gratis</span>
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </div>

            <div className="relative">
              <input
                id="gemini-api-key-input"
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="Tempelkan API Key (contoh: AIzaSy...)"
                autoComplete="off"
                spellCheck="false"
                className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400 font-mono text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                aria-label={showKey ? 'Sembunyikan API Key' : 'Tampilkan API Key'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMessage && (
              <p className="text-xs text-rose-600 font-medium pt-0.5">{errorMessage}</p>
            )}

            {currentKey && !savedSuccess && (
              <p className="text-[11px] text-slate-500">
                Status saat ini: <span className="font-mono text-slate-700 font-medium">{getMaskedApiKey(currentKey)}</span>
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {currentKey ? (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Key</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                id="save-api-key-submit-btn"
                type="submit"
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition-all ${
                  savedSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.99]'
                }`}
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Tersimpan!</span>
                  </>
                ) : (
                  <span>Simpan & Aktifkan</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
