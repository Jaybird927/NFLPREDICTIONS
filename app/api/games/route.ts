import { NextResponse } from 'next/server';
import { getGamesByWeek } from '@/lib/repositories/games';
import { getPredictionsByWeek } from '@/lib/repositories/predictions';
import { getUnusedPasses, getActiveDesignation, getUsedPasses } from '@/lib/repositories/passes';
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
    let thirtyMinPass: {
      unusedCount: number;
      designatedGameId: number | null;
      activeGameId: number | null;
      usedGameIds: number[];
    } = { unusedCount: 0, designatedGameId: null, activeGameId: null, usedGameIds: [] };

    if (authHeader?.startsWith('Bearer ')) {
      const user = getUserByToken(authHeader.substring(7));
      if (user) {
        const unused = getUnusedPasses(user.id, seasonYear);
        const designation = getActiveDesignation(user.id, seasonYear);
        const used = getUsedPasses(user.id, seasonYear);
        thirtyMinPass = {
          unusedCount: unused.length,
          designatedGameId: designation?.designatedGameId ?? null,
          activeGameId: designation?.designatedGameId ?? (used.find(p => {
            const g = games.find(g => g.id === p.usedGameId);
            return g && Date.now() - g.gameDate.getTime() <= 30 * 60 * 1000;
          })?.usedGameId ?? null),
          usedGameIds: used.map(p => p.usedGameId!),
        };
      }
    }

    return NextResponse.json({ games, predictions: predictionsArray, thirtyMinPass });
  } catch (error) {
    console.error('Failed to get games:', error);
    return NextResponse.json({ error: 'Failed to get games' }, { status: 500 });
  }
}
