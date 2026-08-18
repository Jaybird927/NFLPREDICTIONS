import db from '../db';

export type PassType = 'correction' | 'fifteen_minute';

export interface SpecialPass {
  id: number;
  userId: number;
  seasonYear: number;
  passType: PassType;
  designatedGameId: number | null;
  usedGameId: number | null;
  awardedWeek: number | null;
}

interface PassRow {
  id: number;
  user_id: number;
  season_year: number;
  pass_type: PassType;
  designated_game_id: number | null;
  used_game_id: number | null;
  awarded_week: number | null;
}

function rowToPass(row: PassRow): SpecialPass {
  return {
    id: row.id,
    userId: row.user_id,
    seasonYear: row.season_year,
    passType: row.pass_type,
    designatedGameId: row.designated_game_id,
    usedGameId: row.used_game_id,
    awardedWeek: row.awarded_week,
  };
}

export function grantPass(userId: number, seasonYear: number, passType: PassType, awardedWeek: number | null = null): void {
  db.prepare(`
    INSERT INTO special_passes (user_id, season_year, pass_type, awarded_week)
    VALUES (?, ?, ?, ?)
  `).run(userId, seasonYear, passType, awardedWeek);
}

export function getUnusedPasses(userId: number, seasonYear: number, passType?: PassType): SpecialPass[] {
  const rows = passType
    ? db.prepare(`SELECT * FROM special_passes WHERE user_id = ? AND season_year = ? AND pass_type = ? AND used_game_id IS NULL ORDER BY awarded_at ASC`).all(userId, seasonYear, passType) as PassRow[]
    : db.prepare(`SELECT * FROM special_passes WHERE user_id = ? AND season_year = ? AND used_game_id IS NULL ORDER BY awarded_at ASC`).all(userId, seasonYear) as PassRow[];
  return rows.map(rowToPass);
}

export function getUsedPasses(userId: number, seasonYear: number, passType?: PassType): SpecialPass[] {
  const rows = passType
    ? db.prepare(`SELECT * FROM special_passes WHERE user_id = ? AND season_year = ? AND pass_type = ? AND used_game_id IS NOT NULL ORDER BY awarded_at ASC`).all(userId, seasonYear, passType) as PassRow[]
    : db.prepare(`SELECT * FROM special_passes WHERE user_id = ? AND season_year = ? AND used_game_id IS NOT NULL ORDER BY awarded_at ASC`).all(userId, seasonYear) as PassRow[];
  return rows.map(rowToPass);
}

export function getActiveDesignation(userId: number, seasonYear: number): SpecialPass | null {
  const row = db.prepare(`
    SELECT * FROM special_passes
    WHERE user_id = ? AND season_year = ? AND pass_type = 'fifteen_minute'
      AND designated_game_id IS NOT NULL AND used_game_id IS NULL
    LIMIT 1
  `).get(userId, seasonYear) as PassRow | undefined;
  return row ? rowToPass(row) : null;
}

export function designatePass(passId: number, gameId: number): void {
  db.prepare(`UPDATE special_passes SET designated_game_id = ? WHERE id = ?`).run(gameId, passId);
}

export function undesignatePass(passId: number): void {
  db.prepare(`UPDATE special_passes SET designated_game_id = NULL WHERE id = ?`).run(passId);
}

export function usePass(passId: number, gameId: number): void {
  db.prepare(`UPDATE special_passes SET used_game_id = ?, designated_game_id = ? WHERE id = ?`).run(gameId, gameId, passId);
}

export function passAlreadyAwardedForWeek(seasonYear: number, week: number): boolean {
  const row = db.prepare(`SELECT id FROM special_passes WHERE season_year = ? AND awarded_week = ?`).get(seasonYear, week);
  return row !== undefined;
}

export function getWeeklyWinners(seasonYear: number, seasonType: number, week: number): number[] {
  const rows = db.prepare(`
    SELECT p.user_id, SUM(CASE WHEN p.is_correct = 1 THEN 1 ELSE 0 END) as wins
    FROM predictions p
    JOIN games g ON p.game_id = g.id
    WHERE g.season_year = ? AND g.season_type = ? AND g.week = ?
    GROUP BY p.user_id
    HAVING wins = (
      SELECT MAX(w) FROM (
        SELECT SUM(CASE WHEN p2.is_correct = 1 THEN 1 ELSE 0 END) as w
        FROM predictions p2
        JOIN games g2 ON p2.game_id = g2.id
        WHERE g2.season_year = ? AND g2.season_type = ? AND g2.week = ?
        GROUP BY p2.user_id
      )
    ) AND wins > 0
  `).all(seasonYear, seasonType, week, seasonYear, seasonType, week) as { user_id: number }[];
  return rows.map(r => r.user_id);
}

export function getUserPassSummary(userId: number, seasonYear: number) {
  const unusedFifteen = getUnusedPasses(userId, seasonYear, 'fifteen_minute');
  const usedFifteen = getUsedPasses(userId, seasonYear, 'fifteen_minute');
  const unusedCorrection = getUnusedPasses(userId, seasonYear, 'correction');
  const usedCorrection = getUsedPasses(userId, seasonYear, 'correction');
  const designation = getActiveDesignation(userId, seasonYear);
  return {
    fifteenMinUnused: unusedFifteen.length,
    fifteenMinUsed: usedFifteen.length,
    fifteenMinDesignated: designation?.designatedGameId ?? null,
    correctionUnused: unusedCorrection.length,
    correctionUsedGameIds: usedCorrection.map(p => p.usedGameId!),
  };
}
