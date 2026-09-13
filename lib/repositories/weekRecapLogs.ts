import db from '../db';

export function wasRecapSent(userId: number, seasonYear: number, seasonType: number, week: number): boolean {
  const row = db.prepare(`
    SELECT id FROM week_recap_logs
    WHERE user_id = ? AND season_year = ? AND season_type = ? AND week = ?
  `).get(userId, seasonYear, seasonType, week);
  return row !== undefined;
}

export function logRecapSent(userId: number, seasonYear: number, seasonType: number, week: number): void {
  db.prepare(`
    INSERT OR IGNORE INTO week_recap_logs (user_id, season_year, season_type, week)
    VALUES (?, ?, ?, ?)
  `).run(userId, seasonYear, seasonType, week);
}
