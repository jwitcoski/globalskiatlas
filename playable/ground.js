/** Procedural ground: puffy snow / mottled dirt on one terrain material, plus rocks and sticks on bare dirt. No texture files. */

const TEX = 256;
const SNOW_MACRO_M = 9;
const SNOW_MICRO_M = 1.4;
const SNOW_DISP_M = 40;
const DIRT_MACRO_M = 24;
const DIRT_MICRO_M = 1.7;
const DIRT_BROAD_M = 67;
const SPARKLE = 0.55;
const DISP = 0.07;

function hash4(i, j, k, seed) {
  let n = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1440662683) ^ Math.imul(seed, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Tileable value-noise fbm on a size² grid, normalized to 0..1. Billow = |2v-1|: round puffs, sharp creases. */
function fbm(size, cells, octaves, billow, seed) {
  const out = new Float32Array(size * size);
  let amp = 1;
  for (let o = 0; o < octaves; o++) {
    const c = cells << o;
    const lat = (i, j) => hash4(i % c, j % c, o, seed);
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * c;
      const y0 = Math.floor(fy);
      const ty = (fy - y0) * (fy - y0) * (3 - 2 * (fy - y0));
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * c;
        const x0 = Math.floor(fx);
        const tx = (fx - x0) * (fx - x0) * (3 - 2 * (fx - x0));
        const a = lat(x0, y0) + (lat(x0 + 1, y0) - lat(x0, y0)) * tx;
        const b = lat(x0, y0 + 1) + (lat(x0 + 1, y0 + 1) - lat(x0, y0 + 1)) * tx;
        const v = a + (b - a) * ty;
        out[y * size + x] += (billow ? Math.abs(v * 2 - 1) : v) * amp;
      }
    }
    amp *= 0.5;
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of out) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) / (hi - lo || 1);
  return out;
}

/** RGBA8: RG = -slope (x, z) of the height, B = height, A = a coarser independent fbm (dirt mottle). */
export function bakeGround(size, cells, octaves, billow, seed) {
  const h = fbm(size, cells, octaves, billow, seed);
  const mottle = fbm(size, Math.max(1, cells >> 2), 3, false, seed + 7);
  const sx = new Float32Array(size * size);
  const sz = new Float32Array(size * size);
  let max = 1e-6;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      sx[i] = h[y * size + ((x + 1) % size)] - h[y * size + ((x + size - 1) % size)];
      sz[i] = h[((y + 1) % size) * size + x] - h[((y + size - 1) % size) * size + x];
      max = Math.max(max, Math.abs(sx[i]), Math.abs(sz[i]));
    }
  }
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = Math.round(128 - (sx[i] / max) * 127);
    data[i * 4 + 1] = Math.round(128 - (sz[i] / max) * 127);
    data[i * 4 + 2] = Math.round(h[i] * 255);
    data[i * 4 + 3] = Math.round(mottle[i] * 255);
  }
  return { data, mottle };
}

let ground = null;

