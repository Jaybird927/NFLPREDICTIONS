import { NextResponse } from 'next/server';
import { espnClient } from '@/lib/espn/client';

export async function GET() {
  try {
    const currentWeek = await espnClient.getCurrentWeek();
    return NextResponse.json(currentWeek);
  } catch (error) {
    console.error('Failed to get current week:', error);
    return NextResponse.json(
      { error: 'Failed to get current week' },
      { status: 500 }
    );
  }
}
