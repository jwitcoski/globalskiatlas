/** Visible skier. Parts hang on a rig that follows the existing tuck, lean, and pole pose. */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const SRC = new URL("./assets/models/skier/skier.glb", import.meta.url).href;
/** physics.js RIDE: the group origin sits this far above the DEM. */
const RIDE = 0.92;
/** Piste snow is draped 0.08 above the DEM. Keep the ski base on that surface. */
const SNOW = 0.12;

const DOWN = new THREE.Vector3(0, -1, 0);
const ALIGN_L = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), DOWN);
const ALIGN_R = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(-1, 0, 0), DOWN);

let template = null;
let pending = null;

export function loadSkierModel() {
  if (template) return Promise.resolve(template);
  if (!pending) {
    pending = new GLTFLoader().loadAsync(SRC).then((gltf) => {
      template = gltf.scene;
      return template;
    });
  }
  return pending;
}

function partOf(x, y, z) {
  const ax = Math.abs(x);
  const side = x >= 0 ? "L" : "R";
  const poleX = x >= 0 ? 0.785 : -0.785;
  const pd = Math.hypot(x - poleX, z - 0.02);
  if (pd < 0.018 || (pd < 0.05 && y < 0.25)) return "pole" + side;
  const stance = Math.abs(ax - 0.148) < 0.055;
  if ((y < 0.022 || (y < 0.095 && Math.abs(z) > 0.36) || (stance && y < 0.07 && Math.abs(z) < 0.25))
    && !(y >= 0.02 && y < 0.12 && stance && Math.abs(z) < 0.32 && Math.abs(z) > 0.04 && y > 0.03)) {
    return "ski" + side;
  }
  if (ax > 0.64 && y > 1.12 && y < 1.55) return "hand" + side;
  if (ax > 0.46 && y > 1.18 && y < 1.56) return "fore" + side;
  if (ax > 0.24 && y > 1.22 && y < 1.58) return "upper" + side;
  if (y > 1.52 && ax < 0.22) return "head";
  if (ax > 0.05 && ax < 0.28 && y < 0.28 && Math.abs(z) < 0.5) return "boot" + side;
  if (ax > 0.05 && ax < 0.28 && y >= 0.28 && y < 0.52) return "shin" + side;
  if (ax > 0.05 && ax < 0.32 && y >= 0.5 && y < 0.94) return "thigh" + side;
  return "torso";
}

function sourceMesh(root) {
  let mesh = null;
  root.traverse((o) => {
    if (o.isMesh) mesh = o;
  });
  return mesh;
}

function splitTriangles(mesh) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const uv = geo.attributes.uv;
  const index = geo.index;
  const buckets = new Map();
  const tri = (part, ia, ib, ic) => {
    let b = buckets.get(part);
    if (!b) {
      b = { p: [], n: [], u: [] };
      buckets.set(part, b);
    }
    for (const i of [ia, ib, ic]) {
      b.p.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (norm) b.n.push(norm.getX(i), norm.getY(i), norm.getZ(i));
      if (uv) b.u.push(uv.getX(i), uv.getY(i));
    }
  };
  const count = index ? index.count : pos.count;
  for (let i = 0; i < count; i += 3) {
    const ia = index ? index.getX(i) : i;
    const ib = index ? index.getX(i + 1) : i + 1;
    const ic = index ? index.getX(i + 2) : i + 2;
    const cx = (pos.getX(ia) + pos.getX(ib) + pos.getX(ic)) / 3;
    const cy = (pos.getY(ia) + pos.getY(ib) + pos.getY(ic)) / 3;
    const cz = (pos.getZ(ia) + pos.getZ(ib) + pos.getZ(ic)) / 3;
    tri(partOf(cx, cy, cz), ia, ib, ic);
  }
  return buckets;
}

