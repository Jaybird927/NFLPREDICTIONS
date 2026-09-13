import db from '../db';

export interface GameRecap {
  headline: string;
  description: string;
  source: string;
}

interface GameRecapRow {
  headline: string | null;
  description: string | null;
  source: string | null;
}

export function getRecapByGameId(gameId: number): GameRecap | null {
  const stmt = db.prepare('SELECT headline, description, source FROM game_recaps WHERE game_id = ?');
  const row = stmt.get(gameId) as GameRecapRow | undefined;
  if (!row || !row.description) return null;
  return {
    headline: row.headline || '',
    description: row.description,
    source: row.source || 'ESPN',
  };
}

export function upsertRecap(gameId: number, recap: GameRecap): void {
  const stmt = db.prepare(`
    INSERT INTO game_recaps (game_id, headline, description, source, fetched_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(game_id) DO UPDATE SET
      headline = excluded.headline,
      description = excluded.description,
      source = excluded.source,
      fetched_at = CURRENT_TIMESTAMP
  `);
  stmt.run(gameId, recap.headline, recap.description, recap.source);
}
