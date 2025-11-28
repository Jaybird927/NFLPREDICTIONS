import { format, formatDistanceToNow, isPast } from 'date-fns';

export function formatGameTime(date: Date): string {
  return format(date, 'EEE, MMM d @ h:mm a');
}

export function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

export function isGameLocked(gameDate: Date): boolean {
  return isPast(gameDate);
}

export function parseDbDate(dateString: string): Date {
  return new Date(dateString);
}
