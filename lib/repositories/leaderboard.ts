import db from '../db';

export interface CumulativeStanding {
  userId: number;
  rank: number;
  correctPredictions: number;
  winPercentage: number;
}

interface CumulativeStandingRow {
  user_id: number;
  rank: number;
  correct_predictions: number;
  win_percentage: number;
}

// Standings as of the end of a given (seasonType, week), spanning every earlier
// season type/week chronologically (e.g. through playoff week 2 includes all of
// the regular season plus wild card and divisional games).
export function getCumulativeStandings(
  seasonYear: number,
  throughSeasonType: number,
  throughWeek: number
): CumulativeStanding[] {
  const rows = db.prepare(`
    SELECT
      u.id as user_id,
      SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct = 1 THEN 1 ELSE 0 END) as correct_predictions,
      CASE
        WHEN SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct IS NOT NULL THEN 1 ELSE 0 END) > 0
        THEN CAST(SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct = 1 THEN 1 ELSE 0 END) AS REAL) /
             CAST(SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct IS NOT NULL THEN 1 ELSE 0 END) AS REAL) * 100
        ELSE 0
      END as win_percentage,
      RANK() OVER (
        ORDER BY
          SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct = 1 THEN 1 ELSE 0 END) DESC,
          CASE
            WHEN SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct IS NOT NULL THEN 1 ELSE 0 END) > 0
            THEN CAST(SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct = 1 THEN 1 ELSE 0 END) AS REAL) /
                 CAST(SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct IS NOT NULL THEN 1 ELSE 0 END) AS REAL) * 100
            ELSE 0
          END DESC
      ) as rank
    FROM users u
    LEFT JOIN (
      SELECT p.* FROM predictions p
      JOIN games g ON p.game_id = g.id
      WHERE g.season_year = ? AND (g.season_type < ? OR (g.season_type = ? AND g.week <= ?))
    ) p ON u.id = p.user_id
    GROUP BY u.id
  `).all(seasonYear, throughSeasonType, throughSeasonType, throughWeek) as CumulativeStandingRow[];

  return rows.map((r) => ({
    userId: r.user_id,
    rank: r.rank,
    correctPredictions: r.correct_predictions,
    winPercentage: r.win_percentage,
  }));
}

// Standings for a single week only (not cumulative) — how everyone did in just
// that week's picks.
export function getWeekOnlyStandings(
  seasonYear: number,
  seasonType: number,
  week: number
): CumulativeStanding[] {
  const rows = db.prepare(`
    SELECT
      u.id as user_id,
      SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct = 1 THEN 1 ELSE 0 END) as correct_predictions,
      CASE
        WHEN SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct IS NOT NULL THEN 1 ELSE 0 END) > 0
        THEN CAST(SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct = 1 THEN 1 ELSE 0 END) AS REAL) /
             CAST(SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct IS NOT NULL THEN 1 ELSE 0 END) AS REAL) * 100
        ELSE 0
      END as win_percentage,
      RANK() OVER (
        ORDER BY
          SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct = 1 THEN 1 ELSE 0 END) DESC,
          CASE
            WHEN SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct IS NOT NULL THEN 1 ELSE 0 END) > 0
            THEN CAST(SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct = 1 THEN 1 ELSE 0 END) AS REAL) /
                 CAST(SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct IS NOT NULL THEN 1 ELSE 0 END) AS REAL) * 100
            ELSE 0
          END DESC
      ) as rank
    FROM users u
    LEFT JOIN (
      SELECT p.* FROM predictions p
      JOIN games g ON p.game_id = g.id
      WHERE g.season_year = ? AND g.season_type = ? AND g.week = ?
    ) p ON u.id = p.user_id
    GROUP BY u.id
  `).all(seasonYear, seasonType, week) as CumulativeStandingRow[];

  return rows.map((r) => ({
    userId: r.user_id,
    rank: r.rank,
    correctPredictions: r.correct_predictions,
    winPercentage: r.win_percentage,
  }));
}

// Chronological list of (seasonType, week) pairs that have games, used to find
// "the week before this one" even across the regular season / playoffs boundary.
export function getWeekSequence(seasonYear: number): Array<{ seasonType: number; week: number }> {
  const rows = db.prepare(`
    SELECT DISTINCT season_type, week FROM games
    WHERE season_year = ? AND season_type >= 2
    ORDER BY season_type ASC, week ASC
  `).all(seasonYear) as Array<{ season_type: number; week: number }>;
  return rows.map((r) => ({ seasonType: r.season_type, week: r.week }));
}

export async function recalculateLeaderboard(seasonYear: number, seasonType: number): Promise<void> {
  console.log(`Recalculating leaderboard for season ${seasonYear}, type ${seasonType}`);

  // Delete existing stats for this season
  const deleteStmt = db.prepare(`
    DELETE FROM leaderboard_stats
    WHERE season_year = ? AND season_type = ?
  `);
  deleteStmt.run(seasonYear, seasonType);

  // Calculate and insert new stats
  const insertStmt = db.prepare(`
    INSERT INTO leaderboard_stats (
      user_id, season_year, season_type,
      total_predictions, correct_predictions, incorrect_predictions, pending_predictions,
      win_percentage
    )
    SELECT
      u.id as user_id,
      ? as season_year,
      ? as season_type,
      COUNT(p.id) as total_predictions,
      SUM(CASE WHEN p.is_correct = 1 THEN 1 ELSE 0 END) as correct_predictions,
      SUM(CASE WHEN p.is_correct = 0 THEN 1 ELSE 0 END) as incorrect_predictions,
      SUM(CASE WHEN p.is_correct IS NULL THEN 1 ELSE 0 END) as pending_predictions,
      CASE
        WHEN SUM(CASE WHEN p.is_correct IS NOT NULL THEN 1 ELSE 0 END) > 0
        THEN (CAST(SUM(CASE WHEN p.is_correct = 1 THEN 1 ELSE 0 END) AS REAL) /
              CAST(SUM(CASE WHEN p.is_correct IS NOT NULL THEN 1 ELSE 0 END) AS REAL)) * 100
        ELSE 0
      END as win_percentage
    FROM users u
    LEFT JOIN predictions p ON u.id = p.user_id
    LEFT JOIN games g ON p.game_id = g.id
    WHERE g.season_year = ? AND g.season_type = ?
    GROUP BY u.id
    HAVING total_predictions > 0
  `);

  insertStmt.run(seasonYear, seasonType, seasonYear, seasonType);

  console.log('Leaderboard recalculated successfully');
}
