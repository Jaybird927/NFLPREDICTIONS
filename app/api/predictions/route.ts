import { NextResponse } from 'next/server';
import { bulkUpsertPredictions, BulkPredictionInput } from '@/lib/repositories/predictions';
import { validateUserToken, validateAdminToken } from '@/lib/utils/tokens';

export async function POST(request: Request) {
  try {
    // Check for authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - no token provided' },
        { status: 401 }
      );
    }

    // Extract and validate token
    const token = authHeader.substring(7);
    const userAuth = validateUserToken(token);
    const isAdmin = validateAdminToken(token);

    if (!userAuth && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid token' },
        { status: 401 }
      );
    }

    const { predictions } = await request.json();

    if (!Array.isArray(predictions)) {
      return NextResponse.json(
        { error: 'Predictions must be an array' },
        { status: 400 }
      );
    }

    // Validate ownership for non-admin users
    if (!isAdmin && userAuth) {
      const invalidPrediction = predictions.find(
        (p: any) => p.userId !== userAuth.userId
      );
      if (invalidPrediction) {
        return NextResponse.json(
          { error: 'Forbidden - cannot modify other users predictions' },
          { status: 403 }
        );
      }
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
