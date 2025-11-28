import { z } from 'zod';

export const loginSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name is too long'),
});

export const predictionSchema = z.object({
  gameId: z.number().int().positive(),
  predictedWinnerTeamId: z.string().min(1),
});

export function normalizeUsername(name: string): string {
  return name.trim().toLowerCase();
}

export function validateEnvVariables() {
  const required = [
    'DATABASE_PATH',
    'SESSION_SECRET',
    'CRON_SECRET',
  ] as const;

  for (const envVar of required) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}
