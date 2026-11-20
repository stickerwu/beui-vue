import { computed, onBeforeUnmount, shallowRef } from 'vue'
import { crashPoint, floor2, formatMultiplier } from './game-math'

export interface CrashReveal { round: number; value: number }
export interface CrashProps {
  autoCashOut?: number | null
  defaultAutoCashOut?: number | null
  getCrashPoint?: () => number | Promise<number>
  crashAt?: CrashReveal | null
  sound?: boolean
  defaultSound?: boolean
  labels?: Partial<Record<string, string>>
  onStart?: (round: number) => void
  onCashOut?: (multiplier: number) => void
  onCrash?: (point: number, payout: number | null) => void
  onSoundChange?: (enabled: boolean) => void
  onAutoCashOutChange?: (value: number | null) => void
}
let nextRound = 0
const ceiling = 1e100
const settle = (point: number) => Number.isFinite(point) ? Math.max(1, floor2(Math.min(ceiling, point))) : 1
const timeAt = (point: number) => Math.log(point) / .12

export function useCrashRound(props: CrashProps, events: {
  start: (id: number) => void
  cash: (value: number) => void
  crash: (point: number, payout: number | null) => void
  chime: (frequency: number) => void
}) {
  const phase = shallowRef<'idle' | 'starting' | 'running' | 'crashed'>('idle')
  const value = shallowRef(1)
  const cashed = shallowRef<number | null>(null)
  const auto = shallowRef<number | null>(props.defaultAutoCashOut ?? null)
  const target = computed(() => props.autoCashOut === undefined ? auto.value : props.autoCashOut)
  const history = shallowRef<{ id: number; point: number }[]>([])
  const announcement = shallowRef('')
  const canSkip = shallowRef(false)
  let round = 0
  let live = false
  let point = Infinity
  let rate = 1
  let elapsed = 0
  let lastTime = 0
  let held = false
  let autoTarget: number | null = null
  let frame = 0
  let alive = true
  let milestone = 2
  let pressAfter = 0
  function payout(amount: number) {
    cashed.value = amount
    held = !Number.isFinite(point)
    canSkip.value = !held
    if (!held) events.cash(amount)
    announcement.value = `Cashed out at ${formatMultiplier(amount)}`
    events.chime(740)
  }
  function accelerate() {
    if (!Number.isFinite(point)) return
    rate = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1e9 : Math.max(1, (timeAt(point) - elapsed) / .8)
  }
  function advance(now: number) {
    if (!alive || phase.value !== 'running') return
    if (live && !Number.isFinite(point)) {
      if (props.crashAt?.round === round) {
        point = settle(props.crashAt.value)
        accelerate()
        if (cashed.value !== null && cashed.value > point) { held = false; cashed.value = null }
      } else if (props.crashAt === undefined) {
        point = settle(value.value)
        if (held) { held = false; cashed.value = null }
      }
      if (Number.isFinite(point) && held && cashed.value !== null) {
        held = false
        canSkip.value = true
        events.cash(cashed.value)
      }
    }
    const end = Math.min(timeAt(point), timeAt(ceiling))
    elapsed = Math.min(end, elapsed + Math.max(0, now - lastTime) / 1000 * rate)
    lastTime = now
    value.value = Math.min(ceiling, Math.exp(.12 * elapsed))
    if (cashed.value === null && autoTarget !== null && autoTarget <= point && (value.value >= autoTarget || elapsed >= end)) payout(autoTarget)
    if (cashed.value === null && value.value >= milestone) {
      events.chime(440 + Math.min(700, milestone * 30))
      milestone = milestone < 5 ? milestone + 1 : milestone * 2
    }
    if (Number.isFinite(point) && elapsed >= end) {
      value.value = point
      phase.value = 'crashed'
      history.value = [{ id: round, point }, ...history.value].slice(0, 12)
      announcement.value = `Crashed at ${formatMultiplier(point)}`
      pressAfter = now + 200
      events.chime(100)
      events.crash(point, cashed.value)
    } else frame = requestAnimationFrame(advance)
  }
  async function start() {
    if (phase.value === 'running' || phase.value === 'starting' || performance.now() < pressAfter) return
    round = ++nextRound
    phase.value = 'starting'
    const id = round
    live = props.crashAt !== undefined
    const chosen = target.value
    autoTarget = chosen !== null && Number.isFinite(chosen) && chosen >= 1.01 ? chosen : null
    events.start(id)
    try { point = live ? Infinity : settle(await (props.getCrashPoint ?? crashPoint)()) }
    catch { if (alive) { phase.value = 'idle'; announcement.value = 'Could not start round' }; return }
    if (!alive || id !== round) return
    held = false; cashed.value = null; canSkip.value = false
    value.value = 1; elapsed = 0; rate = 1; milestone = 2
    lastTime = performance.now(); pressAfter = lastTime + 200
    phase.value = 'running'; announcement.value = 'Round started'
    frame = requestAnimationFrame(advance)
  }
  function cashOut() {
    const now = performance.now()
    if (phase.value !== 'running' || now < pressAfter || cashed.value !== null || (live && Number.isFinite(point))) return
    cancelAnimationFrame(frame)
    advance(now)
    if (phase.value !== 'running' || cashed.value !== null || (live && Number.isFinite(point))) return
    pressAfter = now + 200
    payout(settle(value.value))
  }
  onBeforeUnmount(() => { alive = false; cancelAnimationFrame(frame) })
  return { phase, value, cashed, target, auto, history, announcement, canSkip, start, cashOut, skip: accelerate }
}
