/** Keyboard, analog stick, and pads share one intent. Physics reads analog steer. */

const analog = { steer: 0, tuck: 0, brake: 0 };

export function analogAxes() {
  return analog;
}

export function setAnalogSteer(x) {
  analog.steer = Math.max(-1, Math.min(1, x || 0));
}

export function setAnalogVert(y) {
  const v = Math.max(-1, Math.min(1, y || 0));
  analog.tuck = Math.max(0, v);
  analog.brake = Math.max(0, -v);
}

export function clearAnalog() {
  analog.steer = 0;
  analog.tuck = 0;
  analog.brake = 0;
}

export function intentsFrom(keys) {
  const keyLeft = keys.has("KeyA") || keys.has("ArrowLeft");
  const keyRight = keys.has("KeyD") || keys.has("ArrowRight");
  let steer = analog.steer;
  if (keyLeft && !keyRight) steer = 1;
  else if (keyRight && !keyLeft) steer = -1;
  else if (keyLeft && keyRight) steer = 0;
  const tuck = keys.has("KeyW") || keys.has("ArrowUp") || analog.tuck > 0.35;
  const brake = keys.has("KeyS") || keys.has("ArrowDown") || analog.brake > 0.35;
  return {
    left: steer > 0.12,
    right: steer < -0.12,
    tuck,
    brake,
    steer,
  };
}

export function isTurning(keys) {
  const i = intentsFrom(keys);
  return Math.abs(i.steer) > 0.12;
}
