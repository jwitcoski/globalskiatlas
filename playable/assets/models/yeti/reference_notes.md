# Yeti references

Style and anatomy are separate. The deliverable is an original bipedal chase pose, not a copy of either reference pose.

## Style

- Local file: `playable/assets/concepts/yeti-ref.png` (also the image attached to the modeling request).
- Angle: standing three-quarter, neutral hang, gray studio.
- Use: off-white shaggy fur, dark leathery muzzle, small dark eyes under a heavy brow, broad chest, long arms, large hands and feet, dark nails.
- Do not use: the standing pose, the T-like arm hang, or any SkiFree sprite pose.
- Fur value must stay darker than in-game wonderland snow `0xfbfaf6`, or the body disappears on the slope.

## Anatomy analogue

- Source: Dian Fossey Gorilla Fund, "Gorilla Anatomy" (https://gorillafund.org/uncategorized/gorilla-anatomy/), viewed 2026-10-20.
- Observed: arms longer than legs; standing height about 6 ft with an arm span near 8 ft; opposable thumb and a long grasping hallux; mass in the chest, shoulders, and thighs.
- Not observed here: a photographic side or front plate of a bipedal run. A running ape plate was not opened. Stride is an assumption from that limb ratio plus a human-style opposite arm/leg run, scaled to 3.4 m and kept inside a 2 m width by swinging the arms in the sagittal plane instead of out to the sides.

## Assumptions

- One skinned mesh, bind pose already at left-foot contact, in-place run cycle on the bones.
- Blender faces -Y so the glTF export faces +Z, matching `playable/assets/models/skier/create_skier.py`.
- Lowest vertex is the planted sole. The trailing foot stays above it.
