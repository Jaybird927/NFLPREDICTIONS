import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/repositories/users';
import { getGameById } from '@/lib/repositories/games';
import {
  getUnusedThirtyMinutePass,
  designateThirtyMinutePass,
  undesignateThirtyMinutePass,
} from '@/lib/repositories/passes';
import { CURRENT_SEASON } from '@/lib/constants';

// POST: designate a game; DELETE: remove designation
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

  const pass = getUnusedThirtyMinutePass(user.id, CURRENT_SEASON);
  if (!pass) return NextResponse.json({ error: 'No 30-minute pass available' }, { status: 400 });

  designateThirtyMinutePass(pass.id, gameId);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = getUserByToken(authHeader.substring(7));
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pass = getUnusedThirtyMinutePass(user.id, CURRENT_SEASON);
  if (!pass) return NextResponse.json({ error: 'No pass found' }, { status: 400 });

  undesignateThirtyMinutePass(pass.id);
  return NextResponse.json({ success: true });
}
