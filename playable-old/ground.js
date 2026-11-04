/** Procedural ground: puffy snow / mottled dirt on one terrain material, plus rocks and sticks on bare dirt. No texture files. */


const TEX = 256;
const SNOW_MACRO_M = 9;
const SNOW_MICRO_M = 1.4;
const SNOW_BROAD_M = 37;
const DIRT_MACRO_M = 24;
const DIRT_MICRO_M = 1.7;
const DIRT_BROAD_M = 67;
const SPARKLE = 0.55;
const SPARKLE_DENSITY = 0.5;
const GRAIN = 1.4;
/* Fine albedo grain dies with gNear. Same window the ribs already use up close. */
const GRAIN_FADE_NEAR = 18;
const GRAIN_FADE_FAR = 50;
const SHADOW_TINT = 0xc0d3ea;
const SHADOW_TINT_AMT = 0.8;
/* Piste melt fringe (width SNOW_FRINGE_M in snow.js): how deep holes eat in (0..1 of the fringe), and thin-snow tint. */
const EDGE_REACH = 0.9;
const EDGE_THIN = "0.8, 0.74, 0.66";
/* Surface look. Corduroy and ice are the same fall-line ribs; ice glazes them. Powder is broad pillows. */
export const SURFACE_UNIFORM = { plain: 0, corduroy: 1, ice: 2, powder: 3 };
const RIB_M = 0.4;
const RIB_SLOPE = 0.9;
const RIB_SHADE = "0.78, 0.84, 0.94";
/* Groomer lanes: one pass is ~5 m wide; the seam between passes is a small berm and the passes alternate
   direction, so neighbouring lanes catch the sun a little differently. These read from the overview
   long after the ribs are sub-pixel. */
const LANE_M = 5.2;
const SEAM_M = 0.3;
const SEAM_SLOPE = 0.7;
const SEAM_SHADE = "0.86, 0.90, 0.97";
const LANE_ALT = 0.975;
const PILLOW_M = 3.2;
const PILLOW_SLOPE = 1.7;
const PILLOW_SHADE = "0.76, 0.83, 0.95";

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
let detail = 1;
const liveGround = new Set();