function groundTextures(THREE) {
  if (ground) return ground;
  const tex = (baked) => {
    const t = new THREE.DataTexture(baked.data, TEX, TEX, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  };
  const snow = bakeGround(TEX, 8, 5, true, 1);
  const dirt = bakeGround(TEX, 16, 5, false, 2);
  ground = { snow: tex(snow), dirt: tex(dirt), mottle: dirt.mottle };
  return ground;
}

const f = (v) => v.toFixed(1);

/**
 * One material for terrain and piste drapes. uDirt = 0: puffy snow (lumpy normals, cavity AO, sun glints,
 * near-camera bumps). uDirt = 1: mottled dirt. World-locked, so every mesh using it lines up seamlessly.
 */
export function snowTerrainMaterial(THREE, opts = {}) {
  const tex = groundTextures(THREE);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xfbfaf6,
    roughness: 0.87,
    metalness: 0,
    side: THREE.DoubleSide,
    ...opts,
  });
  const u = {
    uSnowTex: { value: tex.snow },
    uDirtTex: { value: tex.dirt },
    uDirt: { value: 0 },
    uSparkle: { value: SPARKLE },
    uDisp: { value: DISP },
  };
  mat.userData.ground = u;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform sampler2D uSnowTex;
        uniform float uDirt, uDisp;
        varying vec3 vGroundW;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vGroundW = (modelMatrix * vec4(transformed, 1.0)).xyz;
        /* Up-only, so drapes never sink under the terrain they sit on. Coarse lod: the meshes are ~3.5 m grids. */
        float gFade = (1.0 - uDirt) * (1.0 - smoothstep(18.0, 42.0, distance(vGroundW, cameraPosition)));
        if (gFade > 0.0) transformed.y += textureLod(uSnowTex, vGroundW.xz / ${f(SNOW_DISP_M)}, 4.0).b * uDisp * gFade;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform sampler2D uSnowTex, uDirtTex;
        uniform float uDirt, uSparkle;
        varying vec3 vGroundW;
        float gHash(vec2 p){
          vec3 q = fract(vec3(p.xyx) * 0.1031);
          q += dot(q, q.yzx + 33.33);
          return fract((q.x + q.y) * q.z);
        }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        bool gDirt = uDirt > 0.5;
        vec4 gA = gDirt ? texture2D(uDirtTex, vGroundW.xz / ${f(DIRT_MACRO_M)}) : texture2D(uSnowTex, vGroundW.xz / ${f(SNOW_MACRO_M)});
        vec4 gB = gDirt ? texture2D(uDirtTex, vGroundW.xz / ${f(DIRT_MICRO_M)}) : texture2D(uSnowTex, vGroundW.xz / ${f(SNOW_MICRO_M)});
        if (gDirt) {
          /* Second, rotated, non-multiple scale so the 24 m tile never lines up with itself. */
          vec2 gRot = mat2(0.8, -0.6, 0.6, 0.8) * vGroundW.xz;
          float gMottle = gA.a * 0.55 + texture2D(uDirtTex, gRot / ${f(DIRT_BROAD_M)}).a * 0.45;
          float m = gMottle * 0.7 + gB.b * 0.3;
          vec3 base = diffuseColor.rgb;
          diffuseColor.rgb = mix(base * vec3(0.55, 0.47, 0.40), base, smoothstep(0.28, 0.52, m));
          diffuseColor.rgb = mix(diffuseColor.rgb, base * vec3(1.14, 1.08, 0.96), smoothstep(0.58, 0.82, m));
          diffuseColor.rgb *= 0.82 + 0.18 * gB.b;
        } else {
          float cav = smoothstep(0.05, 0.6, gA.b * 0.45 + gB.b * 0.55);
          diffuseColor.rgb *= mix(vec3(0.72, 0.79, 0.90), vec3(1.0), cav);
        }`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        {
          vec2 gSlope = gDirt ? (gA.rg - 0.5) * 0.5 + (gB.rg - 0.5) * 1.3 : (gA.rg - 0.5) * 1.2 + (gB.rg - 0.5) * 1.1;
          vec3 gN = (vec4(normal, 0.0) * viewMatrix).xyz;
          gN.xz += gSlope * gN.y;
          normal = normalize((viewMatrix * vec4(gN, 0.0)).xyz);
        }`,
      )
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
        #if NUM_DIR_LIGHTS > 0
        /* Each grain is a tiny mirror with a random tilt: it flashes only when it bisects sun and eye, so it twinkles as you move. */
        float gSpark = (1.0 - uDirt) * (1.0 - smoothstep(6.0, 30.0, length(vViewPosition)));
        if (gSpark > 0.002) {
          vec2 grid = vGroundW.xz * 7.0;
          vec2 hc = mod(floor(grid), 512.0);
          float grain = 1.0 - smoothstep(0.08, 0.22, length(fract(grid) - vec2(gHash(hc + 7.3), gHash(hc + 19.1))));
          vec3 jit = vec3(gHash(hc + 3.1), gHash(hc + 5.7), gHash(hc + 11.3)) - 0.5;
          vec3 facet = normalize(normal + (viewMatrix * vec4(jit, 0.0)).xyz * 1.1);
          vec3 H = normalize(directionalLights[0].direction + normalize(vViewPosition));
          gl_FragColor.rgb += vec3(0.9, 0.95, 1.0) * pow(max(dot(facet, H), 0.0), 220.0) * grain * gSpark * uSparkle * 4.0;
        }
        #endif`,
      );
  };
  return mat;
}

