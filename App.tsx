
import React, { useState, useEffect, useCallback } from 'react';
import { GameState } from './types';
import GameCanvas from './components/GameCanvas';
import GameOverlay from './components/GameOverlay';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [levelIndex, setLevelIndex] = useState(0);

  const startGame = useCallback(() => {
    setScore(0);
    setLives(3);
    setLevelIndex(0);
    setGameState(GameState.PLAYING);
  }, []);

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

  const handleScoreChange = (points: number) => {
    setScore(prev => prev + points);
  };

  const handleLevelComplete = () => {
    setGameState(GameState.LEVEL_COMPLETE);
    setTimeout(() => {
      setLevelIndex(prev => (prev + 1) % 4);
      setGameState(GameState.PLAYING);
    }, 2000);
  };

  const handleLifeLost = () => {
    setLives(prev => {
      if (prev <= 1) {
        handleGameOver();
        return 0;
      }
      return prev - 1;
    });
  };

  return (
    <div className="relative w-full h-screen bg-black select-none overflow-hidden">
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
          levelName={`LEVEL ${levelIndex + 1}`}
          onStart={startGame}
        />
      </div>

      {/* Retro scanline effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_2px,3px_100%]"></div>
    </div>
  );
};

export default App;
