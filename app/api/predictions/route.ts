import { NextResponse } from 'next/server';
import { bulkUpsertPredictions, BulkPredictionInput } from '@/lib/repositories/predictions';
import { getGameById } from '@/lib/repositories/games';
import { validateUserToken, validateAdminToken } from '@/lib/utils/tokens';
import { getActiveDesignation, getUsedPasses, usePass } from '@/lib/repositories/passes';
import { getUserByToken } from '@/lib/repositories/users';

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - no token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const userAuth = validateUserToken(token);
    const isAdmin = validateAdminToken(token);

    if (!userAuth && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - invalid token' }, { status: 401 });
    }

    const { predictions } = await request.json();
    if (!Array.isArray(predictions)) {
      return NextResponse.json({ error: 'Predictions must be an array' }, { status: 400 });
    }

    if (!isAdmin && userAuth) {
      const invalidPrediction = predictions.find((p: any) => p.userId !== userAuth.userId);
      if (invalidPrediction) {
        return NextResponse.json({ error: 'Forbidden - cannot modify other users predictions' }, { status: 403 });
      }

      const user = getUserByToken(token);
      if (user) {
        for (const pred of predictions) {
          if (pred.predictedWinnerTeamId === null) continue;
          const game = getGameById(pred.gameId);
          if (!game) continue;
          const now = Date.now();
          if (now <= game.gameDate.getTime()) continue;

          const msSinceStart = now - game.gameDate.getTime();
          const designation = getActiveDesignation(user.id, game.seasonYear);
          const usedPasses = getUsedPasses(user.id, game.seasonYear);

          const validDesignated = designation && designation.designatedGameId === game.id && msSinceStart <= THIRTY_MINUTES_MS;
          const validUsed = usedPasses.some(p => p.usedGameId === game.id) && msSinceStart <= THIRTY_MINUTES_MS;

          if (!validDesignated && !validUsed) {
            return NextResponse.json(
              { error: 'This game has already started. Designate a 30-minute pass before kickoff.' },
              { status: 403 }
            );
          }

          if (validDesignated) usePass(designation!.id, game.id);
        }
      }
    }

    bulkUpsertPredictions(predictions as BulkPredictionInput[]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save predictions:', error);
    return NextResponse.json({ error: 'Failed to save predictions' }, { status: 500 });
  }
}