const SC_CELL = 1.5;
const SC_R = 50;
const SC_STICK_R = 28;
const SC_MOVE = 6;
const MAX_ROCKS = 1200;
const MAX_STICKS = 300;

function texel(m, u, v) {
  const ix = ((Math.floor(u * TEX) % TEX) + TEX) % TEX;
  const iy = ((Math.floor(v * TEX) % TEX) + TEX) % TEX;
  return m[iy * TEX + ix];
}

/** CPU twin of the shader's gMottle, so rocks gather in the dark soil the player sees. */
function mottleAt(m, x, z) {
  return texel(m, x / DIRT_MACRO_M, z / DIRT_MACRO_M) * 0.55 + texel(m, (0.8 * x + 0.6 * z) / DIRT_BROAD_M, (0.8 * z - 0.6 * x) / DIRT_BROAD_M) * 0.45;
}

/** 0 none, 1 rock, 2 stick. Per world cell, so nothing reshuffles as the camera moves; thins out toward SC_R. */
export function scatterPick(ix, iz, dist, stony) {
  const near = 1 - dist / SC_R;
  if (near <= 0) return 0;
  const r = hash4(ix, iz, 3, 9);
  const pRock = (0.05 + 0.45 * stony * stony) * (0.3 + 0.7 * near);
  if (r < pRock) return 1;
  if (dist < SC_STICK_R && r < pRock + 0.06 * (1 - stony)) return 2;
  return 0;
}

export function makeGroundScatter(THREE, scene) {
  const rockGeo = new THREE.IcosahedronGeometry(0.5, 0);
  const p = rockGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = 0.75 + 0.5 * hash4(Math.round(x * 97), Math.round(y * 97), Math.round(z * 97), 5);
    p.setXYZ(i, x * k, y * k * 0.65, z * k);
  }
  rockGeo.computeVertexNormals();
  const stickGeo = new THREE.CylinderGeometry(0.028, 0.04, 1, 5).rotateZ(Math.PI / 2);
  const mat = new THREE.MeshLambertMaterial({ flatShading: true });
  const rocks = new THREE.InstancedMesh(rockGeo, mat, MAX_ROCKS);
  const sticks = new THREE.InstancedMesh(stickGeo, mat, MAX_STICKS);
  const c = new THREE.Color();
  for (const m of [rocks, sticks]) {
    m.count = 0;
    m.visible = false;
    m.frustumCulled = false;
    m.receiveShadow = true;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.setColorAt(0, c);
    scene.add(m);
  }
  rocks.castShadow = true;
  rocks.name = "ground-rocks";
  sticks.name = "ground-sticks";
  return {
    rocks,
    sticks,
    cache: new Map(),
    cx: Infinity,
    cz: Infinity,
    run: null,
    level: null,
    o: new THREE.Object3D(),
    n: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
    q: new THREE.Quaternion(),
    e: new THREE.Euler(),
    c,
    THREE,
  };
}

/**
 * Refill rocks/sticks around pos every SC_MOVE meters. bareAt(x, z) is the same on-snow test physics uses;
 * results are cached per cell until the run or snow level changes. level = null hides the scatter.
 */
