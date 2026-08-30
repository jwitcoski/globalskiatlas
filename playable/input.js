/** Keyboard and pads share one key set. Intents are derived; physics still reads codes. */

export function intentsFrom(keys) {
  return {
    left: keys.has("KeyA") || keys.has("ArrowLeft"),
    right: keys.has("KeyD") || keys.has("ArrowRight"),
    tuck: keys.has("KeyW") || keys.has("ArrowUp"),
    brake: keys.has("KeyS") || keys.has("ArrowDown"),
  };
}

export function isTurning(keys) {
  const i = intentsFrom(keys);
  return i.left || i.right;
}
