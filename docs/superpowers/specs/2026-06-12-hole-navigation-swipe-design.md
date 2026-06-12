# Hole Navigation Swipe Design

## Goal

Allow players in competition and custom-game play modes to change holes by
swiping the existing hole navigation bar, while retaining the arrow buttons and
all current hole-range rules.

## Interaction

- Swiping left on the hole navigation bar moves to the next available hole.
- Swiping right on the hole navigation bar moves to the previous available hole.
- Navigation does not wrap at the first or last available hole.
- Arrow buttons continue to work unchanged.
- Taps and predominantly vertical gestures do not change the hole.

## Implementation

Add pointer gesture handling to the shared `HoleNavigation` component. Record
the pointer's starting coordinates and compare them with the release
coordinates. Trigger navigation only when the horizontal distance is at least
50 pixels and greater than the vertical distance.

The component will call its existing `onPrevious` and `onNext` callbacks and
will check `canGoPrevious` and `canGoNext` before doing so. This preserves the
competition round's active-hole range and the custom game's 1-18 range without
duplicating navigation logic in either page.

The bar will use horizontal pan touch behavior so vertical page movement remains
available. Pointer events provide one implementation for touch, pen, and mouse
input without adding a gesture dependency.

## Accessibility

The existing buttons remain the keyboard-accessible and explicit navigation
controls. Swipe is an additional interaction, not the only way to change holes.
No visual redesign or new control is required.

## Testing

Add focused component tests covering:

- A left swipe invokes next-hole navigation.
- A right swipe invokes previous-hole navigation.
- Short gestures are ignored.
- Predominantly vertical gestures are ignored.
- Swipes at disabled boundaries do not invoke navigation.

Run the frontend unit tests, lint, production frontend deployment build, and a
mobile-sized browser verification on the supplied competition round route.

## Scope

This change applies wherever the shared `HoleNavigation` component is rendered,
currently competition rounds (including series and tour competitions) and
custom-game play. It does not add swipe navigation to the scoring content area,
tabs, scorecard modal, or other navigation surfaces.
