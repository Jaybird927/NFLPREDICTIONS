'use client';

import Image from 'next/image';
import { Team } from '@/types';

interface PredictionCellProps {
  homeTeam: Team;
  awayTeam: Team;
  selectedTeamId: string | null;
  isLocked: boolean;
  isCorrect?: boolean | null;
  winnerTeamId?: string;
  onChange: (teamId: string | null) => void;
}

export function PredictionCell({
  homeTeam,
  awayTeam,
  selectedTeamId,
  isLocked,
  isCorrect,
  winnerTeamId,
  onChange,
}: PredictionCellProps) {
  const handleClick = () => {
    // For locked games, the parent will handle auth check
    // For unlocked games, allow changes

    // Cycle through: null -> homeTeam -> awayTeam -> null
    if (selectedTeamId === null) {
      onChange(homeTeam.id);
    } else if (selectedTeamId === homeTeam.id) {
      onChange(awayTeam.id);
    } else {
      onChange(null);
    }
  };

  const getSelectedTeam = () => {
    if (selectedTeamId === homeTeam.id) return homeTeam;
    if (selectedTeamId === awayTeam.id) return awayTeam;
    return null;
  };

  const selectedTeam = getSelectedTeam();

  // Determine background color
  let bgColor = 'bg-gray-100 hover:bg-gray-200';
  if (isLocked) {
    bgColor = 'bg-gray-50';
    if (isCorrect === true) {
      bgColor = 'bg-green-100';
    } else if (isCorrect === false) {
      bgColor = 'bg-red-100';
    }
  }

  const cursor = 'cursor-pointer';
  const opacity = isLocked ? 'opacity-60' : '';

  return (
    <div
      onClick={handleClick}
      className={`
        relative w-16 h-16 border border-gray-300 rounded flex items-center justify-center
        ${bgColor} ${cursor} ${opacity} transition-colors
      `}
      title={
        isLocked
          ? `Game started - admin password needed to change`
          : 'Click to cycle through teams'
      }
    >
      {selectedTeam && selectedTeam.logo ? (
        <Image
          src={selectedTeam.logo}
          alt={selectedTeam.name}
          width={48}
          height={48}
          className="object-contain"
        />
      ) : selectedTeam ? (
        <div className="text-xs font-bold text-gray-700">
          {selectedTeam.abbreviation}
        </div>
      ) : (
        <div className="text-gray-400 text-xs">-</div>
      )}

      {/* Show checkmark or X for finished games */}
      {isLocked && isCorrect !== null && (
        <div className="absolute top-0 right-0 text-xs">
          {isCorrect ? '✓' : '✗'}
        </div>
      )}
    </div>
  );
}
