import { isAerialLift, liftCableHeight, LIFT_LANE, ROPE_LANE } from "./lift-graphics.js?v=s9";

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
  const count = type === "cable_car" ? 2 : type === "magic_carpet" ? Math.max(2, Math.min(8, Math.round(length / 12))) : type === "rope_tow" ? Math.max(3, Math.min(12, Math.round(length / 16))) : aerial ? (type === "mixed_lift" ? 8 : 10) : 12;
  for (let i = 0; i < count; i++) {
    const carrier = makeCarrier();
    const rider = makeSkier(0x285b9f + (i % 3) * 0x241800);
    rider.visible = type === "magic_carpet" || type === "rope_tow" || (aerial && type !== "cable_car" && i % 2 === 0);
    const seat = carrier.userData.seat;
    if (seat) {
      /* Full-body riders sit with hips on the seat (legs hang to the footrest); a torso-only rider sits on it. */
      const box = new THREE.Box3().setFromObject(rider);
      const h = box.max.y - box.min.y;
      rider.position.set(seat.x, seat.y - box.min.y - (h > 1.2 ? h * 0.5 : 0), seat.z);
    }
    carrier.add(rider);
    root.add(carrier);
    carriers.push({ carrier, offset: (i / count) * length, direction: type === "rope_tow" || type === "magic_carpet" ? 1 : i % 2 ? -1 : 1 });
  }
  scene.add(root);
  return { type, root, points, length, cableHeight: aerial ? 0 : 0, carriers, elevFn, time: 0 };
}

export function updateLiftMotion(THREE, motion, dt) {
  if (!motion) return;
  motion.time += dt;
  const speed = motion.type === "cable_car" ? 7 : motion.type === "magic_carpet" ? 1.3 : motion.type === "rope_tow" ? 2.4 : isAerialLift(motion.type) ? 5 : 3.2;
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
    const height = motion.type === "rope_tow" ? 0 : liftCableHeight(motion.type);
    const lane = motion.type === "rope_tow" ? ROPE_LANE + 0.35 : motion.type === "magic_carpet" ? 0 : LIFT_LANE * (height / 10.5) * item.direction;
    const span = Math.hypot(sample.tangent.x, sample.tangent.z) || 1;
    item.carrier.position.set(
      sample.point.x + (sample.tangent.z / span) * lane,
      sample.point.y + height,
      sample.point.z - (sample.tangent.x / span) * lane,
    );
    /* Chairs and cabins face the way they travel, so the return line isn't riding backwards. */
    const face = isAerialLift(motion.type) && motion.type !== "cable_car" ? item.direction : 1;
    item.carrier.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(sample.tangent.x * face, 0, sample.tangent.z * face).normalize());
  }
}