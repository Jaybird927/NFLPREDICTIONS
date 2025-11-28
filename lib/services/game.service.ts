import { espnClient } from '../espn/client';
import { transformESPNEventToGame } from '../espn/transformers';
import { upsertGame, getGameById, getGameByEspnId } from '../repositories/games';
import { updatePredictionsForGame } from './scoring.service';
import { GAME_STATUS } from '../constants';

export interface SyncResult {
  gamesProcessed: number;
  gamesUpdated: number;
  gamesCreated: number;
  errors: string[];
}

export async function syncGamesFromESPN(
  seasonType: number,
  week: number,
  seasonYear?: number
): Promise<SyncResult> {
  const result: SyncResult = {
    gamesProcessed: 0,
    gamesUpdated: 0,
    gamesCreated: 0,
    errors: [],
  };

  try {
    console.log(`Syncing games for season type ${seasonType}, week ${week}...`);

    const scoreboard = await espnClient.getScoreboard(seasonType, week);

    if (!scoreboard.events || scoreboard.events.length === 0) {
      console.log('No games found for this week');
      return result;
    }

    // Use the season year from the API if not provided
    const year = seasonYear || scoreboard.leagues[0]?.season.year || new Date().getFullYear();

    for (const event of scoreboard.events) {
      try {
        result.gamesProcessed++;

        const gameData = transformESPNEventToGame(event, year, seasonType, week);

        // Get existing game BEFORE upsert to compare
        const oldGame = getGameByEspnId(gameData.espnEventId);

        const gameId = upsertGame(gameData);
        const isExisting = oldGame !== null;

        if (isExisting) {
          result.gamesUpdated++;

          // Update predictions if game is final with a winner
          // This handles:
          // 1. Game just became final
          // 2. Winner changed
          // 3. Game was already final but predictions weren't scored
          if (gameData.gameStatus === GAME_STATUS.FINAL && gameData.winnerTeamId) {
            console.log(`Game ${event.id} is final with winner ${gameData.winnerTeamId}, updating predictions...`);
            await updatePredictionsForGame(gameId);
          }
        } else {
          result.gamesCreated++;
        }
      } catch (error) {
        const errorMsg = `Failed to process game ${event.id}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    console.log(`Sync complete: ${result.gamesProcessed} processed, ${result.gamesCreated} created, ${result.gamesUpdated} updated`);

    return result;
  } catch (error) {
    const errorMsg = `Failed to sync games: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
    return result;
  }
}

export async function syncCurrentWeek(): Promise<SyncResult> {
  const currentWeek = await espnClient.getCurrentWeek();
  return syncGamesFromESPN(currentWeek.seasonType, currentWeek.week, currentWeek.year);
}

export async function syncEntireSeason(seasonYear: number, seasonType: number): Promise<SyncResult> {
  const totalResult: SyncResult = {
    gamesProcessed: 0,
    gamesUpdated: 0,
    gamesCreated: 0,
    errors: [],
  };

  // Regular season has 18 weeks
  const maxWeeks = seasonType === 2 ? 18 : 4;

  for (let week = 1; week <= maxWeeks; week++) {
    console.log(`Syncing week ${week}...`);
    const result = await syncGamesFromESPN(seasonType, week, seasonYear);

    totalResult.gamesProcessed += result.gamesProcessed;
    totalResult.gamesUpdated += result.gamesUpdated;
    totalResult.gamesCreated += result.gamesCreated;
    totalResult.errors.push(...result.errors);

    // If no games found, we've reached the end of the schedule
    if (result.gamesProcessed === 0) {
      console.log(`No games found for week ${week}, stopping sync`);
      break;
    }
  }

  return totalResult;
}
