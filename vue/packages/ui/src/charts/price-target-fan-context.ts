import { computed, inject, provide, shallowRef, useId, type InjectionKey } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { interpolate, useHoverCapable, readonlyView } from './plot-utils'

/** English defaults. Override per instance with `labels`. */
export const priceTargetFanMessages = {
  label: 'Price target · 12 months',
  chart: '{label}: mean {mean}, now {current}',
  target: '{key} target',
  targetButton: '{key} target {price}, {analysts} analysts',
  history: 'Price history',
  price: 'Price',
  analysts: 'Analysts',
  vsNow: 'vs now',
  now: 'Now',
  horizon: 'Target',
}
export type PriceTargetFanMessages = typeof priceTargetFanMessages

export interface PriceTarget {
  key: string
  price: number
  analysts: number
  /** Any CSS color; the projection, its dot and its label take it. */
  color?: string
}
export interface PriceHistoryPoint { date: string; price: number }
export type PriceTargetFanActive = { type: 'history'; date: string } | { type: 'target'; key: string }

export interface PriceTargetFanProps {
  /** Accessible name of the chart. */
  label?: string
  /** Last traded price; the history walks to this point. */
  current: number
  /** High, mean and low targets, in that order. */
  targets: readonly [PriceTarget, PriceTarget, PriceTarget]
  /** Axis labels, oldest to horizon. */
  dates?: { start?: string; mid?: string; horizon?: string }
  /** Actual prices, oldest first, using ISO dates. Empty history renders only the current price and targets. */
  history?: readonly PriceHistoryPoint[]
  active?: PriceTargetFanActive | null
  defaultActive?: PriceTargetFanActive | null
  /** Override any built-in string. */
  labels?: Partial<PriceTargetFanMessages>
}
export type PriceTargetFanEmit = {
  (event: 'update:active', value: PriceTargetFanActive | null): void
  (event: 'activeChange', value: PriceTargetFanActive | null): void
}
export interface PriceTargetFanOverlay {
  px: number
  py: number
  title: string
  metrics: { label: string; value: string }[]
  accent: { label: string; value: string; color: string } | null
}

