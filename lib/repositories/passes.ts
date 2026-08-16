import db from '../db';

export interface SpecialPass {
  id: number;
  userId: number;
  passType: 'thirty_minute' | 'late';
  seasonYear: number;
  seasonType: number;
  designatedGameId: number | null;
  usedGameId: number | null;
  appliedWeek: number | null;
}

interface PassRow {
  id: number;
  user_id: number;
  pass_type: 'thirty_minute' | 'late';
  season_year: number;
  season_type: number;
  designated_game_id: number | null;
  used_game_id: number | null;
  applied_week: number | null;
}

function rowToPass(row: PassRow): SpecialPass {
  return {
    id: row.id,
    userId: row.user_id,
    passType: row.pass_type,
    seasonYear: row.season_year,
    seasonType: row.season_type,
    designatedGameId: row.designated_game_id,
    usedGameId: row.used_game_id,
    appliedWeek: row.applied_week,
  };
}

export function grantPass(
  userId: number,
  passType: 'thirty_minute' | 'late',
  seasonYear: number,
  seasonType: number
): void {
  db.prepare(`
    INSERT INTO special_passes (user_id, pass_type, season_year, season_type)
    VALUES (?, ?, ?, ?)
  `).run(userId, passType, seasonYear, seasonType);
}

export function getUnusedThirtyMinutePass(
  userId: number,
  seasonYear: number
): SpecialPass | null {
  const row = db.prepare(`
    SELECT * FROM special_passes
    WHERE user_id = ? AND pass_type = 'thirty_minute' AND season_year = ? AND used_game_id IS NULL
    LIMIT 1
  `).get(userId, seasonYear) as PassRow | undefined;
  return row ? rowToPass(row) : null;
}

export function getUsedThirtyMinutePass(
  userId: number,
  seasonYear: number
): SpecialPass | null {
  const row = db.prepare(`
    SELECT * FROM special_passes
    WHERE user_id = ? AND pass_type = 'thirty_minute' AND season_year = ? AND used_game_id IS NOT NULL
    LIMIT 1
  `).get(userId, seasonYear) as PassRow | undefined;
  return row ? rowToPass(row) : null;
}

export function designateThirtyMinutePass(passId: number, gameId: number): void {
  db.prepare(`
    UPDATE special_passes SET designated_game_id = ? WHERE id = ?
  `).run(gameId, passId);
}

export function undesignateThirtyMinutePass(passId: number): void {
  db.prepare(`
    UPDATE special_passes SET designated_game_id = NULL WHERE id = ?
  `).run(passId);
}

export function useThirtyMinutePass(passId: number, gameId: number): void {
  db.prepare(`
    UPDATE special_passes SET used_game_id = ?, designated_game_id = ? WHERE id = ?
  `).run(gameId, gameId, passId);
}

export function getUnusedLatePass(
  userId: number,
  seasonYear: number
): SpecialPass | null {
  const row = db.prepare(`
    SELECT * FROM special_passes
    WHERE user_id = ? AND pass_type = 'late' AND season_year = ? AND applied_week IS NULL
    LIMIT 1
  `).get(userId, seasonYear) as PassRow | undefined;
  return row ? rowToPass(row) : null;
}

export function useLatePass(passId: number, week: number): void {
  db.prepare(`
    UPDATE special_passes SET applied_week = ? WHERE id = ?
  `).run(week, passId);
}

export function getWeeklyWinners(
  seasonYear: number,
  seasonType: number,
  week: number
): number[] {
  const rows = db.prepare(`
    SELECT
      p.user_id,
      SUM(CASE WHEN p.is_correct = 1 THEN 1 ELSE 0 END) as wins
    FROM predictions p
    JOIN games g ON p.game_id = g.id
    WHERE g.season_year = ? AND g.season_type = ? AND g.week = ?
      AND p.is_late_pass = 0
    GROUP BY p.user_id
    HAVING wins = (
      SELECT MAX(sub_wins) FROM (
        SELECT SUM(CASE WHEN p2.is_correct = 1 THEN 1 ELSE 0 END) as sub_wins
        FROM predictions p2
        JOIN games g2 ON p2.game_id = g2.id
        WHERE g2.season_year = ? AND g2.season_type = ? AND g2.week = ?
          AND p2.is_late_pass = 0
        GROUP BY p2.user_id
      )
    )
    AND wins > 0
  `).all(seasonYear, seasonType, week, seasonYear, seasonType, week) as { user_id: number; wins: number }[];
  return rows.map(r => r.user_id);
}

export function hasLatePassBeenAwardedForWeek(
  seasonYear: number,
  seasonType: number,
  week: number
): boolean {
  // Check notification_logs for a sentinel we'll store, or just check passes awarded that week
  // We use a simple approach: check if any late pass was awarded after this week's games were final
  // Instead, track via a separate mechanism — for simplicity, check if passes exist for winners
  // This is handled at the call site by checking if all games are final before awarding
  return false; // Handled externally
}

export function latePassAlreadyAwardedThisWeek(
  seasonYear: number,
  seasonType: number,
  week: number
): boolean {
  const row = db.prepare(`
    SELECT id FROM special_passes
    WHERE pass_type = 'late' AND season_year = ? AND season_type = ?
      AND awarded_at >= (
        SELECT MIN(updated_at) FROM games
        WHERE season_year = ? AND season_type = ? AND week = ? AND game_status = 'final'
      )
      AND awarded_at <= datetime('now')
  `).get(seasonYear, seasonType, seasonYear, seasonType, week);
  return row !== undefined;
}

export function getUserPasses(userId: number, seasonYear: number): SpecialPass[] {
  const rows = db.prepare(`
    SELECT * FROM special_passes WHERE user_id = ? AND season_year = ?
  `).all(userId, seasonYear) as PassRow[];
  return rows.map(rowToPass);
}
