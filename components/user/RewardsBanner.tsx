'use client';

interface PassInfo {
  fifteenMinUnused: number;
  designatedGameId: number | null;
  activeGameId: number | null;
  usedFifteenGameIds: number[];
  correctionUnused: number;
  correctionUsedGameIds: number[];
}

interface RewardsBannerProps {
  authToken: string;
  passInfo: PassInfo;
  selectingPass: boolean;
  onStartSelect: () => void;
  onCancelSelect: () => void;
  onCancelDesignation: () => void;
}

export function RewardsBanner({ passInfo, selectingPass, onStartSelect, onCancelSelect, onCancelDesignation }: RewardsBannerProps) {
  const hasAnything = passInfo.fifteenMinUnused > 0 || passInfo.correctionUnused > 0 ||
    passInfo.usedFifteenGameIds.length > 0 || passInfo.correctionUsedGameIds.length > 0;

  if (!hasAnything) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-3">Your Rewards</h3>
      <div className="flex flex-wrap items-center gap-3">

        {/* Correction pass */}
        {passInfo.correctionUnused > 0 && (
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-2">
            <span className="text-xl">✏️</span>
            <div>
              <p className="font-semibold text-yellow-800 text-sm">
                Correction Pass{passInfo.correctionUnused > 1 ? ` ×${passInfo.correctionUnused}` : ''}
              </p>
              <p className="text-xs text-yellow-700">Auto-applies at week end — fixes your first wrong pick</p>
            </div>
          </div>
        )}

        {passInfo.correctionUnused === 0 && passInfo.correctionUsedGameIds.length > 0 && (
          <div className="flex items-center gap-2 bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 opacity-60">
            <span className="text-xl">✏️</span>
            <div>
              <p className="font-semibold text-gray-600 text-sm">Correction Pass</p>
              <p className="text-xs text-gray-500">Used — row is yellow where applied</p>
            </div>
          </div>
        )}

        {/* 15-minute pass — unused, not yet designated */}
        {passInfo.fifteenMinUnused > 0 && !passInfo.designatedGameId && !selectingPass && (
          <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-2">
            <span className="text-xl">⏱</span>
            <div>
              <p className="font-semibold text-yellow-800 text-sm">
                15-Minute Pass{passInfo.fifteenMinUnused > 1 ? ` ×${passInfo.fifteenMinUnused}` : ''}
              </p>
              <p className="text-xs text-yellow-700">Pick a game up to 15 min after kickoff</p>
            </div>
            <button onClick={onStartSelect} className="ml-2 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold rounded-lg">
              Use a Pass
            </button>
          </div>
        )}

        {/* Selection mode active */}
        {selectingPass && (
          <div className="flex items-center gap-3 bg-yellow-100 border border-yellow-400 rounded-lg px-4 py-2">
            <span className="text-xl">⏱</span>
            <p className="font-semibold text-yellow-800 text-sm">Select a game below to apply your pass</p>
            <button onClick={onCancelSelect} className="ml-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg">Cancel</button>
          </div>
        )}

        {/* Designated */}
        {passInfo.designatedGameId && !selectingPass && (
          <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-2">
            <span className="text-xl">⏱</span>
            <div>
              <p className="font-semibold text-yellow-800 text-sm">15-Minute Pass Designated</p>
              <p className="text-xs text-yellow-700">Row turns yellow at kickoff — 15 min to pick</p>
            </div>
            <button onClick={onCancelDesignation} className="ml-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg">Cancel</button>
          </div>
        )}

        {/* All 15-min passes used */}
        {passInfo.fifteenMinUnused === 0 && passInfo.usedFifteenGameIds.length > 0 && (
          <div className="flex items-center gap-2 bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 opacity-60">
            <span className="text-xl">⏱</span>
            <div>
              <p className="font-semibold text-gray-600 text-sm">15-Minute Pass</p>
              <p className="text-xs text-gray-500">All used — win a week to earn another</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
