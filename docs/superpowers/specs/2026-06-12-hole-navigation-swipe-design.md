# Hole Navigation Swipe Design

## Goal

Allow players in competition and custom-game play modes to change holes by
swiping the light-green hole header above the scoring area, while retaining the
footer arrow buttons and all current hole-range rules.

## Interaction

- The score-entry hole header behaves as a cyclic horizontal carousel.
- The header follows the finger continuously while dragging.
- Release velocity can carry the carousel across several holes.
- The carousel eases into a soft snap on the selected hole.
- Wrapping follows the ordered `activeHoles` list. An 18-hole round wraps 18 to
  1, a front-nine round wraps 9 to 1, and a back-nine round wraps 18 to 10.
- The scoring area stays fixed while dragging, then crossfades to the selected
  hole after the header settles.
- Footer arrow buttons continue to work unchanged and are not swipeable.
- Taps and predominantly vertical gestures do not change the hole.

## Implementation

Add a focused hole-header carousel component inside `ScoreEntry`. It renders a
small cyclic window of active holes around the current position. Pointer moves
update a horizontal translation so the labels track the finger directly.

On release, combine drag distance and recent pointer velocity to calculate the
number of hole-width steps to travel. Clamp excessive momentum to a reasonable
number of steps, then animate the track with easing until the target hole is
centered. Resolve all indexes through the ordered `activeHoles` array so cyclic
wrapping works for 18-hole, front-nine, back-nine, and other configured rounds.

Only after the header settles will `ScoreEntry` call `onHoleChange`. The scoring
area will briefly fade out and back in around that state change to avoid a hard
content jump. The footer `HoleNavigation` returns to its original button-only
behavior.

The header will use horizontal pan touch behavior so vertical page movement
remains available. Pointer events provide one implementation for touch, pen,
and mouse input without adding an animation dependency.

## Accessibility

The existing buttons remain the keyboard-accessible and explicit navigation
controls. Swipe is an additional interaction, not the only way to change holes.
No visual redesign or new control is required.

## Testing

Add focused component tests covering:

- The header track follows pointer movement.
- A slow drag snaps to the nearest hole.
- A fast swipe can advance multiple holes.
- Left and right movement wrap through `activeHoles`.
- Nine-hole and back-nine ranges wrap correctly.
- Predominantly vertical gestures do not change the hole.
- The hole callback fires after the snap settles.
- The scoring area receives the transition state during a hole change.
- The footer does not respond to swipe gestures.

Run the frontend unit tests, lint, production frontend deployment build, and a
mobile-sized browser verification on the supplied competition round route.

## Scope

This change applies wherever the shared `ScoreEntry` component is rendered,
currently competition rounds (including series and tour competitions) and
custom-game play. It does not add swipe navigation to the footer, player rows,
tabs, scorecard modals, or other navigation surfaces.
