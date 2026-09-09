/**
 * ALCO Hub - Owner Broadcast Notification Manager
 * Modul manajemen pengumuman resmi Owner: Buat, Edit, Publish/Unpublish, Expiration, dan CTA Links.
 */

import React, { useState } from 'react';
import {
  Bell,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Megaphone,
  ExternalLink,
  Clock,
  Eye,
  Calendar,
  Layers,
  X,
} from 'lucide-react';
import { BroadcastNotification, NotificationType } from '../../types';
import {
  saveNotificationToCloud,
  deleteNotificationFromCloud,
  toggleNotificationPublish,
} from '../../services/notificationService';

interface NotificationManagerProps {
  notifications: BroadcastNotification[];
  onNotificationsUpdated: (updated: BroadcastNotification[]) => void;
  onShowNotification: (msg: string) => void;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({
  notifications,
  onNotificationsUpdated,
  onShowNotification,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<BroadcastNotification | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<NotificationType>('general');
  const [formMessage, setFormMessage] = useState('');
  const [formPublished, setFormPublished] = useState(true);
  const [formPublishedAt, setFormPublishedAt] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formActionLabel, setFormActionLabel] = useState('');
  const [formActionUrl, setFormActionUrl] = useState('');
  const [formTargetVersion, setFormTargetVersion] = useState('');

  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Delete modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resetForm = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormType('general');
    setFormMessage('');
    setFormPublished(true);
    setFormPublishedAt(new Date().toISOString().slice(0, 16));
    setFormExpiresAt('');
    setFormActionLabel('');
    setFormActionUrl('');
    setFormTargetVersion('');
    setIsEditing(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setFormPublishedAt(new Date().toISOString().slice(0, 16));
    setIsEditing(true);
  };

  const handleOpenEdit = (item: BroadcastNotification) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormType(item.type);
    setFormMessage(item.message);
    setFormPublished(item.published);
    setFormPublishedAt(
      item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 16) : ''
    );
    setFormExpiresAt(
      item.expiresAt ? new Date(item.expiresAt).toISOString().slice(0, 16) : ''
    );
    setFormActionLabel(item.actionLabel || '');
    setFormActionUrl(item.actionUrl || '');
    setFormTargetVersion(item.targetVersion || '');
    setIsEditing(true);
  };

  const handleApplyTemplate = (type: NotificationType) => {
    setFormType(type);
    if (type === 'hub_update') {
      setFormTitle('Pembaruan Resmi ALCO Hub Tersedia');
      setFormMessage('Versi terbaru ALCO Hub telah dirilis dengan peningkatan stabilitas sistem distribusi, optimasi verifikasi binary hash, dan tampilan yang lebih responsif.');
      setFormActionLabel('Unduh Rilis Resmi');
      setFormActionUrl('https://aladzancorpora.com/updates');
      setFormTargetVersion('1.1.0');
    } else if (type === 'new_product') {
      setFormTitle('Aplikasi Baru: Meta Ads Accelerator');
      setFormMessage('Kini tersedia modul automasi pembuatan variasi copywriting dan optimasi conversion rate campaign iklan langsung di ekosistem Anda.');
      setFormActionLabel('Jelajahi di Store');
      setFormActionUrl('');
    } else if (type === 'maintenance') {
      setFormTitle('Pemberitahuan Sinkronisasi Cloud Supabase');
      setFormMessage('Server katalog terpusat sedang menjalani pemeliharaan performa rutin. Seluruh instalasi aplikasi desktop Anda tetap berjalan normal secara offline.');
      setFormActionLabel('Lihat Status');
      setFormActionUrl('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formMessage.trim()) {
      alert('Judul dan pesan pengumuman wajib diisi.');
      return;
    }

    setIsSubmitting(true);

    const payload: Partial<BroadcastNotification> = {
      id: editingItem ? editingItem.id : undefined,
      title: formTitle.trim(),
      type: formType,
      message: formMessage.trim(),
      published: formPublished,
      publishedAt: formPublishedAt ? new Date(formPublishedAt).toISOString() : new Date().toISOString(),
      expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
      actionLabel: formActionLabel.trim() || null,
      actionUrl: formActionUrl.trim() || null,
      targetVersion: formTargetVersion.trim() || null,
    };

    const res = await saveNotificationToCloud(payload);
    setIsSubmitting(false);

    if (res.success && res.data) {
      let updated: BroadcastNotification[];
      if (editingItem) {
        updated = notifications.map((n) => (n.id === editingItem.id ? res.data! : n));
      } else {
        updated = [res.data, ...notifications];
      }
      onNotificationsUpdated(updated);
      resetForm();
      onShowNotification(res.message || 'Pengumuman berhasil disimpan');
    } else {
      onShowNotification(res.message || 'Gagal menyimpan pengumuman.');
    }
  };

  const handleTogglePublish = async (item: BroadcastNotification) => {
    const nextStatus = !item.published;
    const res = await toggleNotificationPublish(item.id, nextStatus);
    if (res.success) {
      const updated = notifications.map((n) =>
        n.id === item.id ? { ...n, published: nextStatus } : n
      );
      onNotificationsUpdated(updated);
      onShowNotification(
        `Pengumuman "${item.title}" ${nextStatus ? 'dipublikasikan' : 'dijadikan draft'}.`
      );
    } else {
      onShowNotification('Gagal mengubah status publish.');
    }
  };

  const handleDelete = async (id: string) => {
    setIsSubmitting(true);
    const res = await deleteNotificationFromCloud(id);
    setIsSubmitting(false);
    setDeletingId(null);

    if (res.success) {
      const updated = notifications.filter((n) => n.id !== id);
      onNotificationsUpdated(updated);
      onShowNotification(res.message);
    } else {
      onShowNotification('Gagal menghapus pengumuman.');
    }
  };

  const filteredList = notifications.filter((item) => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (filterStatus === 'published' && !item.published) return false;
    if (filterStatus === 'draft' && item.published) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.message.toLowerCase().includes(q);
    }
    return true;
  });

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'hub_update':
        return <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'new_product':
        return <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'maintenance':
        return <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'general':
      default:
        return <Megaphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getTypeLabel = (type: NotificationType) => {
    switch (type) {
      case 'hub_update':
        return 'ALCO Hub Update';
      case 'new_product':
        return 'New Product';
      case 'maintenance':
        return 'Maintenance Notice';
      case 'general':
      default:
        return 'General Announcement';
    }
  };

  return (
    <div id="owner-notification-manager" className="space-y-6 animate-in fade-in">
      {/* Top Banner & Stats */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm dark:shadow-xl transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
              <Bell className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Broadcast Notification Center Manager
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Kirim pengumuman resmi, rilis pembaruan ALCO Hub, dan notifikasi ekosistem langsung ke seluruh aplikasi ALCO Hub pengguna secara terpusat melalui Supabase.
          </p>
        </div>

        <button
          id="btn-add-broadcast-notif"
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Pengumuman Baru</span>
        </button>
      </div>

      {/* Editor Modal / Panel */}
      {isEditing && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-500/40 shadow-2xl space-y-6 transition-colors">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                {editingItem ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingItem ? 'Edit Pengumuman Broadcast' : 'Form Pengumuman Broadcast Baru'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Data tersinkronisasi otomatis dengan tabel Supabase <code className="text-indigo-600 dark:text-indigo-300">notifications</code>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Template Buttons */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
              Gunakan Template Cepat:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleApplyTemplate('hub_update')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Template ALCO Hub Update</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('new_product')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 dark:hover:bg-purple-900/50 flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Template New Product</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('maintenance')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 flex items-center gap-1.5 transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Template Maintenance Notice</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tipe Notifikasi *
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as NotificationType)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="general">General Announcement</option>
                  <option value="hub_update">ALCO Hub Update (Official Release)</option>
                  <option value="new_product">New Product / Ecosystem App</option>
                  <option value="maintenance">Maintenance / Important Notice</option>
                </select>
              </div>

              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Pengumuman *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: ALCO Hub v1.3.0 Tersedia"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Target Version & Publication Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Version (Opsional)
                </label>
                <input
                  type="text"
                  value={formTargetVersion}
                  onChange={(e) => setFormTargetVersion(e.target.value)}
                  placeholder="Contoh: 1.3.0"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal & Waktu Publish
                </label>
                <input
                  type="datetime-local"
                  value={formPublishedAt}
                  onChange={(e) => setFormPublishedAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Expiration Date (Opsional)
                </label>
                <input
                  type="datetime-local"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Message / Content */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Isi Pesan Pengumuman *
              </label>
              <textarea
                required
                rows={4}
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                placeholder="Tuliskan pesan rincian pengumuman yang akan diterima seluruh pengguna..."
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 leading-relaxed font-sans"
              />
            </div>

            {/* Action Button & URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Action Button Label (Opsional)
                </label>
                <input
                  type="text"
                  value={formActionLabel}
                  onChange={(e) => setFormActionLabel(e.target.value)}
                  placeholder="Contoh: Download Update Resmi"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Action URL (Opsional)
                </label>
                <input
                  type="url"
                  value={formActionUrl}
                  onChange={(e) => setFormActionUrl(e.target.value)}
                  placeholder="Contoh: https://aladzancorpora.com/updates"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Published Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Status Publish</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {formPublished
                    ? 'Pengumuman langsung aktif dan dapat dibaca oleh publik Hub.'
                    : 'Disimpan sebagai Draft internal (hanya terlihat di Owner Portal).'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFormPublished(!formPublished)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  formPublished ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    formPublished ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Action Form Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan ke Supabase...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>{editingItem ? 'Simpan Perubahan' : 'Publish Pengumuman'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium"
          >
            <option value="all">Semua Tipe ({notifications.length})</option>
            <option value="hub_update">ALCO Hub Update</option>
            <option value="new_product">New Product</option>
            <option value="maintenance">Maintenance Notice</option>
            <option value="general">General Announcement</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium"
          >
            <option value="all">Semua Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft (Unpublished)</option>
          </select>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari pengumuman..."
          className="w-full sm:w-64 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder:text-slate-400"
        />
      </div>

      {/* Notifications Table / Cards List */}
      <div className="space-y-3">
        {filteredList.length > 0 ? (
          filteredList.map((item) => (
            <div
              key={item.id}
              id={`admin-notif-row-${item.id}`}
              className="p-5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {getTypeIcon(item.type)}
                    <span>{getTypeLabel(item.type)}</span>
                  </span>

                  {item.targetVersion && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                      v{item.targetVersion}
                    </span>
                  )}

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.published
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20'
                        : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20'
                    }`}
                  >
                    {item.published ? 'Published' : 'Draft'}
                  </span>

                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {new Date(item.publishedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{item.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">{item.message}</p>

                {item.actionUrl && (
                  <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                    <ExternalLink className="w-3 h-3" />
                    <span>
                      CTA: {item.actionLabel || 'Link'} →{' '}
                      <span className="text-slate-500 underline">{item.actionUrl}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleTogglePublish(item)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    item.published
                      ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                  }`}
                >
                  {item.published ? 'Unpublish' : 'Publish'}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(item)}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                  title="Edit Pengumuman"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setDeletingId(item.id)}
                  className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 transition-colors"
                  title="Hapus Pengumuman"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-center space-y-2">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Tidak ada pengumuman ditemukan</p>
            <p className="text-xs text-slate-500">
              Buat pengumuman baru untuk mengirim broadcast ke seluruh pengguna ALCO Hub.
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-black/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Konfirmasi Hapus Pengumuman</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus pengumuman ini secara permanen dari Supabase?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingId)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all"
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus Pengumuman'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