export const PTF_W = 520
export const PTF_H = 236
export const PTF_PAD = { l: 36, r: 108, t: 16, b: 28 }
/** A hue as text: capped lightness in light so 11px numbers reach AA; native in dark (`--ptf-ink-l` flips per theme on the root). */
export const ptfInk = (color: string) => `oklch(from ${color} min(l, var(--ptf-ink-l, 1)) c h)`
const W = PTF_W, H = PTF_H, PAD = PTF_PAD
const scrubDate = (date: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(date))
export const ptfAxisDate = (date: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', year: 'numeric' }).format(new Date(date))
const COLORS = ['var(--ptf-success)', 'var(--ptf-accent)', 'var(--ptf-warning)']

/**
 * Analyst price targets. A year of history draws itself to now, then three dashed projections fan out to the high, mean and
 * low targets. The hot target owns the header; scrubbing the history or hovering a target glides a value card beside the
 * point. Targets are focusable and a tap toggles them on touch; Escape lets go.
 */
export function usePriceTargetFanModel(props: PriceTargetFanProps, emit: PriceTargetFanEmit) {
  const t = (key: keyof PriceTargetFanMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? priceTargetFanMessages[key], values)
  const label = computed(() => props.label ?? t('label'))
  const reduce = useReducedMotion()
  const canHover = useHoverCapable()
  const clipId = useId()
  const fadeId = `${clipId}-fade`
  const tooltipId = useId()
  /** The chart's svg; `PriceTargetFanSvg` registers it so the tooltip can anchor to it. */
  const svg = shallowRef<SVGSVGElement | null>(null)

  const history = computed(() => props.history ?? [])
  const dates = computed(() => props.dates ?? {})
  const local = shallowRef(props.defaultActive ?? null)
  const requested = computed(() => props.active === undefined ? local.value : props.active)
  function setActive(next: PriceTargetFanActive | null) {
    if (props.active === undefined) local.value = next
    emit('update:active', next); emit('activeChange', next)
  }
  const targetIndex = computed(() => {
    const value = requested.value
    return value?.type === 'target' ? props.targets.findIndex(target => target.key === value.key) : -1
  })
  const historyIndex = computed(() => {
    const value = requested.value
    return value?.type === 'history' ? history.value.findIndex(point => point.date === value.date) : -1
  })
  const active = computed(() => targetIndex.value >= 0 || historyIndex.value >= 0 ? requested.value : null)
  const hotT = computed(() => targetIndex.value >= 0 ? targetIndex.value : null)
  const scrub = computed(() => historyIndex.value >= 0 ? historyIndex.value : null)
  const setHotT = (index: number | null) => setActive(index === null ? null : { type: 'target', key: props.targets[index].key })
  const setScrub = (index: number | null) => setActive(index === null ? null : { type: 'history', date: history.value[index].date })

  const hist = computed(() => {
    let previous = Number.NEGATIVE_INFINITY
    return history.value.map(point => {
      const time = Date.parse(point.date)
      if (!/^\d{4}-\d{2}-\d{2}(?:T.*(?:Z|[+-]\d{2}:\d{2}))?$/.test(point.date) || !Number.isFinite(time) || time <= previous || !Number.isFinite(point.price) || point.price <= 0) {
        throw new RangeError('PriceTargetFan history must contain positive prices and ascending, unique ISO dates')
      }
      previous = time
      return point.price
    })
  })
  // Invalid input is a programming error, as upstream: reject it before any derived value is built from it.
  function assertValid() {
    if (!Number.isFinite(props.current) || props.current <= 0 || props.targets.length !== 3 || props.targets.some(target => !Number.isFinite(target.price) || target.price <= 0) || new Set(props.targets.map(target => target.key)).size !== 3) {
      throw new RangeError('PriceTargetFan requires a positive current price and three positive targets with unique keys')
    }
  }
  // the domain follows the data: whatever history and targets arrive, the chart fills its height instead of assuming a $150-250 stock
  const domain = computed(() => {
    assertValid()
    const values = [props.current, ...hist.value, ...props.targets.map(target => target.price)]
    const lo = Math.min(...values), hi = Math.max(...values)
    const pad = Math.max((hi - lo) * 0.06, 0.5)
    return { min: lo - pad, max: hi + pad }
  })
  const y = (value: number) => PAD.t + (1 - (value - domain.value.min) / (domain.value.max - domain.value.min)) * (H - PAD.t - PAD.b)
  const pct = (price: number) => (price - props.current) / props.current * 100
  const fmt = (price: number) => `$${price.toFixed(2)}`

  const geo = computed(() => {
    const histW = (W - PAD.l - PAD.r) * 0.56
    const nowX = PAD.l + histW
    const times = history.value.map(point => Date.parse(point.date))
    const first = times[0] ?? 0, last = times[times.length - 1] ?? first
    const hx = (i: number) => last === first ? nowX - 12 : PAD.l + (times[i] - first) / (last - first) * (histW - 12)
    const nowY = y(props.current)
    const endX = W - PAD.r
    const line = hist.value.map((value, i) => `${i === 0 ? 'M' : 'L'}${hx(i).toFixed(1)},${y(value).toFixed(1)}`).join(' ') + (hist.value.length ? ` L${nowX},${nowY}` : '')
    const proj = props.targets.map((target, i) => {
      const ty = y(target.price)
      const cx = nowX + (endX - nowX) * 0.5
      const cy = nowY + (ty - nowY) * 0.15
      return { ...target, color: target.color ?? COLORS[i], ty, d: `M${nowX},${nowY} Q${cx},${cy} ${endX},${ty}`, cx, cy }
    })
    return { hx, nowX, nowY, endX, line, proj }
  })

  function onMove(event: PointerEvent) {
    if (!canHover.value || event.pointerType === 'touch') return
    const element = svg.value
    if (!element) return
    const box = element.getBoundingClientRect()
    const g = geo.value
    const px = (event.clientX - box.left) / box.width * W
    if (px > g.nowX + 6) {
      // in the fan the nearest projection owns the pointer, so the card walks from high to mean to low as the pointer drifts
      const py = (event.clientY - box.top) / box.height * H
      const u = Math.min(1, (px - g.nowX) / (g.endX - g.nowX))
      const ys = g.proj.map(p => (1 - u) * (1 - u) * g.nowY + 2 * (1 - u) * u * p.cy + u * u * p.ty)
      let nearest = 0, best = Number.POSITIVE_INFINITY
      ys.forEach((cy, i) => { const d = Math.abs(py - cy); if (d < best) { best = d; nearest = i } })
      // right after now the three curves still overlap; picking one there would be a guess
      setHotT(Math.max(...ys) - Math.min(...ys) < 24 ? null : nearest)
      return
    }
    if (!hist.value.length || px > g.nowX - 6) { setActive(null); return }
    let nearest = 0
    for (let i = 1; i < hist.value.length; i++) if (Math.abs(g.hx(i) - px) < Math.abs(g.hx(nearest) - px)) nearest = i
    setScrub(nearest)
  }

  // a hovered target wins over the scrub; the card sits on whichever side keeps it in view
  const overlay = computed<PriceTargetFanOverlay | null>(() => {
    const g = geo.value
    if (hotT.value !== null) {
      const p = g.proj[hotT.value]
      const up = p.price >= props.current
      return {
        px: g.endX, py: p.ty,
        // the horizon rides in the faint header so the target has a date without a row
        title: `${t('target', { key: p.key })}${dates.value.horizon ? ` · ${dates.value.horizon}` : ''}`,
        // one metric per row, label against value; the move sits alone under a hairline
        metrics: [{ label: t('price'), value: fmt(p.price) }, { label: t('analysts'), value: String(p.analysts) }],
        accent: { label: t('vsNow'), value: `${up ? '+' : '−'}${Math.abs(pct(p.price)).toFixed(1)}%`, color: p.color },
      }
    }
    if (scrub.value !== null) {
      return { px: g.hx(scrub.value), py: y(hist.value[scrub.value]), title: scrubDate(history.value[scrub.value].date), metrics: [{ label: t('price'), value: fmt(hist.value[scrub.value]) }], accent: null }
    }
    return null
  })
  const mean = computed(() => props.targets[1])
  // whichever target is hot owns the header; the mean holds it otherwise
  const head = computed(() => hotT.value !== null ? geo.value.proj[hotT.value] : { key: mean.value.key, price: mean.value.price, color: undefined as string | undefined })
  const headPct = computed(() => pct(head.value.price))
  // round-numbered gridlines derived from the domain, at most four of them
  const gridVals = computed(() => {
    const span = domain.value.max - domain.value.min
    const mag = 10 ** Math.floor(Math.log10(span / 3.2))
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= 4.2) ?? 10 * mag
    const out: number[] = []
    for (let v = Math.ceil(domain.value.min / step) * step; v <= domain.value.max; v += step) out.push(v)
    // decimals the grid step needs, so 2.5 labels as "152.5" and 0.25 as "0.25"
    let decimals = 0
    while (decimals < 8 && !Number.isInteger(Number((step * 10 ** decimals).toFixed(6)))) decimals++
    return { step, out, decimals }
  })

  const setSvg = (value: typeof svg.value) => { svg.value = value }
  return {
    reduce, clipId, fadeId, svg: readonlyView(svg), setSvg, tooltipId, active, setActive, scrub, hotT, setHotT, setScrub, hist, history, current: computed(() => props.current),
    targets: computed(() => props.targets), dates, label, t, y, pct, fmt, geo, overlay, mean, head, headPct, gridVals, onMove,
  }
}

export type PriceTargetFanModel = ReturnType<typeof usePriceTargetFanModel>
const KEY: InjectionKey<PriceTargetFanModel> = Symbol('price-target-fan')

export function providePriceTargetFan(model: PriceTargetFanModel) { provide(KEY, model) }

/** The state of the enclosing `PriceTargetFan`; its parts must be rendered inside it. */
export function usePriceTargetFan() {
  const model = inject(KEY, null)
  if (!model) throw new Error('PriceTargetFan parts must be inside PriceTargetFan')
  return model
}
