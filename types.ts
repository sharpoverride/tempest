
import * as THREE from 'three';

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE'
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Enemy {
  id: string;
  type: 'flipper' | 'spiker' | 'tanker';
  lane: number;
  depth: number; // 0 to 1, where 1 is close to player
  speed: number;
  mesh?: THREE.Group;
  isRimWalking?: boolean;
  lastFlipTime?: number;
}

export interface Bullet {
  id: string;
  lane: number;
  depth: number; // 1 to 0, where 0 is far end
  speed: number;
  mesh?: THREE.Mesh;
}

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  mesh: THREE.Mesh;
}

export interface LevelConfig {
  sides: number;
  color: number;
  enemySpawnRate: number;
  enemySpeed: number;
  name: string;
  description: string;
  shape?: 'circle' | 'clover' | 'zigzag';
  isClosed?: boolean;
  targetKills: number;
}
