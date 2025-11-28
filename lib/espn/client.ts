import { ESPN_API_BASE_URL } from '../constants';
import { ESPNScoreboardResponse } from '@/types';

export class ESPNClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = ESPN_API_BASE_URL;
  }

  async getScoreboard(seasonType: number, week: number): Promise<ESPNScoreboardResponse> {
    const url = `${this.baseUrl}/scoreboard?seasontype=${seasonType}&week=${week}`;

    try {
      const response = await fetch(url, {
        next: { revalidate: 300 }, // Cache for 5 minutes
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

  async getCurrentWeek(): Promise<{ seasonType: number; week: number; year: number }> {
    try {
      const url = `${this.baseUrl}/scoreboard`;
      const response = await fetch(url, {
        next: { revalidate: 3600 }, // Cache for 1 hour
      });

      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status}`);
      }

      const data = await response.json() as ESPNScoreboardResponse;

      const seasonData = data.leagues[0]?.season;
      const seasonType = typeof seasonData?.type === 'object'
        ? (seasonData.type as any).type
        : seasonData?.type || 2;

      return {
        seasonType,
        week: data.week?.number || 1,
        year: seasonData?.year || new Date().getFullYear(),
      };
    } catch (error) {
      console.error('Failed to get current week:', error);
      // Return default values
      return {
        seasonType: 2,
        week: 1,
        year: new Date().getFullYear(),
      };
    }
  }

  async getWeekSchedule(seasonType: number, week: number): Promise<ESPNScoreboardResponse> {
    return this.getScoreboard(seasonType, week);
  }
}

export const espnClient = new ESPNClient();
