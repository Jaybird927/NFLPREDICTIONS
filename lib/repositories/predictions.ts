import db from '../db';
import { Prediction, PredictionRow } from '@/types';
import { parseDbDate } from '../utils/date';
import { getGameById } from './games';

function rowToPrediction(row: PredictionRow): Prediction {
  return {
    id: row.id,
    userId: row.user_id,
    gameId: row.game_id,
    predictedWinnerTeamId: row.predicted_winner_team_id,
    isCorrect: row.is_correct === null ? null : row.is_correct === 1,
    createdAt: parseDbDate(row.created_at),
    updatedAt: parseDbDate(row.updated_at),
  };
}

export function getPredictionsByWeek(
  seasonYear: number,
  seasonType: number,
  week: number
): Map<string, Prediction> {
  const stmt = db.prepare(`
    SELECT p.*
    FROM predictions p
    JOIN games g ON p.game_id = g.id
    WHERE g.season_year = ? AND g.season_type = ? AND g.week = ?
  `);

  const rows = stmt.all(seasonYear, seasonType, week) as PredictionRow[];
  const predictions = new Map<string, Prediction>();

  rows.forEach((row) => {
    const prediction = rowToPrediction(row);
    const key = `${prediction.userId}-${prediction.gameId}`;
    predictions.set(key, prediction);
  });

  return predictions;
}

export function getPrediction(userId: number, gameId: number): Prediction | null {
  const stmt = db.prepare(`
    SELECT * FROM predictions
    WHERE user_id = ? AND game_id = ?
  `);

  const row = stmt.get(userId, gameId) as PredictionRow | undefined;
  return row ? rowToPrediction(row) : null;
}

export function upsertPrediction(
  userId: number,
  gameId: number,
  predictedWinnerTeamId: string
): Prediction {
  // Check if game is locked
  const game = getGameById(gameId);
  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }

  if (new Date() >= game.gameDate) {
    throw new Error('Cannot predict - game has already started');
  }

  const existing = getPrediction(userId, gameId);

  if (existing) {
    // Update
    const stmt = db.prepare(`
      UPDATE predictions
      SET predicted_winner_team_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND game_id = ?
    `);
    stmt.run(predictedWinnerTeamId, userId, gameId);
  } else {
    // Insert
    const stmt = db.prepare(`
      INSERT INTO predictions (user_id, game_id, predicted_winner_team_id)
      VALUES (?, ?, ?)
    `);
    stmt.run(userId, gameId, predictedWinnerTeamId);
  }

  return getPrediction(userId, gameId)!;
}

export function deletePrediction(userId: number, gameId: number): void {
  // Check if game is locked
  const game = getGameById(gameId);
  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }

  if (new Date() >= game.gameDate) {
    throw new Error('Cannot delete prediction - game has already started');
  }

  const stmt = db.prepare(`
    DELETE FROM predictions
    WHERE user_id = ? AND game_id = ?
  `);
  stmt.run(userId, gameId);
}

export interface BulkPredictionInput {
  userId: number;
  gameId: number;
  predictedWinnerTeamId: string | null; // null means delete the prediction
}

export function bulkUpsertPredictions(predictions: BulkPredictionInput[]): void {
  const transaction = db.transaction(() => {
    for (const pred of predictions) {
      if (pred.predictedWinnerTeamId === null) {
        // Delete prediction
        try {
          deletePrediction(pred.userId, pred.gameId);
        } catch (error) {
          // Ignore errors for deletes (game might be locked)
          console.warn(`Could not delete prediction for user ${pred.userId}, game ${pred.gameId}`);
        }
      } else {
        // Upsert prediction
        try {
          upsertPrediction(pred.userId, pred.gameId, pred.predictedWinnerTeamId);
        } catch (error) {
          // Ignore errors for locked games
          console.warn(`Could not save prediction for user ${pred.userId}, game ${pred.gameId}`);
        }
      }
    }
  });

  transaction();
}

export function getUserPredictionStats(userId: number, seasonYear: number, seasonType: number) {
  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct,
      SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect,
      SUM(CASE WHEN is_correct IS NULL THEN 1 ELSE 0 END) as pending
    FROM predictions p
    JOIN games g ON p.game_id = g.id
    WHERE p.user_id = ? AND g.season_year = ? AND g.season_type = ?
  `);

  return stmt.get(userId, seasonYear, seasonType) as {
    total: number;
    correct: number;
    incorrect: number;
    pending: number;
  };
}
