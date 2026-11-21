// Tower geometry and the pure helpers the stage and the ticket miniature share. Mirrors the top of components/motion/crash/crash-tower.tsx.

// One block per +8% on the multiplier, so block k lands at exactly 1.08^k: one every 0.64s, while the readout keeps accelerating.
export const STEP = 1.08
// Block geometry in px. The baseline is the slab's top, measured from the stage bottom.
export const BLOCK_H = 13
export const PITCH = 16
export const BASE = 28

// Slightly varied widths and alternating offsets, fixed per index, so it reads as hand-stacked.
export const width = (k: number) => 60 + ((k * 7) % 4) * 4
export const offset = (k: number) => (k % 2 ? 1 : -1) * (2 + ((k * 5) % 3))
// A fixed jagged crack per block, 2 or 3 segments, in a 100x13 box stretched to the block.
export const crack = (k: number) => {
  const x = 18 + ((k * 29) % 60)
  const lean = k % 2 ? 6 : -6
  return k % 3
    ? `M${x},0L${x + lean},6L${x - lean / 2},13`
    : `M${x},0L${x + lean},4L${x - lean},9L${x + lean / 2},13`
}
// The block on top when the multiplier reaches m.
export const blockOf = (m: number) => Math.floor(Math.log(m) / Math.log(STEP) + 1e-9)
// The block on top at a time into the flight.
export const blockAt = (t: number) => Math.floor((t * 0.12) / Math.log(STEP) + 1e-9)
export const markRise = (m: number, cam: number) => (blockOf(m) - cam) * PITCH + BLOCK_H
