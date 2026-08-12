export type PointerPosition = {
  x: number;
  y: number;
};

const SWIPE_THRESHOLD_PX = 48;

export function getRecommendationSwipeDelta(
  start: PointerPosition,
  end: PointerPosition,
): -1 | 0 | 1 {
  const horizontalDistance = end.x - start.x;
  const verticalDistance = end.y - start.y;

  if (
    Math.abs(horizontalDistance) < SWIPE_THRESHOLD_PX ||
    Math.abs(horizontalDistance) <= Math.abs(verticalDistance)
  ) {
    return 0;
  }

  return horizontalDistance < 0 ? 1 : -1;
}
