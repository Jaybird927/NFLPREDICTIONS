import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_AUTH_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { currentName, newDisplayName } = await request.json();
  if (!currentName || !newDisplayName) {
    return NextResponse.json({ error: 'currentName and newDisplayName required' }, { status: 400 });
  }

  const result = db.prepare(
    'UPDATE users SET display_name = ? WHERE name = ?'
  ).run(newDisplayName, currentName.toLowerCase());

  if (result.changes === 0) {
    return NextResponse.json({ error: `User "${currentName}" not found` }, { status: 404 });
  }

  return NextResponse.json({ success: true, updated: newDisplayName });
}
