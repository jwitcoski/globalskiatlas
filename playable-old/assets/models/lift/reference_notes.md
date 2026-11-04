# Quad chair references

## Binding

Concept render supplied with the request:

`C:\Users\jwitc\.cursor\projects\c-Users-jwitc-Documents-GitHub-GlobalSkiAtlas-2\assets\c__Users_jwitc_AppData_Roaming_Cursor_User_workspaceStorage_b0ab0b3caa634887ef21c74ee4502904_images_lift-chair-33f98b29-f2f5-439e-9760-92450d8859bc.jpg`

Angle: front three-quarter, chair hanging, no cable in frame. Style and part layout are binding. It is a generated concept, not a measured photo, so depths are inferred.

Observed:

- Grip head at the top with a pin across the cable and two link cheeks. The hanger leaves the bottom of that head.
- One curved tubular hanger, bowed in depth, ending in a bolted plate on the top crossbar.
- Rounded rectangular tube frame. Top crossbar, side posts, lower rail kicked forward into a full-width footrest.
- Two charcoal benches side by side (a quad), each with a seat cushion and a back cushion.
- Horizontal restraint bar in front of the cushions, with a dark sleeve over each bench.
- Painted gray steel, black seat, metalness not used as the color.

## Game frame (overrides the photo where they disagree)

From `playable/lift-graphics.js`:

- Origin at the grip. Seat surface about 2.55 m below it (`CHAIR_SEAT_Y + 0.05`).
- Outer width 2.2 m.
- Riders and travel face +Z after glTF Y-up export. In Blender that is -Y.
- Steel color `0x6b7785` (`PALETTE.lift`). Seat darker so it survives snow.
- One albedo. No material-color tint. Metalness 0.
- Under about 2,500 triangles. No animation, cable, tower, ground, or people in the GLB.

## Assumptions

- Hanger bow is rearward (away from travel), so the front view stays symmetric. The concept's sideways bow is the three-quarter read of that curve.
- Footrest is the bottom of the frame, forward of the seat.
- Both restraint ends tie into the side posts. The concept shows one gusset; both sides are the same part.
