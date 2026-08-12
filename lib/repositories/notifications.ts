import db from '../db';

export interface PushSubscription {
  id: number;
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface PushSubscriptionRow {
  id: number;
  user_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type NotificationType = '2days' | '1day' | '2hours' | '1hour';

export function upsertPushSubscription(
  userId: number,
  endpoint: string,
  p256dh: string,
  auth: string
): void {
  db.prepare(`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      user_id = excluded.user_id,
      p256dh = excluded.p256dh,
      auth = excluded.auth
  `).run(userId, endpoint, p256dh, auth);
}

export function deletePushSubscription(endpoint: string): void {
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
}

export function getAllSubscriptions(): PushSubscription[] {
  const rows = db.prepare('SELECT * FROM push_subscriptions').all() as PushSubscriptionRow[];
  return rows.map((r) => ({ id: r.id, userId: r.user_id, endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }));
}

export function getSubscriptionsByUserId(userId: number): PushSubscription[] {
  const rows = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(userId) as PushSubscriptionRow[];
  return rows.map((r) => ({ id: r.id, userId: r.user_id, endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }));
}

export function wasNotificationSent(
  userId: number,
  seasonYear: number,
  seasonType: number,
  week: number,
  type: NotificationType
): boolean {
  const row = db.prepare(`
    SELECT id FROM notification_logs
    WHERE user_id = ? AND season_year = ? AND season_type = ? AND week = ? AND notification_type = ?
  `).get(userId, seasonYear, seasonType, week, type);
  return row !== undefined;
}

export function logNotificationSent(
  userId: number,
  seasonYear: number,
  seasonType: number,
  week: number,
  type: NotificationType
): void {
  db.prepare(`
    INSERT OR IGNORE INTO notification_logs (user_id, season_year, season_type, week, notification_type)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, seasonYear, seasonType, week, type);
}

export function getUserPickCountForWeek(
  userId: number,
  seasonYear: number,
  seasonType: number,
  week: number
): { picks: number; total: number } {
  const result = db.prepare(`
    SELECT
      COUNT(g.id) as total,
      COUNT(p.id) as picks
    FROM games g
    LEFT JOIN predictions p ON p.game_id = g.id AND p.user_id = ?
    WHERE g.season_year = ? AND g.season_type = ? AND g.week = ?
  `).get(userId, seasonYear, seasonType, week) as { total: number; picks: number };
  return result;
}
