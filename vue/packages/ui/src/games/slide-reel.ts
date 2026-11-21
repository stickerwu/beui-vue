// Geometry, seeded filler and card faces of the slide game's reel. Mirrors the constants of
// components/motion/slide-game.tsx.
import { slideResult } from './game-math'
import { heat, type Heat } from './game-parts'

export const CARD_WIDTH = 80
export const CARD_HEIGHT = 108
export const GAP = 10
export const PITCH = CARD_WIDTH + GAP
// Cover-flow geometry, by distance from the center in cards: the center card sits 12% larger and
// flat, neighbours turn up to 50deg toward it and fade.
export const CENTER_SCALE = 1.12
export const SCALE_STEP = 0.1
export const MIN_SCALE = 0.8
export const TURN_STEP = 30
export const MAX_TURN = 50
export const FADE_STEP = 0.16
export const MIN_FADE = 0.3
// Cards kept on each side of the center when a new round starts, so the strip on screen never changes.
export const CONTEXT = 6
// Filler cards that race past before the result, and after it.
export const SPIN_TILES = 48
export const TAIL = 6
// The slide runs out anywhere inside the result card, not dead center, so the last cards creep
// past the tabs and the stop reads as physical. Then the card clicks into the center on a short
// spring, like a detent.
export const LANDING_SPREAD = 0.7
export const DETENT = { type: 'spring', duration: 0.35, bounce: 0.2 } as const
// A game reveal, not UI chrome: it starts at full speed and spends most of its time creeping
// through the last few cards, where the suspense is. The 300ms UI budget does not apply to it.
export const SLIDE_EASE = [0.12, 0.7, 0.16, 1] as const
// Edge tabs: a notch hanging from the stage's top and bottom edges at the center.
export const TAB_HEIGHT = 15
export const TAB_CLEARANCE = 12
// The landed card swells once as it locks.
export const LOCK = { duration: 0.4, ease: [0.16, 1, 0.3, 1] } as const

export type Round = { id: number; result: number; target: number; bet: number }
export type Tile = { id: string; multiplier: number }
export type ReelState = {
  tiles: Tile[]
  landed: number
  round: Round | null
  from: number
  /** Where the slide runs out, inside the result card. */
  to: number
  /** The result card centered between the tabs. */
  rest: number
}

/** Seeded by the round, so the server and client agree on every card. */
export function seeded(seed: string) {
  let state = 2166136261
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619)
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Decorative cards on the game's own curve, capped so they fit a card. */
export function filler(rand: () => number, count: number, prefix: string): Tile[] {
  return Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i}`, multiplier: Math.min(1000, slideResult(rand)) }))
}

/** Reel offset that puts card `index` at the center. */
export const positionOf = (index: number, offset = 0) => -(index * PITCH + CARD_WIDTH / 2 + offset)

export const INITIAL: ReelState = (() => {
  const rand = seeded('slide')
  // The center starts on 1.00x, so the stage reads as a fresh game, not a result.
  const tiles = [...filler(rand, CONTEXT, 'a'), { id: 'start', multiplier: 1 }, ...filler(rand, CONTEXT, 'b')]
  const at = positionOf(CONTEXT)
  return { tiles, landed: CONTEXT, round: null, from: at, to: at, rest: at }
})()

/** Card and pill tier: slate under 2x, primary to 10x, amber to 100x, then fuchsia. */
export const face = (multiplier: number): Heat | 'jackpot' => (multiplier >= 100 ? 'jackpot' : heat(multiplier))
