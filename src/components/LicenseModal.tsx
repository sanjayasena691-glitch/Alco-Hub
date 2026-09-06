/**
 * Modal Aktivasi Lisensi & Kontak Pembelian ALCO
 * Digunakan saat user ingin membeli lisensi atau memasukkan license key untuk membuka aplikasi berbayar.
 */

import React, { useState } from 'react';
import {
  Key,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Lock,
  X,
  ShoppingBag,
} from 'lucide-react';
import { EcosystemApp, ContactAlcoConfig, UserLicense } from '../types';
import {
  activateLicense,
  createWhatsAppOrderLink,
  revokeLicense,
} from '../services/storeService';

interface LicenseModalProps {
  app: EcosystemApp | null;
  isOpen: boolean;
  onClose: () => void;
  userLicense?: UserLicense;
  contactConfig: ContactAlcoConfig;
  onLicenseActivated: (appId: string) => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({
  app,
  isOpen,
  onClose,
  userLicense,
  contactConfig,
  onLicenseActivated,
}) => {
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [userNameInput, setUserNameInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen || !app) return null;

  const isAlreadyLicensed = Boolean(userLicense && userLicense.status === 'active');

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const res = activateLicense(
      app.id,
      licenseKeyInput,
      userNameInput.trim() || 'Pengguna Resmi ALCO'
    );

    if (res.success) {
      setSuccessMessage(res.message);
      setTimeout(() => {
        onLicenseActivated(app.id);
        onClose();
      }, 700);
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleRevoke = () => {
    if (window.confirm(`Apakah Anda yakin ingin mencabut lisensi untuk ${app.name}?`)) {
      revokeLicense(app.id);
      onLicenseActivated(app.id);
      onClose();
    }
  };

  const waLink = createWhatsAppOrderLink(app, contactConfig);

  return (
    <div
      id="license-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        id="license-modal-card"
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 sm:p-7 space-y-6 shadow-2xl relative overflow-hidden"
      >
        <button
          id="close-license-modal-btn"
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 pr-8">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
            {isAlreadyLicensed ? <ShieldCheck className="w-6 h-6 text-emerald-400" /> : <Lock className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white leading-tight">
                {isAlreadyLicensed ? 'Lisensi Resmi Aktif' : 'Aktivasi Lisensi Resmi'}
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                {app.shortName}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {app.name} • {app.functionLabel}
            </p>
          </div>
        </div>

        {/* Product Price & Licensing Information */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Status Aplikasi:</span>
            <span className="font-bold text-white uppercase">{app.pricingType}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Biaya Lisensi Resmi:</span>
            <span className="font-bold text-emerald-400 text-sm">{app.priceLabel || 'Hubungi ALCO'}</span>
          </div>
        </div>

        {/* State A: User already has active license */}
        {isAlreadyLicensed && userLicense && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Lisensi Terdaftar & Terverifikasi</span>
              </div>
              <div className="space-y-1 font-mono text-[11px] text-slate-300">
                <p>Key: <span className="text-emerald-400 font-bold">{userLicense.licenseKey}</span></p>
                <p>Pemilik: {userLicense.licensedTo}</p>
                <p>Diaktifkan: {new Date(userLicense.activatedAt).toLocaleDateString('id-ID')}</p>
              </div>
              <p className="text-[11px] text-emerald-300/80 pt-1">
                Lisensi ini tersimpan di memori perangkat Anda dan tidak akan terhapus saat melakukan pembaruan versi aplikasi.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleRevoke}
                className="text-xs text-rose-400 hover:text-rose-300 underline"
              >
                Cabut Lisensi dari Perangkat Ini
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* State B: User does not have license yet */}
        {!isAlreadyLicensed && (
          <div className="space-y-5">
            {/* Step 1: Order / Contact ALCO via WhatsApp */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-950 border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Belum memiliki Lisensi?
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold uppercase">Official Contact</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hubungi tim resmi Aladzan Corpora untuk pemesanan lisensi aplikasi ini. Anda akan menerima <strong>License Key</strong> resmi setelah transaksi diverifikasi.
              </p>
              <a
                id="contact-whatsapp-order-btn"
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-tight transition-all shadow-md active:scale-[0.99]"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Beli / Minta Lisensi via WhatsApp</span>
                <ExternalLink className="w-3 h-3 text-slate-800" />
              </a>
            </div>

            {/* Step 2: License Key Input Form */}
            <form onSubmit={handleActivate} className="space-y-3.5 pt-1">
              <div className="space-y-1.5">
                <label htmlFor="license-key-input" className="text-xs font-semibold text-slate-200">
                  Masukkan License Key yang Diberikan ALCO
                </label>
                <input
                  id="license-key-input"
                  type="text"
                  value={licenseKeyInput}
                  onChange={(e) => {
                    setLicenseKeyInput(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="Contoh: ALCO-CREA-9821-4321"
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-white placeholder:text-slate-600"
                  spellCheck="false"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="licensed-name-input" className="text-xs font-semibold text-slate-300">
                  Nama Pemilik Lisensi (Opsional)
                </label>
                <input
                  id="licensed-name-input"
                  type="text"
                  value={userNameInput}
                  onChange={(e) => setUserNameInput(e.target.value)}
                  placeholder="Nama Anda atau Nama Bisnis"
                  className="w-full px-3.5 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-white placeholder:text-slate-600"
                />
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  id="submit-activate-license-btn"
                  type="submit"
                  disabled={!licenseKeyInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-all shadow-xs disabled:opacity-50"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Aktivasi Lisensi</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
