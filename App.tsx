
import React, { useState, useEffect, useCallback } from 'react';
import { GameState } from './types';
import { LEVELS } from './constants';
import GameCanvas from './components/GameCanvas';
import GameOverlay from './components/GameOverlay';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [levelIndex, setLevelIndex] = useState(0);
  const [kills, setKills] = useState(0);

  const startGame = useCallback(() => {
    setScore(0);
    setLives(3);
    setLevelIndex(0);
    setKills(0);
    setGameState(GameState.PLAYING);
  }, []);

  // Handle Level Advancement logic via Effect to ensure it sees the latest kills/state
  useEffect(() => {
    if (gameState === GameState.PLAYING && kills >= LEVELS[levelIndex].targetKills) {
      handleLevelComplete();
    }
  }, [kills, gameState, levelIndex]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (gameState === GameState.MENU || gameState === GameState.GAMEOVER) {
        if (e.code === 'Space' || e.code === 'Enter') {
          startGame();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [gameState, startGame]);

  const handleGameOver = () => {
    setGameState(GameState.GAMEOVER);
  };

  const handleScoreChange = useCallback((points: number) => {
    setScore(prev => prev + points);
    // If it's an enemy kill (points are 100 for bullets or zapper)
    if (points >= 50) {
      setKills(prev => prev + 1);
    }
  }, []);

  const handleLevelComplete = useCallback(() => {
    setGameState(GameState.LEVEL_COMPLETE);
    setTimeout(() => {
      setLevelIndex(prev => (prev + 1) % LEVELS.length);
      setKills(0);
      setGameState(GameState.PLAYING);
    }, 2000);
  }, []);

  const handleLifeLost = useCallback(() => {
    setLives(prev => {
      if (prev <= 1) {
        handleGameOver();
        return 0;
      }
      return prev - 1;
    });
  }, []);

  return (
    <div className="relative w-full h-screen bg-black select-none overflow-hidden text-white">
      {/* Three.js Game Engine Container */}
      <div className="absolute inset-0 z-0">
        <GameCanvas 
          gameState={gameState}
          levelIndex={levelIndex}
          onScore={handleScoreChange}
          onLifeLost={handleLifeLost}
          onLevelComplete={handleLevelComplete}
        />
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <GameOverlay 
          gameState={gameState}
          score={score}
          lives={lives}
          kills={kills}
          targetKills={LEVELS[levelIndex].targetKills}
          levelName={LEVELS[levelIndex].name}
          onStart={startGame}
        />
      </div>

      {/* Retro scanline effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_2px,3px_100%]"></div>
    </div>
  );
};

export default App;
