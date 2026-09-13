const PLAYOFF_WEEK_LABELS: Record<number, string> = {
  1: 'Wild Card',
  2: 'Divisional',
  3: 'Conference',
  5: 'Super Bowl',
};

export function getWeekLabel(seasonType: number, week: number): string {
  if (seasonType !== 3) return `Week ${week}`;
  return PLAYOFF_WEEK_LABELS[week] ?? `Playoff Week ${week}`;
}

export function isSeasonFinale(seasonType: number, week: number): boolean {
  return seasonType === 3 && week === 5;
}

export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}
