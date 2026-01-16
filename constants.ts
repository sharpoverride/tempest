
import { LevelConfig } from './types';

export const TUBE_LENGTH = 100;
export const RADIUS = 15;
export const PLAYER_DEPTH = 5;
export const ENEMY_SPAWN_Z = -TUBE_LENGTH;
export const PLAYER_Z = 0;

export const LEVELS: LevelConfig[] = [
  {
    name: "CYAN CIRCLE",
    sides: 16,
    color: 0x00ffff,
    enemySpawnRate: 0.015, // Slightly lower spawn rate for level 1
    enemySpeed: 0.08,      // Slower
  },
  {
    name: "RED SQUARE",
    sides: 12,
    color: 0xff0055,
    enemySpawnRate: 0.025,
    enemySpeed: 0.12,      // Slower
  },
  {
    name: "LIME HEXAGON",
    sides: 8,
    color: 0x00ff00,
    enemySpawnRate: 0.035,
    enemySpeed: 0.16,      // Slower
  },
  {
    name: "PURPLE STAR",
    sides: 20,
    color: 0xaa00ff,
    enemySpawnRate: 0.045,
    enemySpeed: 0.2,       // Slower
  }
];

export const COLORS = {
  PLAYER: 0xffff00,
  BULLET: 0xffffff,
  ENEMY: 0xff4444,
  PARTICLE: 0xffaa00,
  DANGER: 0xff0000,
};
