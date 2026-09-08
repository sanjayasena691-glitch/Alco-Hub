/**
 * ALCO Hub - Independent Broadcast Notification Service
 * Mengelola pengumuman resmi Owner (Supabase <-> Hub Client), cache offline, dan status unread.
 */

import { BroadcastNotification, NotificationType } from '../types';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEY_NOTIFICATIONS_CACHE = 'alco_hub_notifications_cache_v2';
const STORAGE_KEY_READ_NOTIFICATIONS = 'alco_hub_read_notifications_v2';

/**
 * Pengumuman bawaan sistem (Fallback saat Supabase belum dikonfigurasi / offline)
 */
export const DEFAULT_NOTIFICATIONS: BroadcastNotification[] = [
  {
    id: 'seed-hub-v1-launch',
    title: 'Selamat Datang di ALCO Hub Desktop',
    message: 'ALCO Hub resmi dirilis sebagai pusat katalog terpusat, instalasi desktop, dan ekosistem aplikasi Aladzan Corpora. Seluruh aplikasi Anda dapat diakses dan dikelola dalam satu pintu.',
    type: 'general',
    published: true,
    publishedAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    actionLabel: 'Jelajahi Ekosistem',
    actionUrl: 'https://aladzancorpora.com',
    targetVersion: '1.0.0',
  },
  {
    id: 'seed-hub-update-guide',
    title: 'Pemberitahuan Sistem Pembaruan ALCO Hub',
    message: 'Untuk menjaga stabilitas sistem dan integritas binary, pembaruan resmi ALCO Hub di masa mendatang akan diumumkan melalui Notification Center ini dengan tautan unduhan langsung ke rilis resmi Aladzan Corpora.',
    type: 'hub_update',
    published: true,
    publishedAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    actionLabel: 'Pelajari Mekanisme Rilis',
    actionUrl: 'https://aladzancorpora.com/updates',
    targetVersion: '1.0.0',
  },
  {
    id: 'seed-product-pack-prodigi',
    title: 'Ecosystem Pack Baru: Prodigi Suite Siap Rilis',
    message: 'Founder telah menambahkan rangkaian paket produk baru untuk automasi konten dan alur kerja kreatif digital. Pantau terus menu Packs untuk pembaruan modul terbaru.',
    type: 'new_product',
    published: true,
    publishedAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    actionLabel: 'Buka Menu Packs',
    actionUrl: '',
    targetVersion: null,
  },
];

let inMemoryNotifications: BroadcastNotification[] | null = null;

// ==============================================================================
// 1. DATA MAPPING
// ==============================================================================

export function mapDbRowToNotification(row: any): BroadcastNotification {
  return {
    id: String(row.id),
    title: String(row.title || 'Pengumuman Resmi'),
    message: String(row.message || ''),
    type: (row.type || 'general') as NotificationType,
    published: Boolean(row.published ?? true),
    publishedAt: row.published_at || row.created_at || new Date().toISOString(),
    expiresAt: row.expires_at || null,
    actionLabel: row.action_label || null,
    actionUrl: row.action_url || null,
    targetVersion: row.target_version || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapNotificationToDbPayload(n: Partial<BroadcastNotification>): any {
  const payload: any = {
    title: n.title,
    message: n.message,
    type: n.type || 'general',
    published: n.published ?? true,
    published_at: n.publishedAt || new Date().toISOString(),
    expires_at: n.expiresAt || null,
    action_label: n.actionLabel || null,
    action_url: n.actionUrl || null,
    target_version: n.targetVersion || null,
    updated_at: new Date().toISOString(),
  };

  if (n.id && !n.id.startsWith('temp-') && !n.id.startsWith('seed-')) {
    payload.id = n.id;
  }

  return payload;
}

// ==============================================================================
// 2. CACHE & READ STATUS MANAGEMENT
// ==============================================================================

export function getCachedNotifications(): BroadcastNotification[] {
  if (inMemoryNotifications && inMemoryNotifications.length > 0) {
    return inMemoryNotifications;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS_CACHE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryNotifications = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[NotificationService] Failed to read cached notifications:', err);
  }

  inMemoryNotifications = DEFAULT_NOTIFICATIONS;
  return DEFAULT_NOTIFICATIONS;
}

export function saveNotificationsToCache(notifications: BroadcastNotification[]): void {
  inMemoryNotifications = notifications;
  try {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS_CACHE, JSON.stringify(notifications));
  } catch (err) {
    console.warn('[NotificationService] Failed to cache notifications:', err);
  }
}

export function getReadNotificationIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_READ_NOTIFICATIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[NotificationService] Failed to get read notification IDs:', err);
  }
  return [];
}

export function markNotificationAsRead(id: string): string[] {
  const current = getReadNotificationIds();
  if (!current.includes(id)) {
    const updated = [...current, id];
    try {
      localStorage.setItem(STORAGE_KEY_READ_NOTIFICATIONS, JSON.stringify(updated));
    } catch (err) {
      console.warn('[NotificationService] Failed to save read notification:', err);
    }
    return updated;
  }
  return current;
}

export function markAllNotificationsAsRead(ids: string[]): string[] {
  const current = new Set(getReadNotificationIds());
  ids.forEach((id) => current.add(id));
  const updated = Array.from(current);
  try {
    localStorage.setItem(STORAGE_KEY_READ_NOTIFICATIONS, JSON.stringify(updated));
  } catch (err) {
    console.warn('[NotificationService] Failed to save all read notifications:', err);
  }
  return updated;
}

// ==============================================================================
// 3. SUPABASE CLOUD SYNC & CRUD OPERATIONS
// ==============================================================================

