import { NextResponse } from 'next/server';
import { getGamesByWeek } from '@/lib/repositories/games';
import { getPredictionsByWeek } from '@/lib/repositories/predictions';
import { getUnusedThirtyMinutePass, getUsedThirtyMinutePass } from '@/lib/repositories/passes';
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

    // Resolve pass info for the requesting user if auth token provided
    const authHeader = request.headers.get('authorization');
    let thirtyMinPassInfo: { hasPass: boolean; designatedGameId: number | null; usedGameId: number | null } = { hasPass: false, designatedGameId: null, usedGameId: null };

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = getUserByToken(token);
      if (user) {
        const unused = getUnusedThirtyMinutePass(user.id, seasonYear);
        const used = getUsedThirtyMinutePass(user.id, seasonYear);
        thirtyMinPassInfo = {
          hasPass: unused !== null,
          designatedGameId: unused?.designatedGameId ?? null,
          usedGameId: used?.usedGameId ?? null,
        };
      }
    }

    return NextResponse.json({
      games,
      predictions: predictionsArray,
      thirtyMinPass: thirtyMinPassInfo,
    });
  } catch (error) {
    console.error('Failed to get games:', error);
    return NextResponse.json(
      { error: 'Failed to get games' },
      { status: 500 }
    );
  }
}
