import { onBeforeUnmount, onMounted, shallowRef, toRaw, useId, watch, type VNodeChild } from 'vue'

export type ToastStatus = 'neutral' | 'info' | 'loading' | 'success' | 'error'
export type ToastPosition = `${'top' | 'bottom'}-${'left' | 'center' | 'right'}`

export type AnimatedToastAction = {
  label: VNodeChild
  onClick: (toast: AnimatedToast) => void
}

export type AnimatedToast = {
  id: string
  title: VNodeChild
  description?: VNodeChild
  status?: ToastStatus
  icon?: VNodeChild
  action?: AnimatedToastAction
  duration?: number
  dismissible?: boolean
  createdAt?: number
}

export type ToastInput = Omit<AnimatedToast, 'id' | 'createdAt'> & { id?: string }

export type ToastClassNames = {
  root?: string
  item?: string
  surface?: string
  iconWrap?: string
  content?: string
  title?: string
  description?: string
  action?: string
  close?: string
  progress?: string
}

export interface ToastOptions {
  initialToasts?: readonly ToastInput[]
  defaultDuration?: number
  limit?: number
}

/** English defaults. Override per instance with `labels`. */
export const animatedToastStackMessages = {
  /** Accessible name of the toast list itself. */
  list: 'Notifications',
  dismiss: 'Dismiss toast',
}

export type AnimatedToastStackMessages = typeof animatedToastStackMessages

/**
 * A running dismissal timer. `remaining` is what it has left to run, frozen
 * while a toast holds focus; `signature` is the `createdAt` + `duration` pair
 * it was started for, so an in-place update that keeps the duration keeps the
 * countdown while one that changes it restarts.
 */
type Timer = { handle?: number, started: number, remaining: number, signature: string }

const focusHandlers = new WeakMap<AnimatedToast, (focused: boolean) => void>()

/**
 * Pause or resume a toast's dismissal timer. `ToastItem` calls this as focus
 * enters and leaves it, so a keyboard user reaching a toast's action is not
 * raced by the countdown. The React original has no such pause — this is the
 * one deliberate addition to its behaviour, and it moves no motion.
 */
export function toastFocusChanged(toast: AnimatedToast, focused: boolean) {
  focusHandlers.get(toRaw(toast))?.(focused)
}

export function useAnimatedToastStack({ initialToasts = [], defaultDuration = 4200, limit }: ToastOptions = {}) {
  const prefix = useId()
  let counter = 0
  let mounted = false
  const timers = new Map<string, Timer>()
  const focused = new Set<string>()

  function create(input: ToastInput): AnimatedToast {
    return {
      duration: defaultDuration,
      dismissible: true,
      ...input,
      id: input.id ?? `${prefix}-toast-${++counter}`,
      createdAt: Date.now(),
    }
  }
  // Only `showToast` trims to `limit`: the initial list and `setToasts` are
  // handed over untouched, exactly as React's state setter takes them.
  const toasts = shallowRef(initialToasts.map(create))

  function dismissToast(id: string) {
    toasts.value = toasts.value.filter(item => item.id !== id)
  }
  function clearToasts() {
    toasts.value = []
  }
  function showToast(input: ToastInput) {
    const toast = create(input)
    const next = [...toasts.value, toast]
    toasts.value = typeof limit === 'number' ? next.slice(-limit) : next
    return toast.id
  }
  function updateToast(id: string, patch: Partial<ToastInput>) {
    toasts.value = toasts.value.map(item => item.id === id
      ? {
          ...item,
          ...patch,
          id,
          // A new duration restarts the countdown from now; a title or status
          // swap alone must not hand the reader a fresh one.
          createdAt: patch.duration === undefined ? item.createdAt : Date.now(),
        }
      : item)
  }
  function setToasts(next: AnimatedToast[] | ((items: AnimatedToast[]) => AnimatedToast[])) {
    toasts.value = typeof next === 'function' ? next(toasts.value) : next
  }

  function startTimer(id: string, timer: Timer) {
    timer.started = Date.now()
    timer.handle = window.setTimeout(() => {
      timers.delete(id)
      dismissToast(id)
    }, Math.max(0, timer.remaining))
  }

  function setFocus(id: string, active: boolean) {
    const timer = timers.get(id)
    if (active) {
      focused.add(id)
      if (!timer || timer.handle === undefined) return
      window.clearTimeout(timer.handle)
      timer.handle = undefined
      timer.remaining -= Date.now() - timer.started
      return
    }
    if (focused.delete(id) && timer && timer.handle === undefined) startTimer(id, timer)
  }

  /**
   * Reconcile timers with the current list. React does this in an effect after
   * every commit; Vue reaches the same point with a post-flush watcher, and the
   * mount guard stands in for "effects only run on the client", so a server
   * render never schedules anything.
   */
  function sync() {
    if (!mounted) return
    const live = new Set(toasts.value.map(item => item.id))

    for (const id of focused) if (!live.has(id)) focused.delete(id)

    // Toasts that left the list take their timers with them.
    for (const [id, timer] of timers) {
      if (live.has(id)) continue
      window.clearTimeout(timer.handle)
      timers.delete(id)
    }

    for (const toast of toasts.value) {
      focusHandlers.set(toRaw(toast), active => setFocus(toast.id, active))
      const duration = toast.duration ?? defaultDuration
      const existing = timers.get(toast.id)

      // `0` (or a negative) means the toast stays until something dismisses it.
      if (duration <= 0) {
        if (existing) {
          window.clearTimeout(existing.handle)
          timers.delete(toast.id)
        }
        continue
      }

      const createdAt = toast.createdAt ?? Date.now()
      const signature = `${createdAt}:${duration}`
      if (existing?.signature === signature) continue
      if (existing) window.clearTimeout(existing.handle)

      // Measured from `createdAt`, so a toast created before this stack mounted
      // only gets what is left of its duration.
      const timer: Timer = {
        started: 0,
        remaining: Math.max(duration - (Date.now() - createdAt), 0),
        signature,
      }
      timers.set(toast.id, timer)
      if (!focused.has(toast.id)) startTimer(toast.id, timer)
    }
  }

  watch(toasts, sync, { flush: 'post' })
  onMounted(() => {
    mounted = true
    sync()
  })
  // Unmounting a stack clears every outstanding timeout, as the React cleanup
  // effect does, so a dismissed stack never fires into a dead list.
  onBeforeUnmount(() => {
    mounted = false
    for (const timer of timers.values()) window.clearTimeout(timer.handle)
    for (const toast of toasts.value) focusHandlers.delete(toRaw(toast))
    timers.clear()
    focused.clear()
  })

  return { toasts, showToast, updateToast, dismissToast, clearToasts, setToasts }
}
