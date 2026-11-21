import type { InjectionKey, Ref } from 'vue'

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left'
export type TooltipAlign = 'start' | 'center' | 'end'
export type TooltipPoint = { x: number; y: number }

export interface TooltipTiming {
  /** Delay before a hover opens a tooltip (ms). */
  delay: Readonly<Ref<number>>
  /** Delay before a tooltip closes once the pointer has left it (ms). */
  closeDelay: Readonly<Ref<number>>
  /** After one tooltip closes, others open instantly for this long (ms). */
  skipDelay: Readonly<Ref<number>>
}
export const TIMING_KEY: InjectionKey<TooltipTiming> = Symbol('beui-tooltip-timing')

/* ---- grace corridor (ported from components/motion/tooltip/grace.ts) ------- */
type Point = { x: number; y: number }
type Box = { left: number; top: number; right: number; bottom: number }

/**
 * The corridor a pointer may cross between the trigger and the open tooltip
 * without closing it: the convex hull of where it left and the box it is
 * heading for. A fixed timeout either cuts a slow diagonal move short or keeps
 * the label alive after the pointer has plainly gone elsewhere.
 */
export function graceArea(exit: Point, target: Box): Point[] {
  const pad = 5
  return hull([
    { x: exit.x - pad, y: exit.y - pad }, { x: exit.x + pad, y: exit.y - pad },
    { x: exit.x - pad, y: exit.y + pad }, { x: exit.x + pad, y: exit.y + pad },
    { x: target.left, y: target.top }, { x: target.right, y: target.top },
    { x: target.right, y: target.bottom }, { x: target.left, y: target.bottom },
  ])
}
export function inBox(point: Point, box: Box) {
  return point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom
}
export function inPolygon(point: Point, polygon: Point[]) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}
function hull(points: Point[]) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lower: Point[] = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: Point[] = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

/**
 * How the user last reached for the page. A focus a mouse press caused is not a
 * request to read the label; a focus that followed a key is the only way a
 * keyboard user sees it at all.
 */
let modality: 'keyboard' | 'pointer' = 'keyboard'
let listening = false
export function watchModality() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('keydown', () => { modality = 'keyboard' }, true)
  window.addEventListener('pointerdown', () => { modality = 'pointer' }, true)
}
export function focusFromKeyboard() { return modality === 'keyboard' }

/* ---- placement (offset + flip + shift + arrow, the floating-ui subset the tooltip used) */
export interface PlacementInput {
  /** Reference box in viewport coordinates (zero size for a cursor point). */
  reference: { left: number; top: number; width: number; height: number }
  floating: { width: number; height: number }
  side: TooltipSide
  align: TooltipAlign
  offset: number
  viewport: { width: number; height: number }
  padding?: number
  /** Arrow box size, when there is an arrow to place. */
  arrow?: number
}
export interface PlacementResult { x: number; y: number; side: TooltipSide; arrowX?: number; arrowY?: number }

const OPPOSITE: Record<TooltipSide, TooltipSide> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }

function coordsFor(input: PlacementInput, side: TooltipSide) {
  const { reference: r, floating: f, align, offset } = input
  const vertical = side === 'top' || side === 'bottom'
  let x: number
  let y: number
  if (vertical) {
    x = align === 'start' ? r.left : align === 'end' ? r.left + r.width - f.width : r.left + r.width / 2 - f.width / 2
    y = side === 'top' ? r.top - f.height - offset : r.top + r.height + offset
  } else {
    y = align === 'start' ? r.top : align === 'end' ? r.top + r.height - f.height : r.top + r.height / 2 - f.height / 2
    x = side === 'left' ? r.left - f.width - offset : r.left + r.width + offset
  }
  return { x, y }
}
function overflowOn(input: PlacementInput, side: TooltipSide, c: { x: number; y: number }) {
  const pad = input.padding ?? 8
  const { floating: f, viewport: v } = input
  if (side === 'top') return pad - c.y
  if (side === 'bottom') return c.y + f.height - (v.height - pad)
  if (side === 'left') return pad - c.x
  return c.x + f.width - (v.width - pad)
}

export function computePlacement(input: PlacementInput): PlacementResult {
  const pad = input.padding ?? 8
  let side = input.side
  let c = coordsFor(input, side)
  const first = overflowOn(input, side, c)
  if (first > 0) {
    const flipped = OPPOSITE[side]
    const fc = coordsFor(input, flipped)
    if (overflowOn(input, flipped, fc) < first) { side = flipped; c = fc }
  }
  const vertical = side === 'top' || side === 'bottom'
  const { floating: f, viewport: v, reference: r } = input
  let { x, y } = c
  // Shift along the cross axis so the surface stays inside the viewport.
  if (vertical) x = Math.max(pad, Math.min(x, v.width - f.width - pad))
  else y = Math.max(pad, Math.min(y, v.height - f.height - pad))
  const result: PlacementResult = { x, y, side }
  if (input.arrow) {
    const size = input.arrow
    const arrowPad = 10
    if (vertical) {
      const center = r.left + r.width / 2 - x - size / 2
      result.arrowX = Math.max(arrowPad, Math.min(center, f.width - size - arrowPad))
    } else {
      const center = r.top + r.height / 2 - y - size / 2
      result.arrowY = Math.max(arrowPad, Math.min(center, f.height - size - arrowPad))
    }
  }
  return result
}
