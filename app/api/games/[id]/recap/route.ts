import { NextResponse } from 'next/server';
import { getGameById } from '@/lib/repositories/games';
import { getRecapByGameId, upsertRecap } from '@/lib/repositories/recaps';
import { espnClient } from '@/lib/espn/client';
import { GAME_STATUS } from '@/lib/constants';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const gameId = parseInt(id);
    const game = getGameById(gameId);

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.gameStatus !== GAME_STATUS.FINAL) {
      return NextResponse.json({ error: 'Recap not available until the game is final' }, { status: 400 });
    }

    const cached = getRecapByGameId(gameId);
    if (cached) {
      return NextResponse.json({ recap: cached });
    }

    const recap = await espnClient.getRecap(game.espnEventId);
    if (!recap) {
      return NextResponse.json({ recap: null });
    }

    upsertRecap(gameId, recap);
    return NextResponse.json({ recap });
  } catch (error) {
    console.error('Failed to get game recap:', error);
    return NextResponse.json({ error: 'Failed to get game recap' }, { status: 500 });
  }
}
