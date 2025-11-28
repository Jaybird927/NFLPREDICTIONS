import { ESPNEvent } from '@/types';
import { GAME_STATUS } from '../constants';

export interface GameData {
  espnEventId: string;
  seasonYear: number;
  seasonType: number;
  week: number;

  homeTeamId: string;
  homeTeamName: string;
  homeTeamAbbreviation: string;
  homeTeamLogo: string | null;

  awayTeamId: string;
  awayTeamName: string;
  awayTeamAbbreviation: string;
  awayTeamLogo: string | null;

  gameDate: string; // ISO string
  gameStatus: string;

  homeScore: number;
  awayScore: number;

  winnerTeamId: string | null;
}

export function transformESPNEventToGame(
  event: ESPNEvent,
  seasonYear: number,
  seasonType: number,
  week: number
): GameData {
  const competition = event.competitions[0];
  if (!competition) {
    throw new Error(`No competition data for event ${event.id}`);
  }

  const homeTeam = competition.competitors.find((c) => c.homeAway === 'home');
  const awayTeam = competition.competitors.find((c) => c.homeAway === 'away');

  if (!homeTeam || !awayTeam) {
    throw new Error(`Missing team data for event ${event.id}`);
  }

  // Determine game status
  let gameStatus = GAME_STATUS.SCHEDULED;
  if (event.status.type.completed) {
    gameStatus = GAME_STATUS.FINAL;
  } else if (event.status.type.state === 'in') {
    gameStatus = GAME_STATUS.IN_PROGRESS;
  }

  // Determine winner
  let winnerTeamId: string | null = null;
  if (gameStatus === GAME_STATUS.FINAL) {
    if (homeTeam.winner) {
      winnerTeamId = homeTeam.team.id;
    } else if (awayTeam.winner) {
      winnerTeamId = awayTeam.team.id;
    } else {
      // Fallback to score comparison
      const homeScore = parseInt(homeTeam.score || '0');
      const awayScore = parseInt(awayTeam.score || '0');
      if (homeScore > awayScore) {
        winnerTeamId = homeTeam.team.id;
      } else if (awayScore > homeScore) {
        winnerTeamId = awayTeam.team.id;
      }
      // If tied, winnerTeamId remains null
    }
  }

  return {
    espnEventId: event.id,
    seasonYear,
    seasonType,
    week,

    homeTeamId: homeTeam.team.id,
    homeTeamName: homeTeam.team.name,
    homeTeamAbbreviation: homeTeam.team.abbreviation,
    homeTeamLogo: homeTeam.team.logo || null,

    awayTeamId: awayTeam.team.id,
    awayTeamName: awayTeam.team.name,
    awayTeamAbbreviation: awayTeam.team.abbreviation,
    awayTeamLogo: awayTeam.team.logo || null,

    gameDate: event.date,
    gameStatus,

    homeScore: parseInt(homeTeam.score || '0'),
    awayScore: parseInt(awayTeam.score || '0'),

    winnerTeamId,
  };
}
