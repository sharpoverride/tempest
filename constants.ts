
import { LevelConfig } from './types';

export const TUBE_LENGTH = 100;
export const RADIUS = 15;
export const PLAYER_DEPTH = 5;
export const ENEMY_SPAWN_Z = -TUBE_LENGTH;
export const PLAYER_Z = 0;

export const LEVELS: LevelConfig[] = [
  {
    name: "CYAN CIRCLE",
    description: "Standard training tube. Maintain perimeter stability.",
    sides: 16,
    color: 0x00ffff,
    enemySpawnRate: 0.015,
    enemySpeed: 0.08,
    shape: 'circle',
    isClosed: true,
    targetKills: 10
  },
  {
    name: "RED SQUARE",
    description: "Compressed geometry. Watch the sharp corners.",
    sides: 4,
    color: 0xff0055,
    enemySpawnRate: 0.025,
    enemySpeed: 0.12,
    shape: 'circle',
    isClosed: true,
    targetKills: 15
  },
  {
    name: "LIME HEXAGON",
    description: "High velocity corridor. Enemies approach rapidly.",
    sides: 6,
    color: 0x00ff00,
    enemySpawnRate: 0.035,
    enemySpeed: 0.16,
    shape: 'circle',
    isClosed: true,
    targetKills: 20
  },
  {
    name: "AMBER CLOVER",
    description: "Complex harmonic field. 40-lane sector.",
    sides: 40,
    color: 0xffaa00,
    enemySpawnRate: 0.028,
    enemySpeed: 0.15,
    shape: 'clover',
    isClosed: true,
    targetKills: 25
  }
];

export const COLORS = {
  PLAYER: 0xffff00,
  BULLET: 0xffffff,
  ENEMY: 0xff4444,
  PARTICLE: 0xffaa00,
  DANGER: 0xff0000,
};
