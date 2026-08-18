import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/repositories/users';
import { getGameById } from '@/lib/repositories/games';
import { getUnusedPasses, getActiveDesignation, designatePass, undesignatePass } from '@/lib/repositories/passes';
import { syncCurrentWeek } from '@/lib/services/game.service';
import { CURRENT_SEASON } from '@/lib/constants';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = getUserByToken(authHeader.substring(7));
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { gameId } = await request.json();
  const game = getGameById(gameId);
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  if (new Date() >= game.gameDate) {
    return NextResponse.json({ error: 'Game has already started — designate before kickoff' }, { status: 400 });
  }

  const unused = getUnusedPasses(user.id, CURRENT_SEASON);
  if (unused.length === 0) return NextResponse.json({ error: 'No 30-minute passes available' }, { status: 400 });

  // Clear any existing designation first, then designate the first unused pass
  const existing = getActiveDesignation(user.id, CURRENT_SEASON);
  if (existing) undesignatePass(existing.id);

  const passToUse = existing ?? unused[0]!;
  designatePass(passToUse.id, gameId);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = getUserByToken(authHeader.substring(7));
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const designation = getActiveDesignation(user.id, CURRENT_SEASON);
  if (!designation || !designation.designatedGameId) {
    return NextResponse.json({ error: 'No designated pass found' }, { status: 400 });
  }

  // Sync scores first to confirm game hasn't started
  await syncCurrentWeek(true);

  const game = getGameById(designation.designatedGameId);
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  if (game.gameStatus !== 'scheduled' || new Date() >= game.gameDate) {
    return NextResponse.json({ error: 'Game has already started — pass cannot be removed' }, { status: 400 });
  }

  undesignatePass(designation.id);
  return NextResponse.json({ success: true });
}
