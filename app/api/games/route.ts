import { NextResponse } from 'next/server';
import { getGamesByWeek } from '@/lib/repositories/games';
import { getPredictionsByWeek } from '@/lib/repositories/predictions';
import { getUnusedPasses, getActiveDesignation, getUsedPasses, getUserPassSummary } from '@/lib/repositories/passes';
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
    let passInfo: {
      fifteenMinUnused: number;
      designatedGameId: number | null;
      activeGameId: number | null;
      usedFifteenGameIds: number[];
      correctionUnused: number;
      correctionUsedGameIds: number[];
    } = {
      fifteenMinUnused: 0, designatedGameId: null, activeGameId: null,
      usedFifteenGameIds: [], correctionUnused: 0, correctionUsedGameIds: [],
    };

    if (authHeader?.startsWith('Bearer ')) {
      const user = getUserByToken(authHeader.substring(7));
      if (user) {
        const summary = getUserPassSummary(user.id, seasonYear);
        const usedFifteen = getUsedPasses(user.id, seasonYear, 'fifteen_minute');
        // activeGameId: designated (pre-kickoff) or used-within-15min (post-kickoff)
        const activeUsed = usedFifteen.find(p => {
          const g = games.find(g => g.id === p.usedGameId);
          return g && Date.now() - g.gameDate.getTime() <= 15 * 60 * 1000;
        });
        passInfo = {
          fifteenMinUnused: summary.fifteenMinUnused,
          designatedGameId: summary.fifteenMinDesignated,
          activeGameId: summary.fifteenMinDesignated ?? activeUsed?.usedGameId ?? null,
          usedFifteenGameIds: usedFifteen.map(p => p.usedGameId!),
          correctionUnused: summary.correctionUnused,
          correctionUsedGameIds: summary.correctionUsedGameIds,
        };
      }
    }

    return NextResponse.json({ games, predictions: predictionsArray, passInfo });
  } catch (error) {
    console.error('Failed to get games:', error);
    return NextResponse.json({ error: 'Failed to get games' }, { status: 500 });
  }
}
