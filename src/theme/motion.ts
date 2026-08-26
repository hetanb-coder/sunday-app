/** Small cross-system motion vocabulary. Values are intentionally restrained. */
export const motion = {
  duration: {
    response: 90,
    reveal: 180,
    move: 280,
    gather: 520,
    reduced: 120,
  },
  stagger: {
    gather: 46,
    arrival: 52,
  },
  spring: {
    standard: { damping: 22, stiffness: 260, mass: 0.62 },
    settle: { damping: 24, stiffness: 220, mass: 0.72 },
  },
} as const;
