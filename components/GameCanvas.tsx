
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
    r = radius * (1.0 + 0.3 * Math.cos(theta * 4));
  } else if (level.shape === 'zigzag') {
    const x = (lane - (sides - 1) / 2) * (radius * 0.5);
    const wave = Math.abs((lane % 4) - 2); 
    const zigzagY = (wave - 1) * radius * 0.4;
    return { x, y: zigzagY };
  }

  return {
    x: Math.cos(theta) * r,
    y: Math.sin(theta) * r
  };
};

/**
 * Gets a point on the linear segment (chord) between two lane vertices.
 * This ensures entities stay ON the visible lines of the tube.
 */
const getSegmentPoint = (lane: number, sides: number, radius: number, level: LevelConfig) => {
  const laneIdx = Math.floor(lane);
  const t = lane % 1;
  const p1 = getShapePoint(laneIdx, sides, radius, level);
  const p2 = getShapePoint((laneIdx + 1) % sides, sides, radius, level);
  
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t
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
    laneVelocity: 0,
    enemies: [] as Enemy[],
    bullets: [] as BulletInternal[],
    particles: [] as Particle[],
    lastShoot: 0,
    superzapperAvailable: true,
    flashIntensity: 0,
    cameraShake: 0,
    hyperspaceZoom: 1.0,
    currentWorldRotation: Math.PI / 2
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
      const config = LEVELS[levelIndex % LEVELS.length];
      stateRef.current.lane = config.isClosed ? 0 : Math.floor(config.sides / 2);
      stateRef.current.hyperspaceZoom = 1.0;
      stateRef.current.laneVelocity = 0;
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
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
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
      const config = LEVELS[stateRef.current.levelIndex % LEVELS.length];
      const sides = config.sides;
      const geometry = new THREE.BufferGeometry();
      const vertices: number[] = [];

      for (let i = 0; i < sides; i++) {
        const nextIdx = (i + 1) % sides;
        if (!config.isClosed && i === sides - 1) break;

        const p1 = getShapePoint(i, sides, RADIUS, config);
        const p2 = getShapePoint(nextIdx, sides, RADIUS, config);
        
        vertices.push(p1.x, p1.y, 0, p2.x, p2.y, 0);
        vertices.push(p1.x, p1.y, 0, p1.x * 0.1, p1.y * 0.1, -TUBE_LENGTH);
        vertices.push(p1.x * 0.1, p1.y * 0.1, -TUBE_LENGTH, p2.x * 0.1, p2.y * 0.1, -TUBE_LENGTH);
        
        if (!config.isClosed && i === sides - 2) {
           vertices.push(p2.x, p2.y, 0, p2.x * 0.1, p2.y * 0.1, -TUBE_LENGTH);
        }
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      tubeLines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: config.color, transparent: true, opacity: 0.8 }));
      levelGroup.add(tubeLines);
    };

    updateLevelVisuals();

    const playerGroup = new THREE.Group();
    // V-ARROW SHAPE: Classic Tempest claw pointing toward local (0,0,0) center
    // Centered so wings are at Y=0 and tip is at Y=-1.8 (inward)
    const playerGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.5, 0, 0),    // Wing Left
      new THREE.Vector3(0, -1.8, 0),    // Tip (pointing to center)
      new THREE.Vector3(1.5, 0, 0),     // Wing Right
      new THREE.Vector3(0, -0.9, 0),    // Notch
      new THREE.Vector3(-1.5, 0, 0)     // Close loop
    ]);
    const playerMesh = new THREE.Line(playerGeo, new THREE.LineBasicMaterial({ color: COLORS.PLAYER, linewidth: 2.5 }));
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
      const sides = LEVELS[stateRef.current.levelIndex % LEVELS.length].sides;
      const lane = Math.floor(Math.random() * sides);
      const group = new THREE.Group();
      const enemyGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.8, 0, 0),
        new THREE.Vector3(0, 1.1, 0),
        new THREE.Vector3(0.8, 0, 0),
        new THREE.Vector3(0, -0.4, 0),
        new THREE.Vector3(-0.8, 0, 0)
      ]);
      const mesh = new THREE.Line(enemyGeo, new THREE.LineBasicMaterial({ color: COLORS.ENEMY }));
      group.add(mesh);
      levelGroup.add(group);
      stateRef.current.enemies.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'flipper',
        lane,
        depth: 0,
        speed: LEVELS[stateRef.current.levelIndex % LEVELS.length].enemySpeed,
        mesh: group
      });
    };

    const spawnBullet = () => {
      const now = Date.now();
      if (now - stateRef.current.lastShoot < 50) return;
      stateRef.current.lastShoot = now;
      const bulletGeo = new THREE.BoxGeometry(0.25, 0.25, 3);
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
            (Math.random() - 0.5) * 2.0,
            (Math.random() - 0.5) * 2.0,
            (Math.random() - 0.5) * 2.0
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
      stateRef.current.laneVelocity = 0;
      updateLevelVisuals();
    };

    let frameId: number;
    let lastTime = performance.now();
    let currentLevelIdx = levelIndex;

    const animate = (time: number) => {
      frameId = requestAnimationFrame(animate);
      const delta = (time - lastTime) / 16.67;
      lastTime = time;

      if (currentLevelIdx !== stateRef.current.levelIndex) {
        currentLevelIdx = stateRef.current.levelIndex;
        resetLevel();
      }

      if (stateRef.current.gameState === GameState.LEVEL_COMPLETE) {
        stateRef.current.hyperspaceZoom += 0.1 * delta;
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

      const level = LEVELS[stateRef.current.levelIndex % LEVELS.length];
      const sides = level.sides;

      const accel = 0.025 * delta;
      const friction = 0.85;
      
      if (keys['ArrowLeft'] || keys['KeyA']) {
        stateRef.current.laneVelocity += accel;
      } else if (keys['ArrowRight'] || keys['KeyD']) {
        stateRef.current.laneVelocity -= accel;
      } else {
        const laneFraction = stateRef.current.lane % 1;
        const pull = (0.5 - laneFraction) * 0.01 * delta;
        stateRef.current.laneVelocity += pull;
        stateRef.current.laneVelocity *= friction;
      }
      
      const maxVel = 0.18;
      stateRef.current.laneVelocity = Math.max(-maxVel, Math.min(maxVel, stateRef.current.laneVelocity));
      
      stateRef.current.lane += stateRef.current.laneVelocity * delta;

      if (!level.isClosed) {
        if (stateRef.current.lane < 0) {
          stateRef.current.lane = 0;
          stateRef.current.laneVelocity = 0;
        } else if (stateRef.current.lane > sides - 1.0001) {
          stateRef.current.lane = sides - 1.0001;
          stateRef.current.laneVelocity = 0;
        }
      } else {
        stateRef.current.lane = (stateRef.current.lane + sides) % sides;
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

      // POSITIONS: Using getSegmentPoint (middle of lane chord)
      const currentLanePos = stateRef.current.lane + 0.5;
      const playerPos = getSegmentPoint(currentLanePos, sides, RADIUS, level);
      
      if (level.isClosed) {
        const targetTheta = (currentLanePos / sides) * Math.PI * 2;
        const targetRotation = Math.PI / 2 - targetTheta;
        let diff = targetRotation - levelGroup.rotation.z;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        levelGroup.rotation.z += diff * 0.03 * delta;
      } else {
        levelGroup.rotation.z = THREE.MathUtils.lerp(levelGroup.rotation.z, 0, 0.02 * delta); 
      }
      
      playerGroup.position.set(playerPos.x, playerPos.y, 0);
      
      // ORIENTATION: Face the center (0,0) exactly
      const angleToCenter = Math.atan2(-playerPos.y, -playerPos.x);
      // Since ship is defined pointing toward Tip (at local -Y), 
      // we align local Y axis with the vector to center.
      const bankFactor = stateRef.current.laneVelocity * 1.5;
      playerGroup.rotation.z = angleToCenter + Math.PI / 2 + bankFactor;

      if (Math.random() < level.enemySpawnRate) spawnEnemy();

      if (stateRef.current.flashIntensity > 0) {
        stateRef.current.flashIntensity -= 0.04 * delta;
        flashMat.opacity = stateRef.current.flashIntensity;
      } else {
        flashMat.opacity = 0;
      }

      for (let i = stateRef.current.enemies.length - 1; i >= 0; i--) {
        const enemy = stateRef.current.enemies[i];
        enemy.depth += 0.0035 * delta * (1 + enemy.speed);
        
        if (enemy.mesh) {
          const ePos = getSegmentPoint(enemy.lane + 0.5, sides, RADIUS, level);
          const currentRadius = THREE.MathUtils.lerp(0.1, 1.0, enemy.depth);
          const ez = THREE.MathUtils.lerp(-TUBE_LENGTH, 0, enemy.depth);
          enemy.mesh.position.set(ePos.x * currentRadius, ePos.y * currentRadius, ez);
          
          // Enemies point "out" from center
          enemy.mesh.rotation.z = Math.atan2(ePos.y, ePos.x) + Math.PI / 2;
          
          if (enemy.depth > 0.8) {
            const pulse = Math.sin(time * 0.015) * 0.5 + 0.5;
            ((enemy.mesh.children[0] as THREE.Line).material as THREE.LineBasicMaterial).color.setHex(pulse > 0.5 ? COLORS.DANGER : COLORS.ENEMY);
            enemy.mesh.scale.setScalar(THREE.MathUtils.lerp(1.5, 2.5, (enemy.depth - 0.8) * 5));
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
        bullet.depth -= 0.045 * delta;
        
        if (bullet.mesh) {
          const bPos = getSegmentPoint(bullet.lane + 0.5, sides, RADIUS, level);
          const currentRadius = THREE.MathUtils.lerp(0.1, 1.0, bullet.depth);
          const bz = THREE.MathUtils.lerp(-TUBE_LENGTH, 0, bullet.depth);
          bullet.mesh.position.set(bPos.x * currentRadius, bPos.y * currentRadius, bz);
          bullet.mesh.rotation.z = Math.atan2(bPos.y, bPos.x) + Math.PI / 2;
        }

        let hit = false;
        for (let j = stateRef.current.enemies.length - 1; j >= 0; j--) {
          const enemy = stateRef.current.enemies[j];
          if (enemy.lane === bullet.lane) {
            const margin = 0.15;
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
        p.life -= 0.025 * delta;
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
