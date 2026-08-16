import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/repositories/users';
import { getSubscriptionsByUserId } from '@/lib/repositories/notifications';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ subscribed: false });
  }

  const user = getUserByToken(authHeader.substring(7));
  if (!user) return NextResponse.json({ subscribed: false });

  const subs = getSubscriptionsByUserId(user.id);
  return NextResponse.json({ subscribed: subs.length > 0 });
}
