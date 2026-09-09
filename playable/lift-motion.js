import { isAerialLift, liftCableHeight } from "./lift-graphics.js";

function pathLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += points[i].distanceTo(points[i - 1]);
  return total;
}

function pointAt(points, distance) {
  let remaining = Math.max(0, Math.min(pathLength(points), distance));
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const length = a.distanceTo(b);
    if (remaining <= length) {
      const t = length ? remaining / length : 0;
      return { point: a.clone().lerp(b, t), tangent: b.clone().sub(a).normalize() };
    }
    remaining -= length;
  }
  return { point: points[points.length - 1].clone(), tangent: points.at(-1).clone().sub(points.at(-2)).normalize() };
}

export function createLiftMotion(THREE, scene, type, points, elevFn, makeCarrier, makeSkier) {
  if (!points || points.length < 2) return null;
  const length = pathLength(points);
  const aerial = isAerialLift(type);
  const root = new THREE.Group();
  root.name = `lift-motion-${type}`;
  const carriers = [];
  const count = type === "cable_car" ? 2 : type === "magic_carpet" ? 8 : aerial ? (type === "mixed_lift" ? 8 : 10) : 12;
  for (let i = 0; i < count; i++) {
    const carrier = makeCarrier();
    const rider = makeSkier(0x285b9f + (i % 3) * 0x241800);
    rider.visible = type === "magic_carpet" || (aerial && type !== "cable_car" && i % 2 === 0);
    carrier.add(rider);
    root.add(carrier);
    carriers.push({ carrier, offset: (i / count) * length, direction: i % 2 ? -1 : 1 });
  }
  scene.add(root);
  return { type, root, points, length, cableHeight: aerial ? 0 : 0, carriers, elevFn, time: 0 };
}

export function updateLiftMotion(THREE, motion, dt) {
  if (!motion) return;
  motion.time += dt;
  const speed = motion.type === "cable_car" ? 7 : isAerialLift(motion.type) ? 5 : 3.2;
  for (const item of motion.carriers) {
    let distance;
    if (motion.type === "cable_car") {
      const shuttle = (motion.time * speed + item.offset) % (motion.length * 2);
      distance = shuttle <= motion.length ? shuttle : motion.length * 2 - shuttle;
    } else if (isAerialLift(motion.type)) {
      distance = (motion.time * speed * item.direction + item.offset + motion.length * 4) % motion.length;
    } else {
      distance = (motion.time * speed + item.offset) % motion.length;
    }
    const sample = pointAt(motion.points, distance);
    const height = liftCableHeight(motion.type);
    item.carrier.position.set(sample.point.x, sample.point.y + height, sample.point.z);
    item.carrier.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(sample.tangent.x, 0, sample.tangent.z).normalize());
  }
}