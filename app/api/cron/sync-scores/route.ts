import { NextResponse } from 'next/server';
import { syncCurrentWeek } from '@/lib/services/game.service';

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting score sync...');
    const result = await syncCurrentWeek();

    console.log('Score sync complete:', result);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Score sync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
