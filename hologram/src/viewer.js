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

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 500);
  camera.position.set(0, 70, 145);
  camera.lookAt(0, 4, 0);

  const hemi = new THREE.HemisphereLight(0xdbe7ff, 0x101820, 1.15);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(40, 80, 20);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ad7ff, 0.55);
  rim.position.set(-50, 30, -40);
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
