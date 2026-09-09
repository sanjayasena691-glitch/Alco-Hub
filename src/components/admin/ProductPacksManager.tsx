import React, { useState } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { EcosystemPack, EcosystemApp, ProductAccent } from '../../types';
import {
  saveProductPackToCloud,
  deleteProductPackFromCloud,
} from '../../services/storeService';
import { sanitizeAppId } from '../../utils/versioning';

interface ProductPacksManagerProps {
  packs: EcosystemPack[];
  apps: EcosystemApp[];
  onPacksUpdated: (newPacks: EcosystemPack[]) => void;
  onShowNotification: (message: string) => void;
}

export const ProductPacksManager: React.FC<ProductPacksManagerProps> = ({
  packs,
  apps,
  onPacksUpdated,
  onShowNotification,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingPackId, setEditingPackId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formTagline, setFormTagline] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('Ecosystem Pack');
  const [formAccent, setFormAccent] = useState<ProductAccent>('purple');
  const [formBadge, setFormBadge] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'coming-soon'>('active');

  const handleOpenAdd = () => {
    setIsEditing(true);
    setEditingPackId(null);
    setFormId('');
    setFormName('');
    setFormTagline('');
    setFormDesc('');
    setFormCategory('Ecosystem Pack');
    setFormAccent('purple');
    setFormBadge('Starter Pack');
    setFormStatus('active');
  };

  const handleOpenEdit = (pack: EcosystemPack) => {
    setIsEditing(true);
    setEditingPackId(pack.id);
    setFormId(pack.id);
    setFormName(pack.name);
    setFormTagline(pack.tagline || '');
    setFormDesc(pack.description || '');
    setFormCategory(pack.category || 'Ecosystem Pack');
    setFormAccent(pack.accent || 'purple');
    setFormBadge(pack.badge || '');
    setFormStatus(pack.status || 'active');
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingPackId) {
      setFormId(sanitizeAppId(val));
    }
  };

  const handleSavePack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formId.trim()) {
      alert('Nama Product Pack dan ID wajib diisi.');
      return;
    }

    const cleanId = sanitizeAppId(formId);
    setIsSubmitting(true);

    const packData: EcosystemPack = {
      id: cleanId,
      name: formName.trim(),
      tagline: formTagline.trim(),
      description: formDesc.trim(),
      category: formCategory.trim() || 'Ecosystem Pack',
      accent: formAccent,
      badge: formBadge.trim() || undefined,
      status: formStatus,
      toolCount: apps.filter((a) => a.packId === cleanId).length,
      isCustom: true,
      updatedAt: new Date().toISOString(),
    };

    const res = await saveProductPackToCloud(packData);
    setIsSubmitting(false);

    if (res.success) {
      let updated: EcosystemPack[];
      if (editingPackId) {
        updated = packs.map((p) => (p.id === editingPackId ? packData : p));
      } else {
        const existingIdx = packs.findIndex((p) => p.id === cleanId);
        if (existingIdx >= 0) {
          updated = packs.map((p) => (p.id === cleanId ? packData : p));
        } else {
          updated = [...packs, packData];
        }
      }
      onPacksUpdated(updated);
      setIsEditing(false);
      onShowNotification(res.message);
    } else {
      onShowNotification(res.message);
    }
  };

  const handleDeletePack = async (packId: string) => {
    const appsInPack = apps.filter((a) => a.packId === packId);
    if (appsInPack.length > 0) {
      alert(
        `Tidak dapat menghapus Product Pack ini karena masih ada ${appsInPack.length} aplikasi yang terhubung (${appsInPack.map((a) => a.name).join(', ')}). Pindahkan aplikasi ke pack lain terlebih dahulu.`
      );
      return;
    }

    if (window.confirm('Hapus Product Pack ini dari katalog ALCO Hub & Cloud Supabase?')) {
      const res = await deleteProductPackFromCloud(packId);
      if (res.success) {
        const updated = packs.filter((p) => p.id !== packId);
        onPacksUpdated(updated);
        onShowNotification(res.message);
      } else {
        onShowNotification(res.message);
      }
    }
  };

  const handleToggleStatus = async (pack: EcosystemPack) => {
    const nextStatus = pack.status === 'active' ? 'coming-soon' : 'active';
    const updatedPack: EcosystemPack = {
      ...pack,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    const res = await saveProductPackToCloud(updatedPack);
    if (res.success) {
      const updated = packs.map((p) => (p.id === pack.id ? updatedPack : p));
      onPacksUpdated(updated);
      onShowNotification(
        `Status pack "${pack.name}" diubah menjadi: ${nextStatus === 'active' ? 'Aktif' : 'Coming Soon'}`
      );
    } else {
      onShowNotification(res.message);
    }
  };

  return (
    <div id="product-packs-manager" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              Dynamic Product Packs
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Kelola Kelompok Produk (Product Packs)
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Kelola pengelompokan produk ekosistem ALCO secara dinamis. Founder dapat menambah pack baru seperti Meta Ads Starter Pack, Content Creator Pack, dll., tanpa perlu mengubah kode sumber.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Product Pack</span>
        </button>
      </div>

      {isEditing ? (
        /* Form Add / Edit Pack */
        <form
          onSubmit={handleSavePack}
          className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm dark:shadow-xl transition-colors"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingPackId ? 'Edit Product Pack' : 'Tambah Product Pack Baru'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Data pack akan tersimpan di tabel <code className="text-purple-600 dark:text-purple-300 font-mono">product_packs</code> di Supabase.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Batal
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Product Pack</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="contoh: Meta Ads Starter Pack"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pack ID / Slug{' '}
                {editingPackId && (
                  <span className="text-[10px] text-amber-500 dark:text-amber-400 font-normal">(Terkunci untuk integritas)</span>
                )}
              </label>
              <input
                type="text"
                value={formId}
                onChange={(e) => setFormId(sanitizeAppId(e.target.value))}
                disabled={Boolean(editingPackId)}
                placeholder="contoh: meta-ads-starter-pack"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono disabled:opacity-50 focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tagline / Subtitle</label>
              <input
                type="text"
                value={formTagline}
                onChange={(e) => setFormTagline(e.target.value)}
                placeholder="contoh: Eksekusi & Optimasi Iklan Facebook & Instagram"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kategori / Kelompok</label>
              <input
                type="text"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder="contoh: Marketing & Ads, Core System, Content Engine"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Aksen Warna Tema</label>
              <select
                value={formAccent}
                onChange={(e) => setFormAccent(e.target.value as ProductAccent)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              >
                <option value="purple">Purple (Creative / Executive)</option>
                <option value="emerald">Emerald (Marketing / Ads)</option>
                <option value="cyan">Cyan (Content / Media)</option>
                <option value="orange">Orange (Offer / Direct Response)</option>
                <option value="indigo">Indigo (Intelligence / Analytics)</option>
                <option value="teal">Teal (Landing Page / Web)</option>
                <option value="rose">Rose (Conversion / Sales)</option>
                <option value="amber">Amber (Automation / Tools)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Badge Label (Opsional)</label>
              <input
                type="text"
                value={formBadge}
                onChange={(e) => setFormBadge(e.target.value)}
                placeholder="contoh: Starter Pack, Pro Suite, Best Seller"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Status Pack</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as 'active' | 'coming-soon')}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              >
                <option value="active">Aktif (Tersedia untuk Pengelompokan & User)</option>
                <option value="coming-soon">Coming Soon (Dalam Pengembangan)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Deskripsi Lengkap Pack</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={3}
              placeholder="Jelaskan tujuan kelompok aplikasi ini dan target user yang cocok..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Menyimpan...' : editingPackId ? 'Simpan Perubahan Pack' : 'Buat Product Pack'}
            </button>
          </div>
        </form>
      ) : (
        /* Pack List */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packs.map((pack) => {
            const count = apps.filter((a) => a.packId === pack.id).length;
            return (
              <div
                key={pack.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-4 shadow-sm dark:shadow-xl"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-purple-500 inline-block shrink-0" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{pack.name}</h4>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        pack.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20'
                          : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20'
                      }`}
                    >
                      {pack.status === 'active' ? 'AKTIF' : 'COMING SOON'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>ID: {pack.id}</span>
                    <span>•</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{count} Aplikasi Terhubung</span>
                  </div>

                  {pack.tagline && (
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{pack.tagline}</p>
                  )}

                  {pack.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {pack.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{pack.category || 'Ecosystem Pack'}</span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(pack)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors"
                      title={pack.status === 'active' ? 'Jadikan Coming Soon' : 'Aktifkan Pack'}
                    >
                      {pack.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(pack)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                      title="Edit Pack"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePack(pack.id)}
                      className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors"
                      title="Hapus Pack"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
