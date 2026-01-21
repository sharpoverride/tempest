
import React, { useState, useEffect } from 'react';
import { GameState } from '../types';
import { LEVELS } from '../constants';

interface GameOverlayProps {
  gameState: GameState;
  score: number;
  lives: number;
  kills: number;
  targetKills: number;
  levelName: string;
  onStart: () => void;
}

const GameOverlay: React.FC<GameOverlayProps> = ({ 
  gameState, 
  score, 
  lives, 
  kills,
  targetKills,
  levelName,
  onStart 
}) => {
  const [zapperReady, setZapperReady] = useState(true);
  const currentLevel = LEVELS.find(l => l.name === levelName) || LEVELS[0];

  useEffect(() => {
    const handleZapperUsed = () => setZapperReady(false);
    window.addEventListener('zapperUsed', handleZapperUsed);
    return () => window.removeEventListener('zapperUsed', handleZapperUsed);
  }, []);

  useEffect(() => {
    if (gameState === GameState.PLAYING || gameState === GameState.LEVEL_COMPLETE) {
      setZapperReady(true);
    }
  }, [levelName, gameState]);

  const progress = Math.min(100, Math.round((kills / targetKills) * 100));

  return (
    <div className="w-full h-full flex flex-col justify-between p-8 text-white font-['Press_Start_2P']">
      {/* Top HUD */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="text-[10px] text-cyan-400">SCORE</div>
          <div className="text-xl">{score.toString().padStart(6, '0')}</div>
        </div>
        
        <div className="text-center flex flex-col gap-2 flex-1 mx-4">
          <div className="text-[10px] text-yellow-400">LEVEL: {levelName}</div>
          <div className="w-72 h-3 bg-gray-900 border border-gray-700 relative overflow-hidden mx-auto">
             <div 
               className="h-full bg-cyan-500 shadow-[0_0_15px_#06b6d4] transition-all duration-300"
               style={{ width: `${progress}%` }}
             />
          </div>
          <div className="text-[8px] text-cyan-300 animate-pulse">CLEARED: {progress}%</div>
          <div className="text-[6px] text-gray-500 mt-1 uppercase max-w-[300px] leading-relaxed mx-auto">
            {currentLevel.description}
          </div>
        </div>

        <div className="flex flex-col gap-2 items-end">
          <div className="text-[10px] text-red-500">LIVES</div>
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i} 
                className={`w-4 h-4 border-2 ${i < lives ? 'bg-yellow-400 border-yellow-200 shadow-[0_0_10px_#facc15]' : 'bg-transparent border-gray-800'}`} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* Middle HUD / Game Status */}
      <div className="absolute top-36 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className={`text-[8px] tracking-widest transition-opacity duration-300 ${zapperReady ? 'text-cyan-400 opacity-100' : 'text-gray-600 opacity-50'}`}>
            ZAPPER: {zapperReady ? 'READY [E]' : 'USED'}
          </div>
          {zapperReady && <div className="w-24 h-1 bg-cyan-900 overflow-hidden rounded-full">
            <div className="h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-[pulse_1.5s_infinite]" style={{ width: '100%' }}></div>
          </div>}
      </div>

      {/* Main Screens */}
      <div className="flex-1 flex items-center justify-center pointer-events-auto">
        {gameState === GameState.MENU && (
          <div className="text-center bg-black/80 p-12 border-4 border-cyan-500 rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.5)]">
            <h1 className="text-4xl mb-8 text-cyan-400 animate-pulse tracking-widest">TEMPEST</h1>
            <div className="text-[8px] mb-12 text-gray-400 space-y-4 text-left inline-block leading-relaxed">
              <p>• ARROWS / A-D : ROTATE CLAW</p>
              <p>• SPACE : FIRE VECTOR BULLETS</p>
              <p>• E / SHIFT : SUPERZAPPER (1 PER LEVEL)</p>
              <p>• OBJECTIVE : KILL TARGET TO ADVANCE</p>
            </div>
            <br/>
            <button 
              onClick={onStart}
              className="px-8 py-4 bg-cyan-600 hover:bg-cyan-400 text-white border-2 border-white transition-all transform hover:scale-110 active:scale-95 text-xs"
            >
              START MISSION [SPACE]
            </button>
          </div>
        )}

        {gameState === GameState.GAMEOVER && (
          <div className="text-center bg-black/90 p-12 border-4 border-red-600 rounded-lg shadow-[0_0_30px_#dc2626]">
            <h2 className="text-3xl mb-4 text-red-500">GAME OVER</h2>
            <div className="text-xl mb-8">FINAL SCORE: {score}</div>
            <button 
              onClick={onStart}
              className="px-8 py-4 bg-red-800 hover:bg-red-600 text-white border-2 border-white transition-all transform hover:scale-110 active:scale-95 text-xs"
            >
              RETRY [SPACE]
            </button>
          </div>
        )}

        {gameState === GameState.LEVEL_COMPLETE && (
          <div className="text-center bg-black/90 p-12 border-4 border-yellow-500 rounded-lg animate-bounce shadow-[0_0_30px_#eab308]">
            <h2 className="text-3xl mb-4 text-yellow-400">LEVEL COMPLETE</h2>
            <p className="text-[10px] text-yellow-200">ENTERING HYPERSPACE...</p>
          </div>
        )}
      </div>

      {/* Bottom Footer */}
      <div className="flex justify-center text-[8px] text-gray-600 tracking-widest opacity-50">
        ATARI INSPIRED VECTOR CORE v2.8 // ADVANCEMENT_LOGIC_ENABLED
      </div>
    </div>
  );
};

export default GameOverlay;
