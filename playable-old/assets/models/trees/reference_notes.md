# Snowy pine references

Style analogues for a game foliage pack. Not a measured turnaround of one tree, and not licensed for texture tracing.

## User images

- `pine-a` (narrow spire): studio spruce, front, white/gray sweep. Width is about 0.40 of height. Layered whorls, sharp tip, bare trunk on the bottom ~0.08 of height. Snow sits on top of each whorl; green needles hang underneath. Trunk is a readable brown cylinder without roots or a pot.
- `pine-b` (broad, snow-loaded): same kind of studio shot. Width is about 0.75 of height. Snow forms thick rounded pillows that stack up the crown and hide most of the trunk. Green shows mainly as a fringe under the lower pillows.

The photos are dark in the shaded needles. The game multiplies the texture by near-white and cuts alpha at 0.38, so the painted green has to stay a clear mid green or it turns into a black-green mass.

## Assumptions

- All three meshes are about 11 m, because the loader divides every mesh by the tallest height and then scales again.
- The third tree has no photo. It is a full-height pine with fewer, uneven limbs, a thinner trunk still inside 0.4–0.8 m across, and only a light snow cap.
- Yaw is random at runtime, so each limb is a crossed pair plus a snow shelf instead of a single camera-facing card.
- Hidden interior is inferred: a tapered trunk through the crown, whorls rotating up the stem, lower limbs longer and more drooped on the broad tree.
