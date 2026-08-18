import { NextResponse } from 'next/server';
import { getGamesByWeek } from '@/lib/repositories/games';
import { getPredictionsByWeek } from '@/lib/repositories/predictions';
import { getPassForWeek, grantWeeklyPass, isEligibleForPass } from '@/lib/repositories/passes';
import { getUserByToken } from '@/lib/repositories/users';
import { CURRENT_SEASON, CURRENT_SEASON_TYPE } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const week = parseInt(searchParams.get('week') || '1');
    const seasonYear = parseInt(searchParams.get('seasonYear') || String(CURRENT_SEASON));
    const seasonType = parseInt(searchParams.get('seasonType') || String(CURRENT_SEASON_TYPE));

    const games = getGamesByWeek(seasonYear, seasonType, week);
    const predictions = getPredictionsByWeek(seasonYear, seasonType, week);
    const predictionsArray = Array.from(predictions.values());

    const authHeader = request.headers.get('authorization');
    let thirtyMinPass: { hasPass: boolean; designatedGameId: number | null; usedGameId: number | null; activeGameId: number | null } = {
      hasPass: false, designatedGameId: null, usedGameId: null, activeGameId: null,
    };

    if (authHeader?.startsWith('Bearer ')) {
      const user = getUserByToken(authHeader.substring(7));
      if (user && isEligibleForPass(user.name)) {
        // Auto-grant pass for this week if not yet granted
        grantWeeklyPass(user.id, seasonYear, seasonType, week);
        const pass = getPassForWeek(user.id, seasonYear, seasonType, week);
        if (pass) {
          thirtyMinPass = {
            hasPass: pass.usedGameId === null,
            designatedGameId: pass.usedGameId === null ? pass.designatedGameId : null,
            usedGameId: pass.usedGameId,
            activeGameId: pass.usedGameId === null
              ? pass.designatedGameId
              : pass.usedGameId,
          };
        }
      }
    }

    return NextResponse.json({ games, predictions: predictionsArray, thirtyMinPass });
  } catch (error) {
    console.error('Failed to get games:', error);
    return NextResponse.json({ error: 'Failed to get games' }, { status: 500 });
  }
}
