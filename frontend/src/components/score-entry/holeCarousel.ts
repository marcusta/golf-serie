const MOMENTUM_PROJECTION_MS = 180;
const MAX_CAROUSEL_STEPS = 4;
const MIN_DRAG_DISTANCE = 12;

interface CalculateCarouselStepsInput {
  dragDistance: number;
  velocity: number;
  itemWidth: number;
}

export function wrapCarouselIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

export function getHoleAtOffset(
  activeHoles: number[],
  currentHole: number,
  offset: number
): number {
  if (activeHoles.length === 0) return currentHole;

  const currentIndex = Math.max(0, activeHoles.indexOf(currentHole));
  return activeHoles[
    wrapCarouselIndex(currentIndex + offset, activeHoles.length)
  ];
}

export function calculateCarouselSteps({
  dragDistance,
  velocity,
  itemWidth,
}: CalculateCarouselStepsInput): number {
  if (itemWidth <= 0 || Math.abs(dragDistance) < MIN_DRAG_DISTANCE) {
    return 0;
  }

  const projectedDistance =
    dragDistance + velocity * MOMENTUM_PROJECTION_MS;
  const projectedSteps = Math.round(-projectedDistance / itemWidth);

  return Math.max(
    -MAX_CAROUSEL_STEPS,
    Math.min(MAX_CAROUSEL_STEPS, projectedSteps)
  );
}
