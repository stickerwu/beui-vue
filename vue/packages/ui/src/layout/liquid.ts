// The "goo" silhouette behind a set of Liquid items: several rounded rects,
// blurred and re-thresholded, so separate shapes read as one surface that
// stretches between them. Ported from beUI's components/motion/liquid.tsx.

export type LiquidEase = readonly [number, number, number, number]

export interface LiquidTransition {
  duration?: number
  ease?: LiquidEase
}

export interface LiquidBox {
  x: number
  y: number
  width: number
  height: number
  radius: number
}

/** Cubic-bezier timing as a pure function, so a tween can be sampled per frame. */
export function cubicBezier([x1, y1, x2, y2]: LiquidEase) {
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
