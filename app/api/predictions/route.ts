import { NextResponse } from 'next/server';
import { bulkUpsertPredictions, BulkPredictionInput } from '@/lib/repositories/predictions';

export async function POST(request: Request) {
  try {
    const { predictions } = await request.json();

    if (!Array.isArray(predictions)) {
      return NextResponse.json(
        { error: 'Predictions must be an array' },
        { status: 400 }
      );
    }

    bulkUpsertPredictions(predictions as BulkPredictionInput[]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save predictions:', error);
    return NextResponse.json(
      { error: 'Failed to save predictions' },
      { status: 500 }
    );
  }
}
