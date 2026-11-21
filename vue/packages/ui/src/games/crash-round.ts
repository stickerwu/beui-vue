import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, onMounted, reactive, shallowRef } from 'vue'
import { createCrashText, type CrashMessages } from './crash-messages'
import { createGameSounds, type GameSounds } from './game-sounds'
import { crashPoint } from './game-math'
import { EXIT, floor2, formatMultiplier, formatShort, heat, PRESS_GUARD, PULSE, SHAKE, SWAP } from './game-parts'

// Re-exported for the stages and the shell.
export { EXIT, floor2, formatMultiplier, formatShort, heat, PULSE, SHAKE, SWAP }

// The game every Crash design shares: the clock, the crash point, cashing out, milestones, history,
// sound and announcements. A design only draws it. Mirrors components/motion/crash/use-crash-game.ts.

/** A live round's crash point, tagged with the round `start` was given. */
export interface CrashReveal { round: number; value: number }

export interface CrashProps {
  /** Multiplier to cash out at automatically (controlled), or null for manual play. Applies from the next round. */
  autoCashOut?: number | null
  /** Initial auto cash-out when uncontrolled. Default null (off). */
  defaultAutoCashOut?: number | null
  /**
   * Decides each round's crash point, called once when the round starts. Return a number, or a Promise for one
   * (a server round): the main button shows Starting… until it settles, and a rejection returns to Start.
   * Ignored when `crashAt` is passed.
   */
  getCrashPoint?: () => number | Promise<number>
  /**
   * Live rounds (controlled), for a server that keeps the crash point secret until it happens: the round `start`
   * was given and its crash point once revealed, or null.
   */
  crashAt?: CrashReveal | null
  /** Play synthesized sounds (controlled). */
  sound?: boolean
  /** Initial sound state when uncontrolled. Default false. */
  defaultSound?: boolean
  /** Override built-in text for this instance. */
  labels?: Partial<Record<string, string>>
  onStart?: (round: number) => void
  onCashOut?: (multiplier: number) => void
  onCrash?: (point: number, payout: number | null) => void
  onSoundChange?: (enabled: boolean) => void
  onAutoCashOutChange?: (value: number | null) => void
}

export type CrashPhase = 'idle' | 'starting' | 'running' | 'crashed'

export interface CrashEmit {
  (event: 'start', round: number): void
  (event: 'cashOut', value: number): void
  (event: 'crash', point: number, payout: number | null): void
  (event: 'update:autoCashOut' | 'autoCashOutChange', value: number | null): void
  (event: 'update:sound' | 'soundChange', value: boolean): void
}

// The multiplier grows exponentially: 2x after 5.8s, 10x after 19s.
export const GROWTH = 0.12
export const growth = (seconds: number) => Math.exp(GROWTH * seconds)
export const timeAt = (multiplier: number) => Math.log(multiplier) / GROWTH
// The highest multiplier a round can show: an open live round stops climbing here rather than overflowing to Infinity.
const CEILING = 1e100

/** A passed crash point as the game plays it: at least 1 and floored to two decimals. Anything not finite plays as 1. */
const settle = (point: number) => {
  if (!Number.isFinite(point)) return 1
  return Math.max(1, floor2(Math.min(point, CEILING)))
}

/** Multipliers announced (and chimed) while the player is in: 2x to 5x, then 10x, 20x, 50x, 100x and on. */
export function milestone(index: number) {
  if (index < 4) return index + 2
  return [10, 20, 50][(index - 4) % 3]! * 10 ** Math.floor((index - 4) / 3)
}

// Auto cash-out targets offered in the menu, after Off.
export const AUTO_STEPS = [1.5, 2, 3, 5, 10, 25, 100]
// Skipping after a cash out runs the rest of the flight in at most this long.
const SKIP_TIME = 0.8
// Round numbers, unique on the page, so a live reveal kept by the parent across a remount can't match a fresh round.
let rounds = 0
const HISTORY = 12

