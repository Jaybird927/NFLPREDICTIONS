import { ESPN_API_BASE_URL } from '../constants';
import { ESPNScoreboardResponse } from '@/types';

export class ESPNClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = ESPN_API_BASE_URL;
  }

  async getScoreboard(seasonType: number, week: number, noCache: boolean = false): Promise<ESPNScoreboardResponse> {
    const url = `${this.baseUrl}/scoreboard?seasontype=${seasonType}&week=${week}`;

    try {
      const response = await fetch(url, {
        ...(noCache ? { cache: 'no-store' } : { next: { revalidate: 300 } }), // Cache for 5 minutes unless noCache is true
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as ESPNScoreboardResponse;
    } catch (error) {
      console.error('ESPN API fetch failed:', error);
      throw error;
    }
  }

  // Fetches ESPN's own "current" scoreboard once and derives both the raw
  // reported week and the look-ahead week (what to show next once the raw
  // week's games are all final). Kept as one method so both values come from
  // a single fetch instead of hitting ESPN twice.
  private async fetchWeekInfo(noCache: boolean): Promise<{
    raw: { seasonType: number; week: number; year: number };
    advanced: { seasonType: number; week: number; year: number };
  }> {
    const fallback = { seasonType: 2, week: 1, year: new Date().getFullYear() };

    try {
      const url = `${this.baseUrl}/scoreboard`;
      const response = await fetch(url, {
        ...(noCache ? { cache: 'no-store' } : { next: { revalidate: 3600 } }), // Cache for 1 hour unless noCache is true
      });

      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status}`);
      }

      const data = await response.json() as ESPNScoreboardResponse;

      const seasonData = data.leagues[0]?.season;
      const seasonType = typeof seasonData?.type === 'object'
        ? (seasonData.type as any).type
        : seasonData?.type || 2;

      const week = data.week?.number || 1;
      const year = seasonData?.year || new Date().getFullYear();

      // Skip preseason entirely — treat it as regular season week 1
      if (seasonType === 1) {
        const regularSeasonStart = { seasonType: 2, week: 1, year };
        return { raw: regularSeasonStart, advanced: regularSeasonStart };
      }

      const raw = { seasonType, week, year };

      // Check if all games in the raw week are finished
      const allGamesFinished = data.events?.every(event => {
        const state = event.status?.type?.state;
        return state === 'post';
      }) ?? false;

      const maxWeek = seasonType === 2 ? 18 : 5;

      let advancedSeasonType = seasonType;
      let advancedWeek = week;
      if (allGamesFinished && data.events && data.events.length > 0) {
        if (seasonType === 2 && week >= maxWeek) {
          advancedSeasonType = 3;
          advancedWeek = 1;
        } else {
          advancedWeek = Math.min(week + 1, maxWeek);
        }
      }

      return { raw, advanced: { seasonType: advancedSeasonType, week: advancedWeek, year } };
    } catch (error) {
      console.error('Failed to get current week:', error);
      return { raw: fallback, advanced: fallback };
    }
  }

  // The "current" week for display purposes — once the raw week's games are
  // all final, this looks ahead to the next week so the picking grid can move
  // on without waiting for ESPN's own current-week pointer to roll over.
  async getCurrentWeek(noCache: boolean = false): Promise<{ seasonType: number; week: number; year: number }> {
    const { advanced } = await this.fetchWeekInfo(noCache);
    return advanced;
  }

  // The week(s) that should actually be synced for scores: always the raw
  // ESPN-reported week (so a just-finished final game never gets skipped),
  // plus the look-ahead week too if it has already advanced past it.
  async getSyncWeeks(noCache: boolean = false): Promise<Array<{ seasonType: number; week: number; year: number }>> {
    const { raw, advanced } = await this.fetchWeekInfo(noCache);
    if (advanced.seasonType === raw.seasonType && advanced.week === raw.week) {
      return [raw];
    }
    return [raw, advanced];
  }

  async getWeekSchedule(seasonType: number, week: number): Promise<ESPNScoreboardResponse> {
    return this.getScoreboard(seasonType, week);
  }

  async getRecap(espnEventId: string): Promise<{ headline: string; description: string; source: string } | null> {
    const url = `${this.baseUrl}/summary?event=${espnEventId}`;

    try {
      const response = await fetch(url, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const article = data.article;

      if (!article?.description) {
        return null;
      }

      return {
        headline: article.headline || '',
        description: article.description,
        source: article.source || 'ESPN',
      };
    } catch (error) {
      console.error('ESPN recap fetch failed:', error);
      return null;
    }
  }
}

export const espnClient = new ESPNClient();