function geometryFrom(bucket, mapPos, mapNor) {
  const geo = new THREE.BufferGeometry();
  const p = bucket.p;
  const out = new Float32Array(p.length);
  const nrm = bucket.n.length ? new Float32Array(bucket.n.length) : null;
  const v = new THREE.Vector3();
  const vn = new THREE.Vector3();
  for (let i = 0; i < p.length; i += 3) {
    v.set(p[i], p[i + 1], p[i + 2]);
    mapPos(v);
    out[i] = v.x;
    out[i + 1] = v.y;
    out[i + 2] = v.z;
    if (nrm) {
      vn.set(bucket.n[i], bucket.n[i + 1], bucket.n[i + 2]);
      mapNor(vn);
      nrm[i] = vn.x;
      nrm[i + 1] = vn.y;
      nrm[i + 2] = vn.z;
    }
  }
  geo.setAttribute("position", new THREE.BufferAttribute(out, 3));
  if (nrm) geo.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  else geo.computeVertexNormals();
  if (bucket.u.length) geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(bucket.u), 2));
  return geo;
}

function pivot(hero, yLift) {
  return new THREE.Vector3(hero[0], hero[1] - yLift, hero[2]);
}

function addPart(parent, bucket, material, mapPos, mapNor) {
  const mesh = new THREE.Mesh(geometryFrom(bucket, mapPos, mapNor), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.renderOrder = 20;
  parent.add(mesh);
  return mesh;
}

function limbAlign(name) {
  if (name.endsWith("L")) return ALIGN_L;
  if (name.endsWith("R")) return ALIGN_R;
  return null;
}

/**
 * Bind a T-pose limb so the joint's rest rotation (limb along local -Y) poses it.
 * Arms extend on X in the mesh; legs and poles already run along Y.
 */
function bindLimb(bucket, joint, origin, align) {
  const q = align || new THREE.Quaternion();
  addPart(joint, bucket, bucket.material, (v) => {
    v.y -= RIDE - SNOW;
    v.sub(origin).applyQuaternion(q);
  }, (n) => {
    n.applyQuaternion(q);
  });
}

function mountRig(skier, buckets, material) {
  const y0 = RIDE - SNOW;
  const torso = new THREE.Group();
  torso.name = "heroTorso";
  const legs = new THREE.Group();
  legs.name = "heroLegs";
  skier.add(torso, legs);

  const P = {
    shoulderL: pivot([0.28, 1.44, 0.02], y0),
    elbowL: pivot([0.52, 1.40, 0.04], y0),
    wristL: pivot([0.70, 1.36, 0.05], y0),
    shoulderR: pivot([-0.28, 1.44, 0.02], y0),
    elbowR: pivot([-0.52, 1.40, 0.04], y0),
    wristR: pivot([-0.70, 1.36, 0.05], y0),
    hipL: pivot([0.13, 0.84, 0], y0),
    kneeL: pivot([0.14, 0.50, 0.02], y0),
    ankleL: pivot([0.148, 0.24, 0], y0),
    hipR: pivot([-0.13, 0.84, 0], y0),
    kneeR: pivot([-0.14, 0.50, 0.02], y0),
    ankleR: pivot([-0.148, 0.24, 0], y0),
    head: pivot([0, 1.58, 0.02], y0),
  };

  function chain(parent, name, origin, childOrigin, align) {
    const g = new THREE.Group();
    g.name = name;
    g.position.copy(origin);
    parent.add(g);
    if (childOrigin && align) {
      /* child offset filled by the caller via position of the next joint */
    }
    return g;
  }

  const head = chain(torso, "heroHead", P.head);
  const shoulderL = chain(torso, "heroShoulderL", P.shoulderL);
  const shoulderR = chain(torso, "heroShoulderR", P.shoulderR);
  const elbowL = new THREE.Group();
  const elbowR = new THREE.Group();
  const wristL = new THREE.Group();
  const wristR = new THREE.Group();
  const poleL = new THREE.Group();
  const poleR = new THREE.Group();
  elbowL.position.copy(P.elbowL.clone().sub(P.shoulderL).applyQuaternion(ALIGN_L));
  elbowR.position.copy(P.elbowR.clone().sub(P.shoulderR).applyQuaternion(ALIGN_R));
  wristL.position.copy(P.wristL.clone().sub(P.elbowL).applyQuaternion(ALIGN_L));
  wristR.position.copy(P.wristR.clone().sub(P.elbowR).applyQuaternion(ALIGN_R));
  shoulderL.add(elbowL);
  shoulderR.add(elbowR);
  elbowL.add(wristL);
  elbowR.add(wristR);
  wristL.add(poleL);
  wristR.add(poleR);

  const hipL = chain(legs, "heroHipL", P.hipL);
  const hipR = chain(legs, "heroHipR", P.hipR);
  const kneeL = new THREE.Group();
  const kneeR = new THREE.Group();
  const ankleL = new THREE.Group();
  const ankleR = new THREE.Group();
  kneeL.position.copy(P.kneeL.clone().sub(P.hipL));
  kneeR.position.copy(P.kneeR.clone().sub(P.hipR));
  ankleL.position.copy(P.ankleL.clone().sub(P.kneeL));
  ankleR.position.copy(P.ankleR.clone().sub(P.kneeR));
  hipL.add(kneeL);
  hipR.add(kneeR);
  kneeL.add(ankleL);
  kneeR.add(ankleR);

  const rig = {
    torso, legs, head,
    shoulderL, shoulderR, elbowL, elbowR, wristL, wristR, poleL, poleR,
    hipL, hipR, kneeL, kneeR, ankleL, ankleR,
  };

  const put = (part, joint, origin, align) => {
    const bucket = buckets.get(part);
    if (!bucket) return;
    bucket.material = material;
    bindLimb(bucket, joint, origin, align);
  };
  put("torso", torso, new THREE.Vector3(), null);
  put("head", head, P.head, null);
  put("upperL", shoulderL, P.shoulderL, ALIGN_L);
  put("upperR", shoulderR, P.shoulderR, ALIGN_R);
  put("foreL", elbowL, P.elbowL, ALIGN_L);
  put("foreR", elbowR, P.elbowR, ALIGN_R);
  put("handL", wristL, P.wristL, ALIGN_L);
  put("handR", wristR, P.wristR, ALIGN_R);
  put("poleL", poleL, P.wristL, null);
  put("poleR", poleR, P.wristR, null);
  put("thighL", hipL, P.hipL, null);
  put("thighR", hipR, P.hipR, null);
  put("shinL", kneeL, P.kneeL, null);
  put("shinR", kneeR, P.kneeR, null);
  put("bootL", ankleL, P.ankleL, null);
  put("bootR", ankleR, P.ankleR, null);
  return rig;
}

function glueSki(skier, buckets, material, proc, name) {
  const bucket = buckets.get(name);
  if (!bucket || !proc) return null;
  skier.updateWorldMatrix(true, true);
  proc.updateWorldMatrix(true, true);
  const into = new THREE.Matrix4().makeTranslation(0, -(RIDE - SNOW), 0);
  into.premultiply(skier.matrixWorld);
  into.premultiply(new THREE.Matrix4().copy(proc.matrixWorld).invert());
  const nmat = new THREE.Matrix3().getNormalMatrix(into);
  const mesh = addPart(proc, bucket, material, (v) => v.applyMatrix4(into), (n) => n.applyMatrix3(nmat).normalize());
  mesh.name = name;
  return mesh;
}

function syncHero(skier) {
  const h = skier.userData.heroRig;
  const j = skier.userData.joints;
  if (!h || !j) return;
  const srcT = skier.userData.torso;
  const srcL = skier.userData.legs;
  h.torso.quaternion.copy(srcT.quaternion);
  h.torso.position.copy(srcT.position);
  h.legs.position.copy(srcL.position);
  h.legs.scale.copy(srcL.scale);
  h.head.quaternion.copy(skier.userData.head.quaternion);
  h.shoulderL.rotation.x = j.shoulderL.rotation.x;
  h.shoulderR.rotation.x = j.shoulderR.rotation.x;
  h.shoulderL.rotation.z = -j.shoulderL.rotation.z;
  h.shoulderR.rotation.z = -j.shoulderR.rotation.z;
  h.elbowL.rotation.x = j.elbowL.rotation.x;
  h.elbowR.rotation.x = j.elbowR.rotation.x;
  h.elbowL.rotation.z = -j.elbowL.rotation.z;
  h.elbowR.rotation.z = -j.elbowR.rotation.z;
  /* Procedural limbs hang on -Y, so +X rotation pitches them backward. Flip X so the mesh crouches downhill. */
  h.hipL.rotation.x = -j.hipL.rotation.x;
  h.hipR.rotation.x = -j.hipR.rotation.x;
  h.hipL.rotation.z = j.hipL.rotation.z;
  h.hipR.rotation.z = j.hipR.rotation.z;
  h.kneeL.rotation.x = -j.kneeL.rotation.x;
  h.kneeR.rotation.x = -j.kneeR.rotation.x;
  h.ankleL.rotation.x = -j.ankleL.rotation.x;
  h.ankleR.rotation.x = -j.ankleR.rotation.x;
  skier.updateWorldMatrix(true, true);
  aimPole(h.poleL, h.wristL, skier.userData.poleL);
  aimPole(h.poleR, h.wristR, skier.userData.poleR);
}

function aimPole(vis, wrist, proc) {
  skierUpdate(vis);
  const qW = wrist.getWorldQuaternion(aimPole.qW);
  const qP = proc.getWorldQuaternion(aimPole.qP);
  vis.quaternion.copy(qW).invert().multiply(qP);
}
aimPole.qW = new THREE.Quaternion();
aimPole.qP = new THREE.Quaternion();

function skierUpdate(obj) {
  obj.parent.updateWorldMatrix(true, true);
}

/** The atlas sun is dim and this game has no scene environment on the skier.
 *  Metalness 1 with that lighting reads as black. Keep the albedo, drop metal. */
function tuneMaterial(src, skier) {
  const m = src.clone();
  m.metalness = 0;
  m.metalnessMap = null;
  m.roughness = 0.58;
  m.color.setRGB(3, 3, 3);
  if (m.normalScale) m.normalScale.set(0.4, 0.4);
  let root = skier;
  while (root.parent) root = root.parent;
  const env = root.userData && root.userData.envMap;
  if (env) {
    m.envMap = env;
    m.envMapIntensity = 0.5;
  }
  return m;
}

/** Recolor only the blue jacket. Pants, helmet, and skis stay on the atlas. */
function dyeJacket(material, hex) {
  if (hex == null) return material;
  const color = new THREE.Color(hex);
  material.defines = { JACKET_ID: hex };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uJacket = { value: color };
    shader.fragmentShader = "uniform vec3 uJacket;\n" + shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
       {
         float jacket = smoothstep(0.05, 0.16, diffuseColor.b - diffuseColor.r);
         jacket *= smoothstep(0.02, 0.1, diffuseColor.b - diffuseColor.g);
         float luma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
         float srcL = max(dot(uJacket, vec3(0.2126, 0.7152, 0.0722)), 0.001);
         diffuseColor.rgb = mix(diffuseColor.rgb, uJacket * (luma / srcL), jacket);
       }`,
    );
  };
  material.customProgramCacheKey = () => "jacket-" + hex.toString(16);
  return material;
}

/** Feet on the snow, +Z forward. Arms and legs follow the pose rig. */
export function mountSkierModel(skier, jacket) {
  if (!template || !skier || skier.userData.heroMesh) return false;
  const src = sourceMesh(template);
  if (!src) return false;
  skier.traverse((o) => {
    if (o.isMesh) o.visible = false;
  });
  const buckets = splitTriangles(src);
  const material = dyeJacket(tuneMaterial(src.material, skier), jacket);
  const rig = mountRig(skier, buckets, material);
  glueSki(skier, buckets, material, skier.userData.skiL, "skiL");
  glueSki(skier, buckets, material, skier.userData.skiR, "skiR");
  skier.userData.heroRig = rig;
  skier.userData.heroMesh = rig.torso;
  skier.userData.syncHero = () => syncHero(skier);
  syncHero(skier);
  return true;
}
