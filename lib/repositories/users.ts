import db from '../db';
import { User, UserRow } from '@/types';
import { parseDbDate } from '../utils/date';
import { normalizeUsername } from '../utils/validators';

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    createdAt: parseDbDate(row.created_at),
    updatedAt: parseDbDate(row.updated_at),
  };
}

export function getAllUsers(): User[] {
  const stmt = db.prepare('SELECT * FROM users ORDER BY display_name ASC');
  const rows = stmt.all() as UserRow[];
  return rows.map(rowToUser);
}

export function getUserById(userId: number): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const row = stmt.get(userId) as UserRow | undefined;
  return row ? rowToUser(row) : null;
}

export function getUserByName(name: string): User | null {
  const normalizedName = normalizeUsername(name);
  const stmt = db.prepare('SELECT * FROM users WHERE name = ?');
  const row = stmt.get(normalizedName) as UserRow | undefined;
  return row ? rowToUser(row) : null;
}

export function createUser(displayName: string): User {
  const name = normalizeUsername(displayName);

  const stmt = db.prepare(`
    INSERT INTO users (name, display_name)
    VALUES (?, ?)
  `);

  const result = stmt.run(name, displayName);
  const userId = result.lastInsertRowid as number;

  return getUserById(userId)!;
}

export function deleteUser(userId: number): void {
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  stmt.run(userId);
}

export function findOrCreateUser(displayName: string): User {
  const existing = getUserByName(displayName);
  if (existing) {
    return existing;
  }
  return createUser(displayName);
}
