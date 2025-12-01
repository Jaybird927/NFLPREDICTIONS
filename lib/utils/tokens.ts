import crypto from 'crypto';
import db from '@/lib/db';

export function generateUserToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function validateUserToken(token: string): { userId: number; name: string; displayName: string } | null {
  const user = db
    .prepare('SELECT id, name, display_name FROM users WHERE auth_token = ?')
    .get(token) as any;

  if (!user) return null;

  return {
    userId: user.id,
    name: user.name,
    displayName: user.display_name,
  };
}

export function validateAdminToken(token: string): boolean {
  return token === process.env.ADMIN_AUTH_TOKEN;
}
