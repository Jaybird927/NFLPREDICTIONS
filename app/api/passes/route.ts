import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/repositories/users';
import { getUserPasses } from '@/lib/repositories/passes';
import { CURRENT_SEASON } from '@/lib/constants';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = getUserByToken(authHeader.substring(7));
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const passes = getUserPasses(user.id, CURRENT_SEASON);
  return NextResponse.json({ passes });
}
