// Constants and pure helpers every Crash design shares. Mirrors the non-component half of components/motion/crash/crash-parts.tsx.
import { easeInOut, easeOut } from '../core/motion'

/** The width of the viewBox an SVG stage draws in. */
export const STAGE_W = 400

// The ticket rises once each design's crash (tumble, pop, topple: 0.6s to 0.75s) has mostly played.
export const TICKET_DELAY = 0.7
// Rises with a little settle (a rare, end-of-round moment), leaves quickly.
export const CARD_IN = { type: 'spring', duration: 0.4, bounce: 0.15 } as const
export const CARD_OUT = { duration: 0.15, ease: easeOut } as const
// Inside, chunks arrive in reading order, then the flight replays.
export const CHUNK = { duration: 0.25, ease: easeOut } as const
// The tear line sits this far down; the side notches are cut there.
export const TEAR = 104

// The parachute drifting down from a cash out is a once-a-round moment, so it may take its time.
export const CHUTE = {
  y: { duration: 2.2, ease: easeOut },
  rotate: { duration: 2.2, ease: easeInOut },
  opacity: { duration: 2.2, times: [0, 0.08, 0.7, 1] },
} as const

// A burst spreads from the crash.
export const BURST = { duration: 0.45, ease: easeOut } as const

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Wraps scenery that streams past into a loop `span` long. */
export const wrap = (value: number, span: number) => ((value % span) + span) % span

/** A tick step of 1, 2 or 5 times a power of ten, at least `min`. */
export function niceAtLeast(min: number) {
  const power = 10 ** Math.floor(Math.log10(min))
  // toPrecision drops float noise (0.30000000000000004), so steps add up cleanly.
  return Number((([1, 2, 5, 10].find((unit) => unit * power >= min) ?? 10) * power).toPrecision(12))
}

/** Every miniature is 88 x 48, like Mines' mini map. */
export const MINI = { width: 88, height: 48 } as const
// The replay starts once the ticket's figures are in, and draws over 0.6s.
export const MINI_REPLAY = { delay: 0.3, duration: 0.6, ease: easeOut } as const

/** What a design's ticket miniature replays: the round's crash, your cash out and a missed target. */
export interface CrashMiniatureProps {
  crash: number
  cashed: number | null
  /** Seconds into the flight at the cash out, for designs that count steps. */
  cashedT: number | null
  /** The auto target, only when the round crashed short of it. */
  target: number | null
  reduce: boolean
}

// Falls only (EASE_IN in lib/ease.ts).
export const easeIn = [0.55, 0, 1, 0.45] as const

/** Cubic-bezier timing as a pure function, so a tween can be sampled per frame. */
export function cubicBezier([x1, y1, x2, y2]: readonly [number, number, number, number]) {
  return (progress: number) => {
    if (progress <= 0) return 0
    if (progress >= 1) return 1
    let lower = 0
    let upper = 1
    for (let index = 0; index < 20; index++) {
      const time = (lower + upper) / 2
      const inverse = 1 - time
      const x = 3 * inverse * inverse * time * x1 + 3 * inverse * time * time * x2 + time ** 3
      if (x < progress) lower = time
      else upper = time
    }
    const time = (lower + upper) / 2
    const inverse = 1 - time
    return 3 * inverse * inverse * time * y1 + 3 * inverse * time * time * y2 + time ** 3
  }
}
