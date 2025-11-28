import db from '../db';
import { Game, GameRow, Team } from '@/types';
import { parseDbDate } from '../utils/date';
import { GameData } from '../espn/transformers';

function rowToGame(row: GameRow): Game {
  const homeTeam: Team = {
    id: row.home_team_id,
    name: row.home_team_name,
    abbreviation: row.home_team_abbreviation,
    logo: row.home_team_logo || undefined,
  };

  const awayTeam: Team = {
    id: row.away_team_id,
    name: row.away_team_name,
    abbreviation: row.away_team_abbreviation,
    logo: row.away_team_logo || undefined,
  };

  return {
    id: row.id,
    espnEventId: row.espn_event_id,
    seasonYear: row.season_year,
    seasonType: row.season_type,
    week: row.week,
    homeTeam,
    awayTeam,
    gameDate: parseDbDate(row.game_date),
    gameStatus: row.game_status as 'scheduled' | 'in_progress' | 'final',
    homeScore: row.home_score,
    awayScore: row.away_score,
    winnerTeamId: row.winner_team_id || undefined,
    createdAt: parseDbDate(row.created_at),
    updatedAt: parseDbDate(row.updated_at),
  };
}

export function getGameById(gameId: number): Game | null {
  const stmt = db.prepare('SELECT * FROM games WHERE id = ?');
  const row = stmt.get(gameId) as GameRow | undefined;
  return row ? rowToGame(row) : null;
}

export function getGameByEspnId(espnEventId: string): Game | null {
  const stmt = db.prepare('SELECT * FROM games WHERE espn_event_id = ?');
  const row = stmt.get(espnEventId) as GameRow | undefined;
  return row ? rowToGame(row) : null;
}

export function getGamesByWeek(seasonYear: number, seasonType: number, week: number): Game[] {
  const stmt = db.prepare(`
    SELECT * FROM games
    WHERE season_year = ? AND season_type = ? AND week = ?
    ORDER BY game_date ASC
  `);
  const rows = stmt.all(seasonYear, seasonType, week) as GameRow[];
  return rows.map(rowToGame);
}

export function getAllGames(): Game[] {
  const stmt = db.prepare('SELECT * FROM games ORDER BY game_date ASC');
  const rows = stmt.all() as GameRow[];
  return rows.map(rowToGame);
}

export function upsertGame(gameData: GameData): number {
  const existing = getGameByEspnId(gameData.espnEventId);

  if (existing) {
    // Update existing game
    const stmt = db.prepare(`
      UPDATE games SET
        season_year = ?,
        season_type = ?,
        week = ?,
        home_team_id = ?,
        home_team_name = ?,
        home_team_abbreviation = ?,
        home_team_logo = ?,
        away_team_id = ?,
        away_team_name = ?,
        away_team_abbreviation = ?,
        away_team_logo = ?,
        game_date = ?,
        game_status = ?,
        home_score = ?,
        away_score = ?,
        winner_team_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE espn_event_id = ?
    `);

    stmt.run(
      gameData.seasonYear,
      gameData.seasonType,
      gameData.week,
      gameData.homeTeamId,
      gameData.homeTeamName,
      gameData.homeTeamAbbreviation,
      gameData.homeTeamLogo,
      gameData.awayTeamId,
      gameData.awayTeamName,
      gameData.awayTeamAbbreviation,
      gameData.awayTeamLogo,
      gameData.gameDate,
      gameData.gameStatus,
      gameData.homeScore,
      gameData.awayScore,
      gameData.winnerTeamId,
      gameData.espnEventId
    );

    return existing.id;
  } else {
    // Insert new game
    const stmt = db.prepare(`
      INSERT INTO games (
        espn_event_id, season_year, season_type, week,
        home_team_id, home_team_name, home_team_abbreviation, home_team_logo,
        away_team_id, away_team_name, away_team_abbreviation, away_team_logo,
        game_date, game_status, home_score, away_score, winner_team_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      gameData.espnEventId,
      gameData.seasonYear,
      gameData.seasonType,
      gameData.week,
      gameData.homeTeamId,
      gameData.homeTeamName,
      gameData.homeTeamAbbreviation,
      gameData.homeTeamLogo,
      gameData.awayTeamId,
      gameData.awayTeamName,
      gameData.awayTeamAbbreviation,
      gameData.awayTeamLogo,
      gameData.gameDate,
      gameData.gameStatus,
      gameData.homeScore,
      gameData.awayScore,
      gameData.winnerTeamId
    );

    return result.lastInsertRowid as number;
  }
}

export function getGamesByStatus(status: string): Game[] {
  const stmt = db.prepare('SELECT * FROM games WHERE game_status = ? ORDER BY game_date ASC');
  const rows = stmt.all(status) as GameRow[];
  return rows.map(rowToGame);
}