export function updateGroundScatter(sc, pos, hf, bareAt, run, level) {
  const on = !!level && !!hf;
  sc.rocks.visible = sc.sticks.visible = on;
  if (!on) return;
  if (sc.run !== run || sc.level !== level) {
    sc.cache.clear();
    sc.run = run;
    sc.level = level;
    sc.cx = Infinity;
  }
  if (Math.hypot(pos.x - sc.cx, pos.z - sc.cz) < SC_MOVE) return;
  sc.cx = pos.x;
  sc.cz = pos.z;
  const { rocks, sticks, o, n, up, q, e, c, THREE } = sc;
  const mottle = groundTextures(THREE).mottle;
  let nr = 0;
  let ns = 0;
  const i0 = Math.floor((pos.x - SC_R) / SC_CELL);
  const i1 = Math.floor((pos.x + SC_R) / SC_CELL);
  const k0 = Math.floor((pos.z - SC_R) / SC_CELL);
  const k1 = Math.floor((pos.z + SC_R) / SC_CELL);
  for (let ix = i0; ix <= i1; ix++) {
    for (let iz = k0; iz <= k1; iz++) {
      const x = (ix + hash4(ix, iz, 1, 9)) * SC_CELL;
      const z = (iz + hash4(ix, iz, 2, 9)) * SC_CELL;
      const kind = scatterPick(ix, iz, Math.hypot(x - pos.x, z - pos.z), 1 - mottleAt(mottle, x, z));
      if (!kind || (kind === 1 ? nr >= MAX_ROCKS : ns >= MAX_STICKS)) continue;
      // ponytail: cache grows along the run (~50k cells for a long course); clear by distance if memory bites.
      const key = ix * 131072 + iz;
      let bare = sc.cache.get(key);
      if (bare === undefined) sc.cache.set(key, (bare = bareAt(x, z)));
      if (!bare) continue;
      const h1 = hash4(ix, iz, 4, 9);
      const h2 = hash4(ix, iz, 5, 9);
      hf.normal(THREE, x, z, n);
      q.setFromUnitVectors(up, n);
      const y = hf.sample(x, z);
      if (kind === 1) {
        const s = 0.22 + h1 * h1 * h1 * 1.1;
        e.set((h2 - 0.5) * 0.6, h1 * 6.283, (h1 - 0.5) * 0.6);
        o.quaternion.setFromEuler(e).premultiply(q);
        o.scale.set(s * (0.8 + h2 * 0.5), s, s * (1.3 - h2 * 0.5));
        o.position.set(x, y, z).addScaledVector(n, 0.1 * s);
        o.updateMatrix();
        rocks.setMatrixAt(nr, o.matrix);
        c.setRGB(0.27 + h2 * 0.07, 0.24 + h2 * 0.04, 0.21).multiplyScalar(0.75 + h1 * 0.45);
        rocks.setColorAt(nr++, c);
      } else {
        const t = 0.7 + h2 * 0.6;
        e.set(0, h1 * 6.283, (h2 - 0.5) * 0.12);
        o.quaternion.setFromEuler(e).premultiply(q);
        o.scale.set(0.35 + h1 * 1.1, t, t);
        o.position.set(x, y, z).addScaledVector(n, 0.02 * t);
        o.updateMatrix();
        sticks.setMatrixAt(ns, o.matrix);
        c.setRGB(0.3 + h1 * 0.1, 0.2 + h1 * 0.06, 0.12);
        sticks.setColorAt(ns++, c);
      }
    }
  }
  rocks.count = nr;
  sticks.count = ns;
  for (const m of [rocks, sticks]) {
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor.needsUpdate = true;
  }
}

function selfCheck() {
  const ok = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };
  const s = 32;
  const { data } = bakeGround(s, 4, 3, true, 1);
  let seam = 0;
  let inner = 0;
  for (let y = 0; y < s; y++) {
    seam = Math.max(seam, Math.abs(data[(y * s + s - 1) * 4 + 2] - data[y * s * 4 + 2]));
    inner = Math.max(inner, Math.abs(data[(y * s + 1) * 4 + 2] - data[y * s * 4 + 2]));
  }
  ok(seam <= inner * 1.5 + 2, `height not tileable: seam ${seam} vs inner ${inner}`);
  let flat = 0;
  for (let i = 0; i < s * s; i++) flat += Math.abs(data[i * 4] - 128) + Math.abs(data[i * 4 + 1] - 128);
  ok(flat / (s * s) > 8, "slopes are flat");
  ok(scatterPick(3, 4, 10, 0.5) === scatterPick(3, 4, 10, 0.5), "pick not deterministic");
  ok(scatterPick(3, 4, SC_R + 1, 1) === 0, "pick beyond radius");
  let near = 0;
  let far = 0;
  let farSticks = 0;
  for (let i = 0; i < 4000; i++) {
    near += scatterPick(i, 7, 5, 0.6) ? 1 : 0;
    far += scatterPick(i, 7, 45, 0.6) ? 1 : 0;
    farSticks += scatterPick(i, 7, SC_STICK_R + 1, 0) === 2 ? 1 : 0;
  }
  ok(near > far * 1.5, `LOD thinning ${near} vs ${far}`);
  ok(farSticks === 0, "sticks past stick radius");
  console.log("ground.js ok");
}

const argv1 = typeof process !== "undefined" ? String(process.argv?.[1] || "").replace(/\\/g, "/") : "";
if (argv1.endsWith("/ground.js")) selfCheck();
