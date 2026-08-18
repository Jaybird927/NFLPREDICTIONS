import db from '../db';

export interface ThirtyMinPass {
  id: number;
  userId: number;
  seasonYear: number;
  seasonType: number;
  week: number;
  designatedGameId: number | null;
  usedGameId: number | null;
}

interface PassRow {
  id: number;
  user_id: number;
  season_year: number;
  season_type: number;
  week: number;
  designated_game_id: number | null;
  used_game_id: number | null;
}

// Users eligible for the weekly 30-minute pass
export const THIRTY_MIN_PASS_USERS = ['jack', 'grandpa'];

function rowToPass(row: PassRow): ThirtyMinPass {
  return {
    id: row.id,
    userId: row.user_id,
    seasonYear: row.season_year,
    seasonType: row.season_type,
    week: row.week,
    designatedGameId: row.designated_game_id,
    usedGameId: row.used_game_id,
  };
}

export function grantWeeklyPass(userId: number, seasonYear: number, seasonType: number, week: number): void {
  db.prepare(`
    INSERT OR IGNORE INTO special_passes (user_id, season_year, season_type, week)
    VALUES (?, ?, ?, ?)
  `).run(userId, seasonYear, seasonType, week);
}

export function getPassForWeek(
  userId: number,
  seasonYear: number,
  seasonType: number,
  week: number
): ThirtyMinPass | null {
  const row = db.prepare(`
    SELECT * FROM special_passes
    WHERE user_id = ? AND season_year = ? AND season_type = ? AND week = ?
  `).get(userId, seasonYear, seasonType, week) as PassRow | undefined;
  return row ? rowToPass(row) : null;
}

export function designateThirtyMinutePass(passId: number, gameId: number): void {
  db.prepare(`UPDATE special_passes SET designated_game_id = ? WHERE id = ?`).run(gameId, passId);
}

export function undesignateThirtyMinutePass(passId: number): void {
  db.prepare(`UPDATE special_passes SET designated_game_id = NULL WHERE id = ?`).run(passId);
}

export function useThirtyMinutePass(passId: number, gameId: number): void {
  db.prepare(`UPDATE special_passes SET used_game_id = ?, designated_game_id = ? WHERE id = ?`).run(gameId, gameId, passId);
}

export function isEligibleForPass(userName: string): boolean {
  return THIRTY_MIN_PASS_USERS.includes(userName.toLowerCase());
}
