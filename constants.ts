
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
    enemySpawnRate: 0.015,
    enemySpeed: 0.08,
    shape: 'circle',
    isClosed: true,
    targetKills: 10
  },
  {
    name: "RED SQUARE",
    sides: 12,
    color: 0xff0055,
    enemySpawnRate: 0.025,
    enemySpeed: 0.12,
    shape: 'circle',
    isClosed: true,
    targetKills: 15
  },
  {
    name: "LIME HEXAGON",
    sides: 8,
    color: 0x00ff00,
    enemySpawnRate: 0.035,
    enemySpeed: 0.16,
    shape: 'circle',
    isClosed: true,
    targetKills: 20
  },
  {
    name: "AMBER CLOVER",
    sides: 40,
    color: 0xffaa00,
    enemySpawnRate: 0.045,
    enemySpeed: 0.18,
    shape: 'clover',
    isClosed: true,
    targetKills: 25
  },
  {
    name: "NEON RIDGE",
    sides: 15,
    color: 0xaa00ff,
    enemySpawnRate: 0.05,
    enemySpeed: 0.2,
    shape: 'zigzag',
    isClosed: false,
    targetKills: 30
  }
];

export const COLORS = {
  PLAYER: 0xffff00,
  BULLET: 0xffffff,
  ENEMY: 0xff4444,
  PARTICLE: 0xffaa00,
  DANGER: 0xff0000,
};
