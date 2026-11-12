import * as THREE from "three";
import { loadClayTerrain } from "./load-clay.js";
import { makeProceduralIsland } from "./procedural-island.js";
import { mirrorCssScaleX } from "./geometry.js";

export function createHologramViewer({ canvas, reduceMotion = false }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 500);
  // High three-quarter view so the island reads as a floating object in the bowl.
  camera.position.set(0, 120, 150);
  camera.lookAt(0, 0, 0);

  const hemi = new THREE.HemisphereLight(0xe8f2ff, 0x0a1018, 1.35);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  key.position.set(55, 110, 35);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xb9d7ff, 0.45);
  fill.position.set(-40, 50, 60);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x7ec8ff, 0.65);
  rim.position.set(-60, 40, -50);
  scene.add(rim);

  const pivot = new THREE.Group();
  pivot.name = "ghost-pivot";
  scene.add(pivot);

  let content = null;
  let spinning = !reduceMotion;
  let raf = 0;
  let last = performance.now();

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (spinning && content) content.rotation.y += dt * 0.28;
    renderer.render(scene, camera);
  }

  function clearContent() {
    if (!content) return;
    pivot.remove(content);
    content.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
    content = null;
  }

  function mount(loaded) {
    content = loaded.root;
    pivot.add(content);
    return loaded.manifest;
  }

  async function showResort(resortId, assetBase = "/clay_scenes") {
    clearContent();
    try {
      return mount(await loadClayTerrain(THREE, { resortId, assetBase }));
    } catch (err) {
      console.warn("[hologram] clay load failed, using procedural island", err);
      return mount(makeProceduralIsland(THREE));
    }
  }

  function showProcedural() {
    clearContent();
    return mount(makeProceduralIsland(THREE));
  }

  function setMirrored(enabled) {
    canvas.classList.toggle("is-mirrored", Boolean(enabled));
    canvas.style.transform = mirrorCssScaleX(Boolean(enabled));
  }

  function setSpinning(enabled) {
    spinning = Boolean(enabled) && !reduceMotion;
  }

  resize();
  window.addEventListener("resize", resize);
  raf = requestAnimationFrame(frame);

  return {
    showResort,
    showProcedural,
    setMirrored,
    setSpinning,
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      clearContent();
      renderer.dispose();
    },
  };
}
