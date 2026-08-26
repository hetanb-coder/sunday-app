export const REACTION_ASSETS = {
  clap: {
    source: require('../../assets/reactions/clap.json'),
    durationMs: 733,
  },
  heart: {
    source: require('../../assets/reactions/heart.json'),
    durationMs: 1833,
  },
  strong: {
    source: require('../../assets/reactions/flex.json'),
    durationMs: 1567,
  },
  fire: {
    source: require('../../assets/reactions/fire.json'),
    durationMs: 1083,
  },
  sparkle: {
    source: require('../../assets/reactions/raise-hands.json'),
    durationMs: 1833,
  },
} as const;

export type AnimatedReactionKey = keyof typeof REACTION_ASSETS;

export const getReactionAsset = (key: string) =>
  REACTION_ASSETS[key as AnimatedReactionKey] ?? REACTION_ASSETS.clap;