export async function syncNotificationsWithSupabase(isAdmin: boolean = false): Promise<BroadcastNotification[]> {
  const client = getSupabase();

  if (!isSupabaseConfigured() || !client) {
    const cached = getCachedNotifications();
    return isAdmin ? cached : cached.filter((n) => n.published);
  }

  try {
    let query = client
      .from('notifications')
      .select('*')
      .order('published_at', { ascending: false });

    // Jika bukan Owner, hanya tampilkan yang sudah published
    if (!isAdmin) {
      query = query.eq('published', true);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[NotificationService] Supabase notifications fetch warning:', error.message);
      // Fallback ke cache jika tabel belum dimigrasikan atau network down
      const cached = getCachedNotifications();
      return isAdmin ? cached : cached.filter((n) => n.published);
    }

    if (data && data.length > 0) {
      let mapped = data.map(mapDbRowToNotification);

      // Filter expired & future date untuk public user
      if (!isAdmin) {
        const now = Date.now();
        mapped = mapped.filter((n) => {
          if (!n.published) return false;
          if (n.expiresAt && new Date(n.expiresAt).getTime() < now) return false;
          return true;
        });
      }

      saveNotificationsToCache(mapped);
      return mapped;
    } else {
      // Jika tabel Supabase ada tapi kosong dan user adalah Owner, tetap return empty array
      if (isAdmin && data) {
        saveNotificationsToCache([]);
        return [];
      }
      return getCachedNotifications();
    }
  } catch (err) {
    console.warn('[NotificationService] Error syncing notifications:', err);
    return getCachedNotifications();
  }
}

export async function saveNotificationToCloud(
  notification: Partial<BroadcastNotification>,
  isAdmin: boolean = true
): Promise<{ success: boolean; data?: BroadcastNotification; message?: string }> {
  const client = getSupabase();
  const payload = mapNotificationToDbPayload(notification);

  if (!isSupabaseConfigured() || !client) {
    // Local / offline fallback
    const id = notification.id || `local-${Date.now()}`;
    const localNotif: BroadcastNotification = {
      id,
      title: notification.title || 'Pengumuman Baru',
      message: notification.message || '',
      type: notification.type || 'general',
      published: notification.published ?? true,
      publishedAt: notification.publishedAt || new Date().toISOString(),
      expiresAt: notification.expiresAt || null,
      actionLabel: notification.actionLabel || null,
      actionUrl: notification.actionUrl || null,
      targetVersion: notification.targetVersion || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const current = getCachedNotifications();
    const updated = [localNotif, ...current.filter((n) => n.id !== id)];
    saveNotificationsToCache(updated);

    return {
      success: true,
      data: localNotif,
      message: 'Disimpan secara lokal (Supabase belum terhubung).',
    };
  }

  try {
    let resultData: any = null;

    if (notification.id && !notification.id.startsWith('temp-') && !notification.id.startsWith('seed-') && !notification.id.startsWith('local-')) {
      // UPDATE existing
      const { data, error } = await client
        .from('notifications')
        .update(payload)
        .eq('id', notification.id)
        .select()
        .single();

      if (error) {
        return { success: false, message: `Gagal memperbarui notifikasi: ${error.message}` };
      }
      resultData = data;
    } else {
      // INSERT new
      const { data, error } = await client
        .from('notifications')
        .insert(payload)
        .select()
        .single();

      if (error) {
        return { success: false, message: `Gagal membuat notifikasi: ${error.message}` };
      }
      resultData = data;
    }

    const mapped = mapDbRowToNotification(resultData);
    const current = getCachedNotifications();
    const updated = [mapped, ...current.filter((n) => n.id !== mapped.id)];
    saveNotificationsToCache(updated);

    return {
      success: true,
      data: mapped,
      message: 'Pengumuman broadcast berhasil disimpan ke Supabase!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error koneksi: ${err.message || 'Gagal menyimpan ke server'}`,
    };
  }
}

export async function deleteNotificationFromCloud(
  id: string,
  isAdmin: boolean = true
): Promise<{ success: boolean; message?: string }> {
  const client = getSupabase();

  if (!isSupabaseConfigured() || !client) {
    const current = getCachedNotifications();
    const updated = current.filter((n) => n.id !== id);
    saveNotificationsToCache(updated);
    return { success: true, message: 'Notifikasi dihapus dari penyimpanan lokal.' };
  }

  try {
    const { error } = await client
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, message: `Gagal menghapus notifikasi: ${error.message}` };
    }

    const current = getCachedNotifications();
    const updated = current.filter((n) => n.id !== id);
    saveNotificationsToCache(updated);

    return { success: true, message: 'Notifikasi berhasil dihapus.' };
  } catch (err: any) {
    return { success: false, message: `Error: ${err.message || 'Gagal menghapus'}` };
  }
}

export async function toggleNotificationPublish(
  id: string,
  newPublished: boolean
): Promise<{ success: boolean; message?: string }> {
  const client = getSupabase();

  if (!isSupabaseConfigured() || !client) {
    const current = getCachedNotifications();
    const updated = current.map((n) => (n.id === id ? { ...n, published: newPublished } : n));
    saveNotificationsToCache(updated);
    return { success: true, message: `Status berhasil diubah ke ${newPublished ? 'Published' : 'Draft'}` };
  }

  try {
    const { error } = await client
      .from('notifications')
      .update({ published: newPublished, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { success: false, message: error.message };
    }

    const current = getCachedNotifications();
    const updated = current.map((n) => (n.id === id ? { ...n, published: newPublished } : n));
    saveNotificationsToCache(updated);

    return { success: true, message: `Status diubah ke ${newPublished ? 'Published' : 'Draft'}` };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