/** 0 skips cell glints. Coarse pointers set this before the material is built. */
export function setGroundDetail(v) {
  detail = v ? 1 : 0;
  for (const u of liveGround) u.uDetail.value = detail;
}

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
 * One material for terrain and piste drapes. uDirt = 0: puffy snow (lumpy normals, cavity AO, sun glints).
 * uDirt = 1: mottled dirt. World-locked, so every mesh using it lines up seamlessly.
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
    uGrain: { value: GRAIN },
    uShadowTint: { value: new THREE.Color(SHADOW_TINT) },
    uShadowAmt: { value: SHADOW_TINT_AMT },
    uEdge: { value: 1 },
    uSurface: { value: SURFACE_UNIFORM.plain },
    uDetail: { value: detail },
    uDirtFrac: { value: 0 },
    uDirtColor: { value: new THREE.Color(0xc4a882) },
  };
  liveGround.add(u);
  mat.userData.ground = u;
  /* MeshStandardMaterial has no defaultAttributeValues; ShaderMaterial does.
     r160 binds these when a mesh never got a depth sample, or the draw aborts mid-frame. */
  mat.defaultAttributeValues = Object.assign(mat.defaultAttributeValues || {
    color: [1, 1, 1],
    uv: [0, 0],
    uv1: [0, 0],
  }, {
    snowRough: [0],
    snowWorn: [0],
  });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    /* No vertex displacement: skis and ski-wake sit on the DEM height, so any raise buries them. */
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vGroundW;\nattribute float snowRough;\nattribute float snowWorn;\nvarying float vSnowRough;\nvarying float vSnowWorn;\n#ifdef SNOW_EDGE\nattribute float snowEdge;\nattribute vec3 rib;\nvarying float vSnowEdge;\nvarying vec3 vRib;\n#endif",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n\tvGroundW = (modelMatrix * vec4(transformed, 1.0)).xyz;\n\tvSnowRough = snowRough;\n\tvSnowWorn = snowWorn;\n#ifdef SNOW_EDGE\n\tvSnowEdge = snowEdge;\n\tvRib = rib;\n#endif",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform sampler2D uSnowTex, uDirtTex;
        uniform float uDirt, uSparkle, uGrain, uShadowAmt, uEdge,         uSurface, uDetail, uDirtFrac;
                uniform vec3 uShadowTint, uDirtColor;
        varying vec3 vGroundW;
        varying float vSnowRough;
        varying float vSnowWorn;
        #ifdef SNOW_EDGE
        varying float vSnowEdge;
        varying vec3 vRib;
        #endif
        float gHash(vec2 p){
          vec3 q = fract(vec3(p.xyx) * 0.1031);
          q += dot(q, q.yzx + 33.33);
          return fract((q.x + q.y) * q.z);
        }
        /* World-space snowflake cells. One hashed offset, one hashed normal, a ~1px flash when the half-vector lines up. */
        float surfGlint(vec3 worldPos, vec3 n, vec3 h, float cellSize, float spread, vec3 dPx, vec3 dPy, float density){
          vec2 g = worldPos.xz / cellSize;
          vec2 cell = floor(g);
          if (gHash(cell + 1.7) > density) return 0.0;
          vec2 fw = vec2(length(vec2(dPx.x, dPy.x)), length(vec2(dPx.z, dPy.z)));
          float cellPx = cellSize / max(length(fw), 1e-4);
          float fade = smoothstep(3.0, 7.0, cellPx);
          if (fade <= 0.0) return 0.0;
          vec2 jit = vec2(gHash(cell + 3.1), gHash(cell + 5.7)) - 0.5;
          vec2 local = (g - (cell + 0.5 + jit * 0.65)) * cellSize;
          float distPx = length(local) / max(length(fw), 1e-4);
          float dotMask = 1.0 - smoothstep(0.35, 1.15, distPx);
          vec3 jn = vec3(gHash(cell + 7.3), gHash(cell + 11.3), gHash(cell + 19.1)) - 0.5;
          vec3 m = normalize(n + jn);
          float spread2 = spread * spread;
          float flash = smoothstep(1.0 - spread2 * 0.035, 1.0 - spread2 * 0.008, dot(m, h));
          return flash * dotMask * fade;
        }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float gDist = length(vViewPosition);
        /* Rotated, non-multiple third scale so no tile ever lines up with itself. */
        vec2 gRot = mat2(0.8, -0.6, 0.6, 0.8) * vGroundW.xz;
        /* Partial dirt: world-locked patches. ponytail: threshold on texture alpha, so the covered share only approximates uDirtFrac. */
        float gPatch = texture2D(uSnowTex, gRot / 53.0).b * 0.6 + texture2D(uSnowTex, vGroundW.xz / 17.0).b * 0.4;
        bool gDirt = uDirt > 0.5 || (uDirtFrac > 0.0 && gPatch < mix(0.3, 0.7, uDirtFrac));
        bool gPartial = uDirtFrac > 0.0;
        vec4 gA = gDirt ? texture2D(uDirtTex, vGroundW.xz / ${f(DIRT_MACRO_M)}) : texture2D(uSnowTex, vGroundW.xz / ${f(SNOW_MACRO_M)});
        vec4 gB = gDirt ? texture2D(uDirtTex, vGroundW.xz / ${f(DIRT_MICRO_M)}) : texture2D(uSnowTex, vGroundW.xz / ${f(SNOW_MICRO_M)});
        vec4 gC = gDirt ? texture2D(uDirtTex, gRot / ${f(DIRT_BROAD_M)}) : texture2D(uSnowTex, gRot / ${f(SNOW_BROAD_M)});
        /* Fine grain fades out with distance before it turns into mip mush / moire; the broad layer takes over. */
        float gNear = 1.0 - smoothstep(${f(GRAIN_FADE_NEAR)}, ${f(GRAIN_FADE_FAR)}, gDist);
        /* Surface look. Ribs and pillows only perturb normals and color: the sheet stays 8 cm under the ski base. */
        float gRibs = gDirt ? 0.0 : step(0.5, uSurface) * (1.0 - step(2.5, uSurface));
        float gGlaze = gDirt ? 0.0 : step(1.5, uSurface) * (1.0 - step(2.5, uSurface));
        float gPillow = gDirt ? 0.0 : step(2.5, uSurface);
        /* Ribs are stripes of constant gS. Piste sheets carry an across-trail coordinate per vertex
           (distance to the nearest OSM centerline, plus its gradient) so the grooves run parallel to the run. Anything else
           stripes across the world normal's horizontal part, which points uphill; flat ground falls back
           to a fixed axis. */
        #ifdef SNOW_EDGE
        vec2 gPerp = normalize(vRib.yz);
        float gS = vRib.x;
        #else
        vec3 gWN = (vec4(normalize(vNormal), 0.0) * viewMatrix).xyz;
        float gTilt = length(gWN.xz);
        vec2 gUp = normalize(mix(vec2(1.0, 0.0), gWN.xz / max(gTilt, 1e-4), smoothstep(0.02, 0.08, gTilt)));
        vec2 gPerp = vec2(-gUp.y, gUp.x);
        float gS = dot(vGroundW.xz, gPerp);
        #endif
        float gPhase = gS * ${(Math.PI * 2 / RIB_M).toFixed(4)};
        /* Fade before the ribs are narrower than a pixel, and far out so the overview is not a barcode. */
        float gRibFade = gRibs * (1.0 - smoothstep(${f(RIB_M * 0.22)}, ${f(RIB_M * 0.5)}, fwidth(gS))) * (1.0 - smoothstep(90.0, 220.0, gDist));
        /* Crisp ridge, wide groove floor: fresh groomer teeth, not a sine wave. */
        float gRidge = smoothstep(0.15, 0.85, 0.5 + 0.5 * cos(gPhase));
        /* Lanes on the same across-trail coordinate. Seam is a berm centred on the lane boundary. */
        float gLaneT = fract(gS / ${f(LANE_M)});
        float gLaneAlt = mod(floor(gS / ${f(LANE_M)}), 2.0);
        float gSeam = gRibs * (1.0 - smoothstep(0.0, ${f(SEAM_M / LANE_M)}, min(gLaneT, 1.0 - gLaneT)))
          * (1.0 - smoothstep(${f(SEAM_M * 0.5)}, ${f(SEAM_M * 1.5)}, fwidth(gS))) * (1.0 - smoothstep(300.0, 600.0, gDist));
        vec4 gP = gPillow > 0.0 ? texture2D(uSnowTex, vGroundW.xz / ${f(PILLOW_M)}) : vec4(0.5, 0.5, 0.5, 0.5);
        if (gDirt) {
          float gMottle = gA.a * 0.55 + gC.a * 0.45;
          float m = gMottle * 0.7 + gB.b * 0.3;
          vec3 base = gPartial ? uDirtColor : diffuseColor.rgb;
          diffuseColor.rgb = mix(base * vec3(0.55, 0.47, 0.40), base, smoothstep(0.28, 0.52, m));
          diffuseColor.rgb = mix(diffuseColor.rgb, base * vec3(1.14, 1.08, 0.96), smoothstep(0.58, 0.82, m));
          diffuseColor.rgb *= 0.82 + 0.18 * gB.b;
        } else {
          /* Groomed snow is flat at every distance: no puff mottle, the ribs and lanes are the only relief. */
          float cav = smoothstep(0.05, 0.6, gA.b * 0.45 + gB.b * 0.55);
          diffuseColor.rgb *= mix(vec3(0.72, 0.79, 0.90), vec3(1.0), mix(cav, 1.0, 0.9 * gRibs));
          diffuseColor.rgb *= (0.955 + 0.045 * gB.b * gNear * (1.0 - gRibs)) * (0.97 + 0.03 * gC.b);
          /* Groove floors sit in blue shade; glazed ice reads a touch cooler. */
          diffuseColor.rgb *= mix(vec3(1.0), mix(vec3(${RIB_SHADE}), vec3(1.0), gRidge), gRibFade);
          /* Lane seams shade, and alternate passes differ a hair in tone. */
          diffuseColor.rgb *= mix(vec3(1.0), vec3(${SEAM_SHADE}), gSeam);
          diffuseColor.rgb *= mix(1.0, ${f(LANE_ALT)}, gRibs * gLaneAlt * (1.0 - smoothstep(300.0, 600.0, gDist)));
          diffuseColor.rgb *= mix(vec3(1.0), vec3(0.93, 0.96, 1.0), gGlaze);
          /* Pillow crowns bright, creases cool and soft. */
          diffuseColor.rgb *= mix(vec3(1.0), mix(vec3(${PILLOW_SHADE}), vec3(1.0), smoothstep(0.2, 0.8, gP.b)), gPillow);
          #ifdef SNOW_EDGE
          /* Melt fringe: drifts (high billows) hold out to the edge, hollows melt first; what's left near the edge is thin. */
          float gCut = (1.0 - smoothstep(0.25, 0.75, gA.b * 0.55 + gC.b * 0.25 + gB.b * 0.2)) * ${EDGE_REACH.toFixed(2)};
          float gEdge = mix(1.0, vSnowEdge, uEdge);
          if (gEdge < gCut) discard;
          diffuseColor.rgb *= mix(vec3(${EDGE_THIN}), vec3(1.0), smoothstep(0.0, 0.3, gEdge - gCut));
          #endif
          /* Fine world-space grain. Same fade as gNear, so it is gone by about 50 m. */
          float gSpeck = gHash(floor(vGroundW.xz * 46.0)) * 0.65 + gHash(floor(vGroundW.xz * 91.0 + 8.0)) * 0.35;
          diffuseColor.rgb *= 1.0 + (gSpeck - 0.5) * 0.14 * gNear;
        }`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        /* Ice: a hard highlight on each ridge. */
        roughnessFactor = mix(roughnessFactor, 0.32, gGlaze * mix(0.35, 1.0, gRidge));
        roughnessFactor = min(1.0, roughnessFactor + vSnowRough * 0.28 * (1.0 - uDirt));
        /* Roughness break-up: world-locked patches of glossier and duller snow, so light breaks up instead of reading flat. */
        roughnessFactor = clamp(roughnessFactor + (gDirt ? 0.0 : (gC.b - 0.5) * 0.22 + (gB.b - 0.5) * 0.12 * gNear),                 0.3, 1.0);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        {
          /* Powder softens the fine grain; pillows add a broad bump. Ribs tilt across the fall line. */
          vec2 gSlope = gDirt ? (gA.rg - 0.5) * 0.5 + (gB.rg - 0.5) * 1.3
            : ((gA.rg - 0.5) * 1.2 + (gB.rg - 0.5) * uGrain * gNear * (1.0 - 0.6 * gPillow) + (gC.rg - 0.5) * 0.8) * (1.0 - 0.85 * gRibs);
          gSlope += (gP.rg - 0.5) * ${f(PILLOW_SLOPE)} * gPillow;
          gSlope += gPerp * (-sin(gPhase)) * ${f(RIB_SLOPE)} * gRibFade;
          /* Seam berm: one flank rises to the boundary, the other falls away. */
          gSlope += gPerp * sign(gLaneT - 0.5) * ${f(SEAM_SLOPE)} * gSeam;
          vec3 gN = (vec4(normal, 0.0) * viewMatrix).xyz;
          gN.xz += gSlope * gN.y;
          normal = normalize((viewMatrix * vec4(gN, 0.0)).xyz);
        }`,
      )
      .replace(
        "#include <lights_fragment_end>",
        `#include <lights_fragment_end>
        /* Shade = how little sun reaches this pixel (cast shadow or facing away). The flat white hemi fill
           reads gray there, so swap its hue for sky blue at equal luminance; sunlit snow keeps the warm sun. */
        float gShade = 0.0;
        if (!gDirt) {
          const vec3 gLum = vec3(0.2126, 0.7152, 0.0722);
          float gSun = dot(reflectedLight.directDiffuse, gLum) / max(dot(reflectedLight.indirectDiffuse, gLum), 1e-4);
          gShade = 1.0 - smoothstep(0.1, 1.2, gSun);
          vec3 gK = mix(vec3(1.0), uShadowTint / dot(uShadowTint, gLum), gShade * uShadowAmt);
          reflectedLight.directDiffuse *= gK;
          reflectedLight.indirectDiffuse *= gK;
        }
        /* Grazing rim in the snow albedo. Dirt stays flat. */
        float gFacing = abs(dot(normalize(normal), normalize(vViewPosition)));
        float gRim = gDirt ? 0.0 : smoothstep(0.62, 0.05, gFacing);
        reflectedLight.indirectDiffuse += diffuseColor.rgb * gRim * 0.3;
        #if NUM_DIR_LIGHTS > 0
        if (!gDirt) {
          vec3 L = directionalLights[0].direction;
          vec3 V = normalize(vViewPosition);
          vec3 nrm = normalize(normal);
          float ndl = dot(nrm, L);
          float ndv = clamp(dot(nrm, V), 0.0, 1.0);
          vec3 wv = vec3(0.2, 0.32, 0.55);
          vec3 extra = clamp((ndl + wv) / (1.0 + wv), 0.0, 1.0) - clamp(ndl, 0.0, 1.0);
          vec3 E = directionalLights[0].color;
          reflectedLight.directDiffuse += E * RECIPROCAL_PI * diffuseColor.rgb * extra;
          reflectedLight.indirectDiffuse *= vec3(0.9, 0.97, 1.08);
          float fwd = pow(clamp(dot(V, -L), 0.0, 1.0), 4.0);
          reflectedLight.directDiffuse += E * RECIPROCAL_PI * fwd * 0.25 * pow(1.0 - ndv, 2.0) * vec3(0.55, 0.84, 1.05);
        }
        #endif`,
      )
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
        #if NUM_DIR_LIGHTS > 0
        /* Powder barely glints; ice glints hardest in the groove floors. Worn snow stays dull. Low detail skips the cells. */
        float gSpark = (gDirt ? 0.0 : 1.0) * (1.0 - gShade) * uSparkle * uDetail * (1.0 - vSnowWorn) * (1.0 - 0.7 * gPillow) * (1.0 + gGlaze * 1.6 * (1.0 - gRidge));
        if (gSpark > 0.002) {
          vec3 gH = normalize(directionalLights[0].direction + normalize(vViewPosition));
          vec3 gDx = dFdx(vGroundW);
          vec3 gDy = dFdy(vGroundW);
          float g = surfGlint(vGroundW, normal, gH, 0.22, 0.42, gDx, gDy, ${SPARKLE_DENSITY.toFixed(2)});
          g += surfGlint(vGroundW, normal, gH, 0.62, 0.55, gDx, gDy, ${SPARKLE_DENSITY.toFixed(2)}) * 0.65;
          gl_FragColor.rgb += vec3(0.9, 0.95, 1.0) * g * gSpark * 4.0;
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

/**
 * Height of the drawn terrain mesh on a grid (barycentric fill of each triangle), as (x, z) => y or null.
 * The mesh is finer than the heightfield and sits up to ~0.75 m above it, which buried the piste snow sheets.
 * ponytail: cells no triangle centre lands in return null (caller falls back to the heightfield); raise res if holes show.
 */
export function terrainSurface(root, maxCells = 6e6) {
  const geos = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  root?.traverse((o) => {
    const p = o.isMesh && o.geometry?.index && o.geometry.attributes?.position;
    if (!p) return;
    geos.push(o.geometry);
    for (let i = 0; i < p.count; i++) {
      minX = Math.min(minX, p.getX(i));
      maxX = Math.max(maxX, p.getX(i));
      minZ = Math.min(minZ, p.getZ(i));
      maxZ = Math.max(maxZ, p.getZ(i));
    }
  });
  if (!geos.length) return null;
  const cell = Math.max(2, Math.sqrt(((maxX - minX) * (maxZ - minZ)) / maxCells));
  const w = Math.ceil((maxX - minX) / cell) + 1;
  const h = Math.ceil((maxZ - minZ) / cell) + 1;
  const grid = new Float32Array(w * h).fill(NaN);
  for (const g of geos) {
    const p = g.attributes.position;
    const ix = g.index.array;
    for (let t = 0; t < ix.length; t += 3) {
      const ax = p.getX(ix[t]);
      const az = p.getZ(ix[t]);
      const bx = p.getX(ix[t + 1]);
      const bz = p.getZ(ix[t + 1]);
      const cx = p.getX(ix[t + 2]);
      const cz = p.getZ(ix[t + 2]);
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(det) < 1e-9) continue;
      const ay = p.getY(ix[t]);
      const by = p.getY(ix[t + 1]);
      const cy = p.getY(ix[t + 2]);
      const i0 = Math.max(0, Math.ceil((Math.min(ax, bx, cx) - minX) / cell));
      const i1 = Math.min(w - 1, Math.floor((Math.max(ax, bx, cx) - minX) / cell));
      const j0 = Math.max(0, Math.ceil((Math.min(az, bz, cz) - minZ) / cell));
      const j1 = Math.min(h - 1, Math.floor((Math.max(az, bz, cz) - minZ) / cell));
      for (let j = j0; j <= j1; j++) {
        const z = minZ + j * cell;
        for (let i = i0; i <= i1; i++) {
          const x = minX + i * cell;
          const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det;
          const v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det;
          if (u < -1e-6 || v < -1e-6 || u + v > 1 + 1e-6) continue;
          grid[j * w + i] = u * ay + v * by + (1 - u - v) * cy;
        }
      }
    }
  }
  return (x, z) => {
    const fx = (x - minX) / cell;
    const fz = (z - minZ) / cell;
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    if (i < 0 || j < 0 || i >= w - 1 || j >= h - 1) return null;
    const a = grid[j * w + i];
    const b = grid[j * w + i + 1];
    const c = grid[(j + 1) * w + i];
    const d = grid[(j + 1) * w + i + 1];
    if (a !== a || b !== b || c !== c || d !== d) return null;
    const sx = fx - i;
    const sz = fz - j;
    return (a * (1 - sx) + b * sx) * (1 - sz) + (c * (1 - sx) + d * sx) * sz;
  };
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
  const slope = { index: { array: [0, 1, 2, 1, 3, 2] }, attributes: { position: { count: 4, getX: (i) => [0, 20, 0, 20][i], getY: (i) => [0, 10, 0, 10][i], getZ: (i) => [0, 0, 20, 20][i] } } };
  const surf = terrainSurface({ traverse: (f) => f({ isMesh: true, geometry: slope }) });
  ok(Math.abs(surf(10, 7) - 5) < 0.05 && surf(99, 99) === null, "terrainSurface height");
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
  const grainFade = (dist) => {
    const t = Math.min(1, Math.max(0, (dist - GRAIN_FADE_NEAR) / (GRAIN_FADE_FAR - GRAIN_FADE_NEAR)));
    const s = t * t * (3 - 2 * t);
    return 1 - s;
  };
  ok(grainFade(GRAIN_FADE_NEAR) === 1 && grainFade(GRAIN_FADE_FAR) === 0 && grainFade(34) > grainFade(46), "grain fade 18-50");
  const src = snowTerrainMaterial.toString();
  ok(src.includes("surfGlint") && !src.includes("gGlint"), "glints replaced");
  ok(src.includes("vec3(0.2, 0.32, 0.55)") && src.includes("vec3(0.55, 0.84, 1.05)"), "wrapped light and scatter");
  ok(src.includes("1.0 - vSnowWorn"), "worn kills glint");
  ok(src.includes("defaultAttributeValues ||"), "snow attrs have a default bag");
  console.log("ground.js ok");
}

const argv1 = typeof process !== "undefined" ? String(process.argv?.[1] || "").replace(/\\/g, "/") : "";
if (argv1.endsWith("/ground.js")) selfCheck();
