
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GameState, Enemy, Bullet, Particle, LevelConfig } from '../types';
import { TUBE_LENGTH, RADIUS, LEVELS, COLORS } from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  levelIndex: number;
  onScore: (points: number) => void;
  onLifeLost: () => void;
  onLevelComplete: () => void;
}

interface BulletInternal extends Bullet {
  prevDepth: number;
}

const getShapePoint = (lane: number, sides: number, radius: number, level: LevelConfig) => {
  const theta = (lane / sides) * Math.PI * 2;
  let r = radius;

  if (level.shape === 'clover') {
    // Smooth 4-lobed clover
    r = radius * (0.8 + 0.3 * Math.cos(theta * 4));
  } else if (level.shape === 'zigzag') {
    const x = (lane - (sides - 1) / 2) * (radius * 0.5);
    const zigzagY = (Math.abs((lane % 4) - 2) - 1) * radius * 0.4;
    return { x, y: zigzagY };
  }

  return {
    x: Math.cos(theta) * r,
    y: Math.sin(theta) * r
  };
};

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  levelIndex, 
  onScore, 
  onLifeLost, 
  onLevelComplete 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onScoreRef = useRef(onScore);
  const onLifeLostRef = useRef(onLifeLost);
  
  const stateRef = useRef({ 
    gameState, 
    levelIndex, 
    lane: 0,
    enemies: [] as Enemy[],
    bullets: [] as BulletInternal[],
    particles: [] as Particle[],
    lastShoot: 0,
    superzapperAvailable: true,
    flashIntensity: 0,
    cameraShake: 0,
    hyperspaceZoom: 1.0
  });

  useEffect(() => {
    onScoreRef.current = onScore;
    onLifeLostRef.current = onLifeLost;
  }, [onScore, onLifeLost]);

  useEffect(() => {
    stateRef.current.gameState = gameState;
    if (stateRef.current.levelIndex !== levelIndex) {
      stateRef.current.levelIndex = levelIndex;
      stateRef.current.superzapperAvailable = true;
      const config = LEVELS[levelIndex];
      stateRef.current.lane = config.isClosed ? 0 : Math.floor(config.sides / 2);
      stateRef.current.hyperspaceZoom = 1.0;
    }
  }, [gameState, levelIndex]);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
    const originalCameraPos = new THREE.Vector3(0, 5, 25);
    
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.0, 0.4, 0.85);
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    const levelGroup = new THREE.Group();
    scene.add(levelGroup);

    const flashGeo = new THREE.PlaneGeometry(200, 200);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false });
    const flashMesh = new THREE.Mesh(flashGeo, flashMat);
    flashMesh.position.z = 10;
    scene.add(flashMesh);

    let tubeLines: THREE.LineSegments | null = null;
    const updateLevelVisuals = () => {
      if (tubeLines) levelGroup.remove(tubeLines);
      const config = LEVELS[stateRef.current.levelIndex];
      const sides = config.sides;
      const geometry = new THREE.BufferGeometry();
      const vertices: number[] = [];

      for (let i = 0; i < sides; i++) {
        const nextIdx = (i + 1) % sides;
        if (!config.isClosed && i === sides - 1) break;

        const p1 = getShapePoint(i, sides, RADIUS, config);
        const p2 = getShapePoint(nextIdx, sides, RADIUS, config);
        
        vertices.push(p1.x, p1.y, 0, p2.x, p2.y, 0);
        vertices.push(p1.x * 0.1, p1.y * 0.1, -TUBE_LENGTH, p2.x * 0.1, p2.y * 0.1, -TUBE_LENGTH);
        vertices.push(p1.x, p1.y, 0, p1.x * 0.1, p1.y * 0.1, -TUBE_LENGTH);
        
        if (!config.isClosed && i === sides - 2) {
           vertices.push(p2.x, p2.y, 0, p2.x * 0.1, p2.y * 0.1, -TUBE_LENGTH);
        }
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      tubeLines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: config.color }));
      levelGroup.add(tubeLines);
    };

    updateLevelVisuals();

    const playerGroup = new THREE.Group();
    const playerGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.0, 0, 0),
      new THREE.Vector3(0, -0.6, 0),
      new THREE.Vector3(1.0, 0, 0),
      new THREE.Vector3(0, 0.4, 0),
      new THREE.Vector3(-1.0, 0, 0)
    ]);
    const playerMesh = new THREE.Line(playerGeo, new THREE.LineBasicMaterial({ color: COLORS.PLAYER }));
    playerGroup.add(playerMesh);
    levelGroup.add(playerGroup);
    
    camera.position.copy(originalCameraPos);
    camera.lookAt(0, 0, -TUBE_LENGTH / 2);

    const keys: { [key: string]: boolean } = {};
    const handleKeyDown = (e: KeyboardEvent) => keys[e.code] = true;
    const handleKeyUp = (e: KeyboardEvent) => keys[e.code] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const spawnEnemy = () => {
      const sides = LEVELS[stateRef.current.levelIndex].sides;
      const lane = Math.floor(Math.random() * sides);
      const group = new THREE.Group();
      const enemyGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.6, -0.6, 0),
        new THREE.Vector3(0.6, -0.6, 0),
        new THREE.Vector3(0, 0.9, 0),
        new THREE.Vector3(-0.6, -0.6, 0)
      ]);
      const mesh = new THREE.Line(enemyGeo, new THREE.LineBasicMaterial({ color: COLORS.ENEMY }));
      group.add(mesh);
      levelGroup.add(group);
      stateRef.current.enemies.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'flipper',
        lane,
        depth: 0,
        speed: LEVELS[stateRef.current.levelIndex].enemySpeed,
        mesh: group
      });
    };

    const spawnBullet = () => {
      const now = Date.now();
      if (now - stateRef.current.lastShoot < 120) return;
      stateRef.current.lastShoot = now;
      const bulletGeo = new THREE.BoxGeometry(0.2, 0.2, 2.5);
      const bulletMat = new THREE.MeshBasicMaterial({ color: COLORS.BULLET });
      const mesh = new THREE.Mesh(bulletGeo, bulletMat);
      levelGroup.add(mesh);
      stateRef.current.bullets.push({
        id: Math.random().toString(36).substr(2, 9),
        lane: Math.floor(stateRef.current.lane),
        depth: 1,
        prevDepth: 1,
        speed: 3.5,
        mesh
      });
    };

    const triggerSuperzapper = () => {
      if (!stateRef.current.superzapperAvailable) return;
      stateRef.current.superzapperAvailable = false;
      stateRef.current.flashIntensity = 1.0;
      stateRef.current.cameraShake = 1.0;
      
      stateRef.current.enemies.forEach(enemy => {
        if (enemy.mesh) {
          spawnExplosion(enemy.mesh.position, 15);
          levelGroup.remove(enemy.mesh);
          onScoreRef.current(100); 
        }
      });
      stateRef.current.enemies = [];
      window.dispatchEvent(new CustomEvent('zapperUsed'));
    };

    const spawnExplosion = (pos: THREE.Vector3, count = 10) => {
      for (let i = 0; i < count; i++) {
        const pMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 0.15, 0.15),
          new THREE.MeshBasicMaterial({ color: COLORS.PARTICLE, transparent: true })
        );
        pMesh.position.copy(pos);
        levelGroup.add(pMesh);
        stateRef.current.particles.push({
          position: pos.clone(),
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 1.5,
            (Math.random() - 0.5) * 1.5,
            (Math.random() - 0.5) * 1.5
          ),
          life: 1.0,
          mesh: pMesh
        });
      }
    };

    const resetLevel = () => {
      stateRef.current.enemies.forEach(e => e.mesh && levelGroup.remove(e.mesh));
      stateRef.current.bullets.forEach(b => b.mesh && levelGroup.remove(b.mesh));
      stateRef.current.particles.forEach(p => levelGroup.remove(p.mesh));
      stateRef.current.enemies = [];
      stateRef.current.bullets = [];
      stateRef.current.particles = [];
      stateRef.current.superzapperAvailable = true;
      stateRef.current.hyperspaceZoom = 1.0;
      updateLevelVisuals();
    };

    let frameId: number;
    let lastTime = performance.now();
    let currentLevelIdx = levelIndex;

    const animate = (time: number) => {
      frameId = requestAnimationFrame(animate);
      const delta = (time - lastTime) / 16;
      lastTime = time;

      if (currentLevelIdx !== stateRef.current.levelIndex) {
        currentLevelIdx = stateRef.current.levelIndex;
        resetLevel();
      }

      if (stateRef.current.gameState === GameState.LEVEL_COMPLETE) {
        stateRef.current.hyperspaceZoom += 0.08 * delta;
        levelGroup.scale.set(stateRef.current.hyperspaceZoom, stateRef.current.hyperspaceZoom, stateRef.current.hyperspaceZoom);
        composer.render();
        return;
      } else {
        levelGroup.scale.set(1, 1, 1);
      }

      if (stateRef.current.gameState !== GameState.PLAYING) {
        composer.render();
        return;
      }

      const level = LEVELS[stateRef.current.levelIndex];
      const sides = level.sides;

      if (keys['ArrowLeft'] || keys['KeyA']) {
        stateRef.current.lane += 0.12 * delta;
        if (!level.isClosed) stateRef.current.lane = Math.min(sides - 1, stateRef.current.lane);
        else stateRef.current.lane = (stateRef.current.lane + sides) % sides;
      }
      if (keys['ArrowRight'] || keys['KeyD']) {
        stateRef.current.lane -= 0.12 * delta;
        if (!level.isClosed) stateRef.current.lane = Math.max(0, stateRef.current.lane);
        else stateRef.current.lane = (stateRef.current.lane + sides) % sides;
      }
      
      if (keys['Space']) spawnBullet();
      if ((keys['KeyE'] || keys['ShiftLeft'] || keys['ShiftRight'])) triggerSuperzapper();

      if (stateRef.current.cameraShake > 0) {
        stateRef.current.cameraShake -= 0.05 * delta;
        camera.position.x = originalCameraPos.x + (Math.random() - 0.5) * stateRef.current.cameraShake * 2;
        camera.position.y = originalCameraPos.y + (Math.random() - 0.5) * stateRef.current.cameraShake * 2;
      } else {
        camera.position.copy(originalCameraPos);
      }

      const currentLanePos = stateRef.current.lane + 0.5;
      const playerPos = getShapePoint(currentLanePos, sides, RADIUS, level);
      
      if (level.isClosed) {
        const playerTheta = (currentLanePos / sides) * Math.PI * 2;
        const targetRotation = Math.PI / 2 - playerTheta;
        let diff = targetRotation - levelGroup.rotation.z;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        levelGroup.rotation.z += diff * 0.1 * delta;
      } else {
        levelGroup.rotation.z = THREE.MathUtils.lerp(levelGroup.rotation.z, 0, 0.1 * delta);
      }
      
      playerGroup.position.set(playerPos.x, playerPos.y, 0);
      const deltaL = 0.001;
      const p1 = getShapePoint(currentLanePos - deltaL, sides, RADIUS, level);
      const p2 = getShapePoint(currentLanePos + deltaL, sides, RADIUS, level);
      const surfaceAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      playerGroup.rotation.z = surfaceAngle + Math.PI / 2;

      if (Math.random() < level.enemySpawnRate) spawnEnemy();

      if (stateRef.current.flashIntensity > 0) {
        stateRef.current.flashIntensity -= 0.04 * delta;
        flashMat.opacity = stateRef.current.flashIntensity;
      }

      for (let i = stateRef.current.enemies.length - 1; i >= 0; i--) {
        const enemy = stateRef.current.enemies[i];
        enemy.depth += 0.003 * delta * (1 + enemy.speed);
        
        if (enemy.mesh) {
          const ePos = getShapePoint(enemy.lane + 0.5, sides, RADIUS, level);
          const currentRadius = THREE.MathUtils.lerp(0.1, 1.0, enemy.depth);
          const ez = THREE.MathUtils.lerp(-TUBE_LENGTH, 0, enemy.depth);
          enemy.mesh.position.set(ePos.x * currentRadius, ePos.y * currentRadius, ez);
          
          const e1 = getShapePoint(enemy.lane + 0.5 - deltaL, sides, RADIUS, level);
          const e2 = getShapePoint(enemy.lane + 0.5 + deltaL, sides, RADIUS, level);
          const eAngle = Math.atan2(e2.y - e1.y, e2.x - e1.x);
          enemy.mesh.rotation.z = eAngle + Math.PI / 2;
          
          if (enemy.depth > 0.8) {
            const pulse = Math.sin(time * 0.01) * 0.5 + 0.5;
            ((enemy.mesh.children[0] as THREE.Line).material as THREE.LineBasicMaterial).color.setHex(pulse > 0.5 ? COLORS.DANGER : COLORS.ENEMY);
            enemy.mesh.scale.setScalar(THREE.MathUtils.lerp(1.5, 2.2, (enemy.depth - 0.8) * 5));
          } else {
            enemy.mesh.scale.setScalar(THREE.MathUtils.lerp(0.5, 1.5, enemy.depth));
            ((enemy.mesh.children[0] as THREE.Line).material as THREE.LineBasicMaterial).color.setHex(COLORS.ENEMY);
          }
        }

        if (enemy.depth >= 1.0) {
          onLifeLostRef.current();
          stateRef.current.cameraShake = 0.5;
          if (enemy.mesh) {
            spawnExplosion(enemy.mesh.position, 20);
            levelGroup.remove(enemy.mesh);
          }
          stateRef.current.enemies.splice(i, 1);
        }
      }

      for (let i = stateRef.current.bullets.length - 1; i >= 0; i--) {
        const bullet = stateRef.current.bullets[i];
        bullet.prevDepth = bullet.depth;
        bullet.depth -= 0.04 * delta;
        
        if (bullet.mesh) {
          const bPos = getShapePoint(bullet.lane + 0.5, sides, RADIUS, level);
          const currentRadius = THREE.MathUtils.lerp(0.1, 1.0, bullet.depth);
          const bz = THREE.MathUtils.lerp(-TUBE_LENGTH, 0, bullet.depth);
          bullet.mesh.position.set(bPos.x * currentRadius, bPos.y * currentRadius, bz);
          
          const b1 = getShapePoint(bullet.lane + 0.5 - deltaL, sides, RADIUS, level);
          const b2 = getShapePoint(bullet.lane + 0.5 + deltaL, sides, RADIUS, level);
          const bAngle = Math.atan2(b2.y - b1.y, b2.x - b1.x);
          bullet.mesh.rotation.z = bAngle + Math.PI / 2;
        }

        let hit = false;
        for (let j = stateRef.current.enemies.length - 1; j >= 0; j--) {
          const enemy = stateRef.current.enemies[j];
          if (enemy.lane === bullet.lane) {
            const margin = 0.05;
            if (enemy.depth >= (bullet.depth - margin) && enemy.depth <= (bullet.prevDepth + margin)) {
              onScoreRef.current(100);
              spawnExplosion(enemy.mesh!.position);
              levelGroup.remove(enemy.mesh!);
              levelGroup.remove(bullet.mesh!);
              stateRef.current.enemies.splice(j, 1);
              stateRef.current.bullets.splice(i, 1);
              hit = true;
              break;
            }
          }
        }
        if (!hit && bullet.depth <= -0.1) {
          levelGroup.remove(bullet.mesh!);
          stateRef.current.bullets.splice(i, 1);
        }
      }

      for (let i = stateRef.current.particles.length - 1; i >= 0; i--) {
        const p = stateRef.current.particles[i];
        p.position.add(p.velocity);
        p.life -= 0.02 * delta;
        p.mesh.position.copy(p.position);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life;
        if (p.life <= 0) {
          levelGroup.remove(p.mesh);
          stateRef.current.particles.splice(i, 1);
        }
      }

      composer.render();
    };

    animate(performance.now());

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (containerRef.current) containerRef.current.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default GameCanvas;
