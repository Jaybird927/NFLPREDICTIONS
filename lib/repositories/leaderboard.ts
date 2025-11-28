import db from '../db';

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
