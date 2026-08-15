import { NextResponse } from 'next/server';
import { bulkUpsertPredictions, BulkPredictionInput } from '@/lib/repositories/predictions';
import { getGameById } from '@/lib/repositories/games';
import { validateUserToken, validateAdminToken } from '@/lib/utils/tokens';
import { getUnusedThirtyMinutePass, useThirtyMinutePass } from '@/lib/repositories/passes';
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

      // Check if any pick is for a started game — allow if within 30-min pass window
      const user = getUserByToken(token);
      if (user) {
        for (const pred of predictions) {
          const game = getGameById(pred.gameId);
          if (!game) continue;
          const now = Date.now();
          const gameStarted = now > game.gameDate.getTime();
          if (!gameStarted) continue;

          const msSinceStart = now - game.gameDate.getTime();
          if (msSinceStart > THIRTY_MINUTES_MS) {
            return NextResponse.json(
              { error: `Game has already started and the 30-minute window has passed` },
              { status: 403 }
            );
          }

          // Within 30-min window — check and consume the pass
          const pass = getUnusedThirtyMinutePass(user.id, game.seasonYear);
          if (!pass) {
            return NextResponse.json(
              { error: 'Game has already started and you have no 30-minute pass available' },
              { status: 403 }
            );
          }

          useThirtyMinutePass(pass.id, game.id);
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
