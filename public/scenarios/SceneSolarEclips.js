import { Planet } from '../planet.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * 개기일식 장면을 초기화합니다. (Sun -> Moon -> Earth 정렬)
 * @returns {Object} { planets: Planet[], cameraPosition: {x, y, z}, setupControls }
 */
export function initSolarEclipseScene(scene, world, loader, aiData, ambientLight) {
  console.log("🌑 [SceneSolarEclipse] 함수 실행되었습니다.");

  const planets = [];
  const SCENARIO_TYPE = 'solar_eclipse';

  // --- 설정 상수 ---
  const SCALE_DISTANCE = 30;
  const SCALE_SIZE = 1;

  // --- 기본 천체 데이터 ---
  const sunData = { name: 'Sun', textureKey: 'Sun', size: SCALE_SIZE * 20 };
  const earthData = { name: 'Earth', textureKey: 'Earth', size: SCALE_SIZE * 1.5 };
  const moonData = { name: 'Moon', textureKey: 'Moon', size: SCALE_SIZE * 0.5 };

  // --- 1. 위치/속도 설정 (일식 정렬) ---
  sunData.position = { x: 0, y: 0, z: -SCALE_DISTANCE * 10 };
  sunData.velocity = { x: 0, y: 0, z: 0 };

  earthData.position = { x: 0, y: 0, z: 0 };
  earthData.velocity = { x: 0, y: 0, z: 0 };

  moonData.position = { x: 0, y: 0, z: -SCALE_SIZE * 5 };
  moonData.velocity = { x: 0, y: 0, z: 0 };

  // --- 2. 행성 생성 ---
  const sun = new Planet(scene, world, loader, sunData, SCENARIO_TYPE);
  const earth = new Planet(scene, world, loader, earthData, SCENARIO_TYPE);
  const moon = new Planet(scene, world, loader, moonData, SCENARIO_TYPE);

  planets.push(sun, earth, moon);

  // --- 2-1. 태양 광원(시나리오 전용) ---
  const eclipseLight = new THREE.DirectionalLight(0xffffff, 3);
  eclipseLight.castShadow = true;

  if (sun.body) eclipseLight.position.copy(sun.body.position);
  else eclipseLight.position.set(sunData.position.x, sunData.position.y, sunData.position.z);

  eclipseLight.target.position.set(0, 0, 0);
  eclipseLight.userData.__scenarioLight = true;
  eclipseLight.target.userData.__scenarioLight = true;

  scene.add(eclipseLight);
  scene.add(eclipseLight.target);

  if (moon.mesh) moon.mesh.castShadow = true;
  if (earth.mesh) earth.mesh.receiveShadow = true;

  // --- 3. 카메라 설정 ---
  const cameraPosition = { x: 0, y: SCALE_SIZE * 10, z: SCALE_DISTANCE * 3 };

  const setupControls = (camera, controls, ambientLightFromMain) => {
    let active = true;
    let rafId = null;
    let timeoutId = null;
    let isPlaying = false; // Enter 연타 방지(선택)

    const lightRef = ambientLightFromMain || ambientLight;

    const animateBrightness = (targetIntensity, duration) => {
      if (!lightRef) return;

      const startIntensity = lightRef.intensity;
      const startTime = performance.now();

      const animate = (time) => {
        if (!active) return;

        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1.0);

        lightRef.intensity = startIntensity + (targetIntensity - startIntensity) * progress;

        if (progress < 1.0) {
          rafId = requestAnimationFrame(animate);
        }
      };

      rafId = requestAnimationFrame(animate);
    };

    const handleKeydown = (event) => {
      if (!active) return;

      // ✅ inputField Enter(장면 생성)과 충돌 방지: 타이핑 중이면 무시
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (event.key !== 'Enter') return;
      if (isPlaying) return; // Enter 연타 방지(선택)

      if (!earth.mesh || !moon.body) {
        console.warn("⚠️ 행성 Mesh/Body가 정의되지 않아 카메라 이동/애니메이션 불가.");
        return;
      }

      isPlaying = true;

      // 1. 초기 위치 설정
      moon.body.position = new CANNON.Vec3(5, 0, -SCALE_SIZE * 5);

      // 2. 카메라/컨트롤
      const earthPos = earth.mesh.position;
      camera.position.set(earthPos.x, earthPos.y, earthPos.z);

      controls.target.set(sunData.position.x, sunData.position.y, sunData.position.z);
      controls.update();

      // 3. 밝기 감소
      const INITIAL_FADE_DURATION = 12000;
      animateBrightness(0.1, INITIAL_FADE_DURATION);

      // 4. 달 이동
      const MOON_SPEED = 0.5;
      const DISTANCE_TO_COVER = 6;

      moon.body.velocity = new CANNON.Vec3(-MOON_SPEED, 0, 0);

      // 5. 종료 후 밝기 복구 예약
      const MOVE_TIME_SECONDS = DISTANCE_TO_COVER / MOON_SPEED;
      const TOTAL_DELAY_MS = (MOVE_TIME_SECONDS * 1000) + INITIAL_FADE_DURATION;

      timeoutId = window.setTimeout(() => {
        if (!active) return;
        animateBrightness(1.0, 3000);
        isPlaying = false;
      }, TOTAL_DELAY_MS);

      console.log("📸 카메라 이동 및 일식 애니메이션 시작.");
    };

    window.addEventListener('keydown', handleKeydown);

    // ✅ Scene 종료 시 정리
    return () => {
      active = false;

      window.removeEventListener('keydown', handleKeydown);

      if (rafId != null) cancelAnimationFrame(rafId);
      if (timeoutId != null) clearTimeout(timeoutId);

      // 시나리오 라이트 제거
      scene.remove(eclipseLight);
      scene.remove(eclipseLight.target);

      console.log("🧹 일식 Scene 컨트롤이 정리되었습니다.");
    };
  };

  return {
    planets,
    cameraPosition,
    setupControls,
  };
}
