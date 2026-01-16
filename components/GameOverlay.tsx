
import React, { useState, useEffect } from 'react';
import { GameState } from '../types';

interface GameOverlayProps {
  gameState: GameState;
  score: number;
  lives: number;
  levelName: string;
  onStart: () => void;
}

const GameOverlay: React.FC<GameOverlayProps> = ({ 
  gameState, 
  score, 
  lives, 
  levelName,
  onStart 
}) => {
  const [zapperReady, setZapperReady] = useState(true);

  // Sync zapper status with game logic via custom events
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

  return (
    <div className="w-full h-full flex flex-col justify-between p-8 text-white">
      {/* Top HUD */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="text-xs text-cyan-400">SCORE</div>
          <div className="text-2xl">{score.toString().padStart(6, '0')}</div>
        </div>
        
        <div className="text-center">
          <div className="text-xs text-yellow-400">LEVEL</div>
          <div className="text-xl">{levelName}</div>
        </div>

        <div className="flex flex-col gap-2 items-end">
          <div className="text-xs text-red-500">LIVES</div>
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
      <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className={`text-[10px] tracking-widest transition-opacity duration-300 ${zapperReady ? 'text-cyan-400 opacity-100' : 'text-gray-600 opacity-50'}`}>
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
            <h1 className="text-5xl mb-8 text-cyan-400 animate-pulse tracking-widest">TEMPEST</h1>
            <div className="text-[10px] mb-12 text-gray-400 space-y-2 text-left inline-block">
              <p>• ARROWS / A-D : ROTATE CLAW</p>
              <p>• SPACE : FIRE VECTOR BULLETS</p>
              <p>• E / SHIFT : SUPERZAPPER (1 PER LEVEL)</p>
              <p>• OBJECTIVE : PREVENT CORE BREACH</p>
            </div>
            <br/>
            <button 
              onClick={onStart}
              className="px-8 py-4 bg-cyan-600 hover:bg-cyan-400 text-white border-2 border-white transition-all transform hover:scale-110 active:scale-95"
            >
              START MISSION [SPACE]
            </button>
          </div>
        )}

        {gameState === GameState.GAMEOVER && (
          <div className="text-center bg-black/90 p-12 border-4 border-red-600 rounded-lg shadow-[0_0_30px_#dc2626]">
            <h2 className="text-4xl mb-4 text-red-500">GAME OVER</h2>
            <div className="text-2xl mb-8">FINAL SCORE: {score}</div>
            <button 
              onClick={onStart}
              className="px-8 py-4 bg-red-800 hover:bg-red-600 text-white border-2 border-white transition-all transform hover:scale-110 active:scale-95"
            >
              RETRY [SPACE]
            </button>
          </div>
        )}

        {gameState === GameState.LEVEL_COMPLETE && (
          <div className="text-center bg-black/90 p-12 border-4 border-yellow-500 rounded-lg animate-bounce shadow-[0_0_30px_#eab308]">
            <h2 className="text-4xl mb-4 text-yellow-400">LEVEL COMPLETE</h2>
            <p className="text-sm text-yellow-200">ENTERING HYPERSPACE...</p>
          </div>
        )}
      </div>

      {/* Bottom Footer */}
      <div className="flex justify-center text-[10px] text-gray-600 tracking-widest opacity-50">
        ATARI INSPIRED VECTOR CORE v2.7 // CONTROL_SWAP_ACTIVE
      </div>
    </div>
  );
};

export default GameOverlay;
