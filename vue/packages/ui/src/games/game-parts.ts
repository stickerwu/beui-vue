// Pieces the casino games share, so each one only draws its own stage: the multiplier format and
// heat colours, motion presets for status lines and markers, and pure helpers. Mirrors
// components/motion/casino/game-parts.tsx. The recent-rounds strip, the state eyebrow and the
// sound toggle are GameHistory.vue, GameEyebrow.vue and SoundToggle.vue.
import { easeOut } from '../core/motion'

/** Presses this soon after a round starts or ends are the same press repeated, not the next action (ms). */
export const PRESS_GUARD = 400
/** Status lines and markers swap on a spring with no bounce. */
export const SWAP = { type: 'spring', duration: 0.3, bounce: 0 } as const
/** Exits are shorter than entrances. */
export const EXIT = { duration: 0.12, ease: easeOut } as const
/** A loss shakes the readout once, quickly. */
export const SHAKE = { duration: 0.3, ease: easeOut } as const
/** A milestone or a win swells the readout and lets it settle with a little give. */
export const PULSE = { type: 'spring', duration: 0.35, bounce: 0.3 } as const

export type Heat = 'cool' | 'warm' | 'hot'
/** How hot a multiplier reads: cool under 2x, warm to 10x, hot beyond. */
export function heat(multiplier: number): Heat {
  return multiplier >= 10 ? 'hot' : multiplier >= 2 ? 'warm' : 'cool'
}

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1, roundingMode: 'trunc' } as Intl.NumberFormatOptions)
/** Large values: compact up to trillions, then scientific (1.4e100). */
function formatLarge(multiplier: number) {
  if (multiplier < 1e15) return compact.format(multiplier)
  const [mantissa, exponent] = multiplier.toExponential(6).split('e')
  return `${Math.floor(Number(mantissa) * 10) / 10}e${Number(exponent)}`
}

/** Floors to two decimals, the precision every game settles at. */
export function floor2(value: number) {
  return Math.floor(value * 100 + 1e-9) / 100
}
/** A multiplier's number without the sign: 2.50, or shortened when large (12.5K, 1.4e20). */
export function formatOdds(multiplier: number) {
  return multiplier < 10_000 ? multiplier.toFixed(2) : formatLarge(multiplier)
}
/** A multiplier as the games show it: 2.50x, or shortened when large. */
export function formatMultiplier(multiplier: number) {
  return `${formatOdds(multiplier)}×`
}
/** Scale and menu labels: 1.5x, 2x, 1.2Kx. */
export function formatShort(multiplier: number) {
  return `${multiplier < 1000 ? +multiplier.toFixed(2) : formatLarge(multiplier)}×`
}

export interface GameHistoryEntry { id: number; value: number }
export type EyebrowState = 'idle' | 'live' | 'won' | 'lost'
