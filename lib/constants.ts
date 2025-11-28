export const SEASON_TYPES = {
  PRESEASON: 1,
  REGULAR: 2,
  POSTSEASON: 3,
} as const;

export const GAME_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  FINAL: 'final',
} as const;

export const CURRENT_SEASON = parseInt(process.env.CURRENT_SEASON || '2025');
export const CURRENT_SEASON_TYPE = parseInt(process.env.CURRENT_SEASON_TYPE || '2');

export const ESPN_API_BASE_URL = process.env.ESPN_API_BASE_URL || 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
