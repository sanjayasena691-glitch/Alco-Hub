/**
 * ALCO Hub - Notification Center Modal
 * Pusat pengumuman resmi Owner untuk seluruh pengguna ALCO Hub.
 */

import React, { useState } from 'react';
import {
  X,
  Bell,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Megaphone,
  ExternalLink,
  CheckCheck,
  Calendar,
  Clock,
  ChevronRight,
  Info,
} from 'lucide-react';
import { BroadcastNotification, NotificationType } from '../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: BroadcastNotification[];
  readIds: string[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigateTab?: (tab: any) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  readIds,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigateTab,
}) => {
  const [selectedType, setSelectedType] = useState<NotificationType | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (selectedType === 'all') return true;
    return n.type === selectedType;
  });

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const handleOpenActionUrl = (notif: BroadcastNotification) => {
    onMarkAsRead(notif.id);

    if (notif.actionUrl) {
      if (window.alcoHub?.openExternal) {
        window.alcoHub.openExternal(notif.actionUrl);
      } else {
        window.open(notif.actionUrl, '_blank', 'noopener,noreferrer');
      }
    } else if (notif.actionLabel?.toLowerCase().includes('pack') && onNavigateTab) {
      onClose();
      onNavigateTab('packs');
    } else if (notif.actionLabel?.toLowerCase().includes('app') && onNavigateTab) {
      onClose();
      onNavigateTab('store');
    }
  };

  const getBadgeConfig = (type: NotificationType) => {
    switch (type) {
      case 'hub_update':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />,
          label: 'ALCO Hub Update',
          badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
          accentBorder: 'border-emerald-500/30',
        };
      case 'new_product':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
          label: 'New Product',
          badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
          accentBorder: 'border-purple-500/30',
        };
      case 'maintenance':
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />,
          label: 'Maintenance / Notice',
          badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
          accentBorder: 'border-amber-500/30',
        };
      case 'general':
      default:
        return {
          icon: <Megaphone className="w-3.5 h-3.5 text-blue-400" />,
          label: 'Announcement',
          badgeClass: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
          accentBorder: 'border-blue-500/30',
        };
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      id="notification-center-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="notification-center-card"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl shadow-black/80 overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  Notification Center
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                    {unreadCount} Baru
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Pengumuman dan pembaruan resmi Aladzan Corpora
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                id="mark-all-read-btn"
                type="button"
                onClick={onMarkAllAsRead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                title="Tandai semua pesan sebagai telah dibaca"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tandai Semua Dibaca</span>
              </button>
            )}
            <button
              id="close-notification-center-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-950/30 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all shrink-0 ${
              selectedType === 'all'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Semua ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('hub_update')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedType === 'hub_update'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900'
            }`}
          >
            <RefreshCw className="w-3 h-3" />
            <span>ALCO Hub Update</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('new_product')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedType === 'new_product'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-purple-300 hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>New Products</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('maintenance')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedType === 'maintenance'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-amber-300 hover:bg-slate-900'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Notices</span>
          </button>
        </div>

        {/* Notifications List */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1 divide-y-0">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notif) => {
              const isRead = readIds.includes(notif.id);
              const badge = getBadgeConfig(notif.type);
              const isExpanded = expandedId === notif.id;

              return (
                <div
                  key={notif.id}
                  id={`notif-card-${notif.id}`}
                  onClick={() => {
                    onMarkAsRead(notif.id);
                    setExpandedId(isExpanded ? null : notif.id);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isRead
                      ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                      : `bg-slate-900 border-l-4 ${badge.accentBorder} border-slate-700 shadow-md shadow-black/30`
                  }`}
                >
                  {/* Top Bar: Badge, Version, Timestamp, Unread dot */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border ${badge.badgeClass}`}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>

                      {notif.targetVersion && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          v{notif.targetVersion}
                        </span>
                      )}

                      {!isRead && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                          <span>Baru</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0 font-medium">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(notif.publishedAt)}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="mt-2.5">
                    <h3
                      className={`text-sm font-bold tracking-tight ${
                        isRead ? 'text-slate-200' : 'text-white'
                      }`}
                    >
                      {notif.title}
                    </h3>
                  </div>

                  {/* Message content */}
                  <div className="mt-1.5">
                    <p
                      className={`text-xs text-slate-400 leading-relaxed whitespace-pre-line ${
                        isExpanded ? '' : 'line-clamp-3'
                      }`}
                    >
                      {notif.message}
                    </p>
                  </div>

                  {/* Special Note for ALCO Hub Update */}
                  {notif.type === 'hub_update' && (
                    <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 flex items-start gap-2 text-[11px] text-emerald-300">
                      <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        ALCO Hub mendistribusikan rilis melalui tautan unduhan resmi. Hub tidak melakukan self-update otomatis di background untuk menjaga integritas file lokal Anda.
                      </span>
                    </div>
                  )}

                  {/* CTA Action Button */}
                  {(notif.actionUrl || notif.actionLabel) && (
                    <div className="mt-3 pt-3 border-t border-slate-800/70 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenActionUrl(notif);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all"
                      >
                        <span>{notif.actionLabel || 'Buka Tautan'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-[11px] text-slate-500 font-mono">
                        {isExpanded ? 'Klik untuk menciutkan' : 'Klik untuk rincian lengkap'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-500">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-300">Tidak ada pengumuman</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Belum ada notifikasi resmi untuk kategori yang Anda pilih saat ini.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>ALCO Official Broadcast Service</span>
          <span>Aladzan Corpora Distribution</span>
        </div>
      </div>
    </div>
  );
};
