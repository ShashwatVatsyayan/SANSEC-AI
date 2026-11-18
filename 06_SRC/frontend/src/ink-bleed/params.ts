export type Theme = 'light' | 'dark';

/** Live-tunable look of the ink. */
export interface InkParams {
  /** Seconds for the spread (before the 150ms fade). */
  duration: number;
  /** Tendril reach multiplier, 0 = clean blob. */
  tendril: number;
  /** Noise frequency multiplier: lower = bigger, lazier shapes. */
  noiseScale: number;
  /** Frontier half-width in CSS px. */
  softness: number;
  /** Speed at which the shape evolves during the spread. */
  drift: number;
  /** Global playback rate (0.25 for slow motion). */
  timeScale: number;
}

export const inkParams: InkParams = {
  duration: 1.25,
  tendril: 1.05,
  noiseScale: 1.0,
  softness: 1.4,
  drift: 1.0,
  timeScale: 1.0,
};

/** Pigment colour pooled at the frontier, keyed by the theme being revealed. */
export const RIM_COLOR: Record<Theme, [number, number, number]> = {
  dark: [0.03, 0.04, 0.06], // ink density matching #080a0f obsidian page
  light: [0.98, 0.98, 0.99], // bleach density matching #f8fafc light page
};