export function useCrashGame(props: CrashProps, emit: CrashEmit) {
  const text = createCrashText(() => props.labels)
  const reduceRef = useReducedMotion()
  const reduce = computed(() => reduceRef.value ?? false)
  const internalAuto = shallowRef<number | null>(props.defaultAutoCashOut ?? null)
  const auto = computed(() => {
    const raw = props.autoCashOut === undefined ? internalAuto.value : props.autoCashOut
    return raw === null || raw === undefined || !Number.isFinite(raw) ? null : Math.max(1.01, floor2(raw))
  })
  const phase = shallowRef<CrashPhase>('idle')
  const round = shallowRef(0)
  const elapsed = shallowRef(0)
  const cashed = shallowRef<number | null>(null)
  // Seconds into the flight at the cash out. The value is floored to two decimals, so a design that counts steps needs the time.
  const cashedT = shallowRef<number | null>(null)
  const crashedAt = shallowRef<number | null>(null)
  const history = shallowRef<{ id: number; value: number }[]>([])
  const announcement = shallowRef('')
  // Counts milestones passed this round; each one pulses the readout.
  const pulse = shallowRef(0)
  // The auto target locked in when the round started.
  const roundAuto = shallowRef<number | null>(null)
  // Whether this round's crash point comes from `crashAt`, and whether a skip is running out the flight.
  const roundLive = shallowRef(false)
  const skipping = shallowRef(false)

  // The flight lives outside reactivity so each frame can read and advance it.
  const flight = {
    round: 0,
    live: false,
    t: 0,
    rate: 1,
    crash: 1,
    auto: null as number | null,
    milestone: 0,
    pressTime: Number.NEGATIVE_INFINITY,
    held: false,
  }
  let cashedNow: number | null = null
  // A round is in progress from Start until it crashes or fails to start. Read here, not from render state: two clicks in one frame both see the old phase.
  let busy = false
  let alive = true
  let frame = 0
  onMounted(() => { alive = true })

  const internalSound = shallowRef(props.defaultSound ?? false)
  const soundOn = computed(() => props.sound ?? internalSound.value)
  let player: GameSounds | null = null
  const getPlayer = () => (player ??= createGameSounds())
  onBeforeUnmount(() => {
    alive = false
    cancelAnimationFrame(frame)
    player?.dispose()
    player = null
  })

  const running = computed(() => phase.value === 'running')
  const starting = computed(() => phase.value === 'starting')
  const crashed = computed(() => phase.value === 'crashed')
  const crashKnown = computed(() => !roundLive.value || props.crashAt?.round === round.value)
  // A live round the server has ended while the display catches up.
  const overtaken = computed(() => running.value && roundLive.value && crashKnown.value)
  const t = computed(() => (crashed.value && crashedAt.value !== null ? timeAt(crashedAt.value) : elapsed.value))
  const multiplier = computed(() => (crashed.value && crashedAt.value !== null ? crashedAt.value : floor2(growth(t.value))))

  function cashOut(value: number, time: number) {
    if (!busy || cashedNow !== null) return
    cashedNow = value
    cashed.value = value
    cashedT.value = time
    announcement.value = text('announceCashedOut', { multiplier: formatMultiplier(value) })
    if (soundOn.value) getPlayer().cashOut()
    // A live cash out stands only if the crash point turns out above it.
    if (Number.isFinite(flight.crash)) emit('cashOut', value)
    else flight.held = true
  }

  // Takes off once the crash point is settled (Infinity: not yet revealed).
  function fly(id: number, crash: number, live: boolean) {
    Object.assign(flight, {
      round: id, live, t: 0, rate: 1, crash, auto: auto.value, milestone: 0,
      // Kept from start(): an async crash point can take a while, and the first tap after it lands is a real cash out.
      held: false,
    })
    roundLive.value = live
    skipping.value = false
    phase.value = 'running'
    announcement.value = auto.value === null ? text('announceStarted') : text('announceStartedAuto', { multiplier: formatMultiplier(auto.value) })
    loop()
  }

  function start() {
    if (busy) return
    busy = true
    rounds += 1
    const id = rounds
    // Before any state changes: if it throws, the round never began and the last one's result stays as it was.
    try { emit('start', id) } catch (error) { busy = false; throw error }
    // The guard against a double tap on Start cashing out at once.
    flight.pressTime = performance.now()
    cashedNow = null
    cashed.value = null
    cashedT.value = null
    crashedAt.value = null
    elapsed.value = 0
    pulse.value = 0
    roundAuto.value = auto.value
    round.value = id
    if (soundOn.value) getPlayer().prepare()
    const live = props.crashAt !== undefined
    if (live) { fly(id, Number.POSITIVE_INFINITY, true); return }
    let point: number | Promise<number>
    try { point = props.getCrashPoint ? props.getCrashPoint() : crashPoint() } catch { point = Promise.reject() }
    if (typeof point === 'number') { fly(id, settle(point), false); return }
    phase.value = 'starting'
    announcement.value = text('announceStarting')
    Promise.resolve(point).then(
      (value) => { if (alive) fly(id, settle(value), false) },
      () => {
        if (!alive) return
        busy = false
        phase.value = 'idle'
        announcement.value = text('announceStartFailed')
      },
    )
  }

  // Runs the rest of the flight quickly; reduced motion jumps to the crash. A live round still waiting on its crash point can't be run out.
  function skip() {
    if (!Number.isFinite(flight.crash)) return
    flight.rate = reduce.value ? 1e9 : Math.max(1, (timeAt(flight.crash) - flight.t) / SKIP_TIME)
    skipping.value = flight.rate > 1
  }

  function onFrame(dt: number) {
    // The round already ended: a frame booked before a throwing handler.
    if (!busy) return false
    const f = flight
    const wasIn = cashedNow === null
    const reveal = props.crashAt
    // A live round's crash point lands whenever the server reveals it; one already behind the plane crashes at once, at that value.
    // One ahead is a display running late: the flight runs out to it like a skip.
    if (f.live && !Number.isFinite(f.crash) && reveal && reveal.round === f.round) {
      f.crash = settle(reveal.value)
      f.rate = reduce.value ? 1e9 : Math.max(1, (timeAt(f.crash) - f.t) / SKIP_TIME)
      skipping.value = f.rate > 1
      // The server's crash came before the player's cash out: it never happened, so the round is lost after all.
      if (cashedNow !== null && cashedNow > f.crash) {
        cashedNow = null
        cashed.value = null
        cashedT.value = null
        f.held = false
      }
    }
    // The live round lost its crash point source mid-flight: it ends here. A held cash out was never confirmed, so it doesn't stand.
    if (f.live && props.crashAt === undefined && !Number.isFinite(f.crash)) {
      f.crash = settle(growth(f.t))
      if (f.held) {
        f.held = false
        cashedNow = null
        cashed.value = null
        cashedT.value = null
      }
    }
    // A held live cash out stands now the crash point is known.
    if (f.held && Number.isFinite(f.crash) && cashedNow !== null) {
      f.held = false
      emit('cashOut', cashedNow)
    }
    const end = timeAt(f.crash)
    f.t = Math.min(end, f.t + dt * f.rate, timeAt(CEILING))
    const value = growth(f.t)
    if (cashedNow === null) {
      // A target at or below the crash point always pays, at the target. The crash check covers a target equal to the crash point.
      if (f.auto !== null && f.auto <= f.crash && (value >= f.auto || f.t >= end)) cashOut(f.auto, timeAt(f.auto))
      else if (f.rate === 1 && f.t < end && Number.isFinite(value) && value >= milestone(f.milestone)) {
        // A long frame can cross several; only the last is told.
        while (value >= milestone(f.milestone + 1)) f.milestone++
        announcement.value = formatShort(milestone(f.milestone))
        pulse.value++
        f.milestone++
        if (soundOn.value) getPlayer().gem(f.milestone)
      }
    }
    if (f.t < end) {
      elapsed.value = f.t
      return true
    }
    busy = false
    f.pressTime = performance.now()
    skipping.value = false
    crashedAt.value = f.crash
    phase.value = 'crashed'
    history.value = [{ id: f.round, value: f.crash }, ...history.value].slice(0, HISTORY)
    announcement.value = cashedNow === null
      ? text('announceLost', { multiplier: formatMultiplier(f.crash) })
      // A cash out on this same frame would otherwise never be heard.
      : `${wasIn ? `${text('announceCashedOut', { multiplier: formatMultiplier(cashedNow) })} ` : ''}${text('announceCrashed', { multiplier: formatMultiplier(f.crash) })}`
    if (soundOn.value) getPlayer().mine()
    emit('crash', f.crash, cashedNow)
    return false
  }

  function loop() {
    cancelAnimationFrame(frame)
    let last = performance.now()
    // performance.now(), not the frame timestamp, so both ends share one clock.
    const step = () => {
      const now = performance.now()
      const dt = Math.max(0, now - last) / 1000
      last = now
      // The next frame is booked first, so a handler that throws can't stall a running round; the crash cancels it.
      frame = requestAnimationFrame(step)
      let more = false
      try { more = onFrame(dt) } finally { if (!more) cancelAnimationFrame(frame) }
    }
    frame = requestAnimationFrame(step)
  }

  function setAuto(value: string) {
    const next = value === 'off' ? null : Number(value)
    if (props.autoCashOut === undefined) internalAuto.value = next
    emit('update:autoCashOut', next)
    emit('autoCashOutChange', next)
  }
  // A custom target from the prop gets its own option, so the menu can show it.
  const autoOptions = computed(() => {
    const value = auto.value
    return value === null || AUTO_STEPS.includes(value) ? AUTO_STEPS : [...AUTO_STEPS, value].sort((a, b) => a - b)
  })

  function toggleSound() {
    const next = !soundOn.value
    if (next) getPlayer().prepare()
    if (props.sound === undefined) internalSound.value = next
    emit('update:sound', next)
    emit('soundChange', next)
  }

  /** Start, cash out or skip, whichever the round is ready for. */
  function act() {
    const now = performance.now()
    // A double tap on Start mustn't cash out at 1.01x, nor a mashed cash out skip or start the next round.
    if (starting.value || now - flight.pressTime < PRESS_GUARD) return
    if (!running.value) start()
    else if (cashedNow === null) {
      // The server already ended this live round; the display is catching up.
      if (overtaken.value || (flight.live && Number.isFinite(flight.crash))) return
      flight.pressTime = now
      cashOut(floor2(growth(flight.t)), flight.t)
    } else skip()
  }
  const actionLabel = computed(() => starting.value
    ? text('starting')
    : running.value
      ? cashed.value === null
        ? overtaken.value ? text('crashing') : text('cashOut', { multiplier: formatMultiplier(multiplier.value) })
        : crashKnown.value ? text('skip') : text('waiting')
      : crashed.value ? text('playAgain') : text('start'))
  /** The main action can't act right now: the crash point is still coming, or a live round is already over. */
  const actionBusy = computed(() => starting.value || (running.value && cashed.value !== null && !crashKnown.value) || (overtaken.value && cashed.value === null))

  // Red is kept for a loss: a crash after a cash out is no bad news.
  const lost = computed(() => crashed.value && cashed.value === null)
  const eyebrow = computed(() => text(lost.value ? 'stateCrashed' : crashed.value ? 'stateCashedOut' : running.value ? 'stateFlying' : starting.value ? 'stateStarting' : 'stateReady'))
  const status = computed(() => {
    // In flight the round's locked target, not a menu change made since.
    const shownAuto = running.value ? roundAuto.value : auto.value
    if (crashed.value) {
      if (cashed.value !== null) {
        // Within 10% of the crash is a close call.
        return multiplier.value / cashed.value < 1.1
          ? text('statusCloseCall', { multiplier: formatMultiplier(multiplier.value) })
          : text('statusFlewOn', { multiplier: formatMultiplier(multiplier.value) })
      }
      return roundAuto.value !== null ? text('statusShort', { target: formatShort(roundAuto.value) }) : text('statusStillIn')
    }
    if (shownAuto !== null) return text('statusAuto', { multiplier: formatMultiplier(shownAuto) })
    return running.value ? text('statusFlying') : text('statusIdle')
  })
  // What a design marks ahead of the flight: the auto target until it pays, and the last round's crash point as a faint trace.
  const target = computed(() => (cashed.value !== null || crashed.value ? null : running.value ? roundAuto.value : auto.value))
  const ghost = computed(() => (crashed.value ? history.value[1] : history.value[0])?.value ?? null)

  return reactive({
    reduce,
    /** The built-in fair crash point decides the round, so "1 in m" odds hold. */
    fair: computed(() => props.crashAt === undefined && !props.getCrashPoint),
    target,
    ghost,
    roundAuto,
    phase,
    running,
    starting,
    crashed,
    lost,
    /** A skip is running the rest of the flight out; scenery that streams with t would only flicker. */
    skipping,
    /** Seconds into the flight, frozen at the crash. */
    t,
    multiplier,
    cashed,
    cashedT,
    round,
    pulse,
    history,
    auto,
    autoOptions,
    setAuto,
    soundOn,
    toggleSound,
    act,
    actionLabel,
    actionBusy,
    eyebrow,
    status,
    announcement,
    text,
  })
}

export type CrashGameState = ReturnType<typeof useCrashGame>
export type { CrashMessages }
