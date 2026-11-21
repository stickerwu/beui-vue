// Geometry for the gooey popover (ported from `components/motion/popover.tsx`).
export type Side = 'top' | 'bottom'
export type Align = 'start' | 'center' | 'end'

const CIRCLE_KAPPA = 0.5523
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export interface Rect { x: number; y: number; w: number; h: number; r: number }
export interface Geo { layerW: number; layerH: number; left: number; top: number; trigger: Rect; panel: Rect }

/** Trigger rect and panel rect in a shared local coordinate box. */
export function buildGeo(tW: number, tH: number, cW: number, cH: number, side: Side, align: Align, gap: number, panelRadius: number): Geo {
  const py = side === 'bottom' ? tH + gap : -(gap + cH)
  const px = align === 'start' ? 0 : align === 'end' ? tW - cW : (tW - cW) / 2
  const left = Math.min(0, px)
  const top = Math.min(0, py)
  const layerW = Math.max(tW, px + cW) - left
  const layerH = Math.max(tH, py + cH) - top
  const triggerRadius = Math.min(tH / 2, panelRadius)
  return {
    layerW, layerH, left, top,
    trigger: { x: -left, y: -top, w: tW, h: tH, r: triggerRadius },
    panel: { x: px - left, y: py - top, w: cW, h: cH, r: panelRadius },
  }
}

function rectAtProgress(geo: Geo, p: number): Rect {
  const { trigger: t, panel } = geo
  return { x: lerp(t.x, panel.x, p), y: lerp(t.y, panel.y, p), w: lerp(t.w, panel.w, p), h: lerp(t.h, panel.h, p), r: lerp(t.r, panel.r, p) }
}

function insetFor(rect: Rect, layerW: number, layerH: number) {
  return `inset(${rect.y}px ${layerW - (rect.x + rect.w)}px ${layerH - (rect.y + rect.h)}px ${rect.x}px round ${rect.r}px)`
}

function roundedRectShape(rect: Rect) {
  const radius = Math.max(0, Math.min(rect.r, rect.w / 2, rect.h / 2))
  const control = radius * CIRCLE_KAPPA
  const x1 = rect.x, y1 = rect.y, x2 = rect.x + rect.w, y2 = rect.y + rect.h
  const px = (value: number) => `${value.toFixed(3)}px`
  return `shape(from ${px(x1 + radius)} ${px(y1)}, `
    + `line to ${px(x2 - radius)} ${px(y1)}, `
    + `curve to ${px(x2)} ${px(y1 + radius)} with ${px(x2 - radius + control)} ${px(y1)} / ${px(x2)} ${px(y1 + radius - control)}, `
    + `line to ${px(x2)} ${px(y2 - radius)}, `
    + `curve to ${px(x2 - radius)} ${px(y2)} with ${px(x2)} ${px(y2 - radius + control)} / ${px(x2 - radius + control)} ${px(y2)}, `
    + `line to ${px(x1 + radius)} ${px(y2)}, `
    + `curve to ${px(x1)} ${px(y2 - radius)} with ${px(x1 + radius - control)} ${px(y2)} / ${px(x1)} ${px(y2 - radius + control)}, `
    + `line to ${px(x1)} ${px(y1 + radius)}, `
    + `curve to ${px(x1 + radius)} ${px(y1)} with ${px(x1)} ${px(y1 + radius - control)} / ${px(x1 + radius - control)} ${px(y1)}, `
    + 'close)'
}

export function clipForProgress(geo: Geo, progress: number, supportsShape: boolean) {
  const rect = rectAtProgress(geo, progress)
  return supportsShape ? roundedRectShape(rect) : insetFor(rect, geo.layerW, geo.layerH)
}

function roundedRectPath(rect: Rect) {
  const radius = Math.max(0, Math.min(rect.r, rect.w / 2, rect.h / 2))
  const n = (value: number) => value.toFixed(3)
  const x1 = rect.x, y1 = rect.y, x2 = rect.x + rect.w, y2 = rect.y + rect.h
  const arc = `A${n(radius)} ${n(radius)} 0 0 1`
  return `M${n(x1 + radius)} ${n(y1)}`
    + `H${n(x2 - radius)}${arc} ${n(x2)} ${n(y1 + radius)}`
    + `V${n(y2 - radius)}${arc} ${n(x2 - radius)} ${n(y2)}`
    + `H${n(x1 + radius)}${arc} ${n(x1)} ${n(y2 - radius)}`
    + `V${n(y1 + radius)}${arc} ${n(x1 + radius)} ${n(y1)}Z`
}

/**
 * The goo layer is portalled above the page, so its copy of the trigger pill
 * would cover the real trigger's label and focus ring. Punching the trigger
 * back out keeps the real one visible (a clip path, not a mask: WebKit ignores
 * `mask: url(#id)` for SVG masks).
 */
export function triggerCutout(geo: Geo) {
  const layer = { x: 0, y: 0, w: geo.layerW, h: geo.layerH, r: 0 }
  return `path(evenodd, "${roundedRectPath(layer)} ${roundedRectPath(geo.trigger)}")`
}

export function supportsShapeClip() {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
    && CSS.supports('clip-path', 'shape(from 0px 0px, line to 1px 1px, close)')
}
