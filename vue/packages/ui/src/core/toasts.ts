import { onBeforeUnmount, onMounted, shallowRef, toRaw, useId, watch } from 'vue'

export type ToastStatus = 'neutral' | 'info' | 'loading' | 'success' | 'error'
export type ToastPosition = `${'top' | 'bottom'}-${'left' | 'center' | 'right'}`
export interface AnimatedToast {
  id: string
  title: string
  description?: string
  status?: ToastStatus
  duration?: number
  dismissible?: boolean
  action?: { label: string; onClick: (toast: AnimatedToast) => void }
  createdAt?: number
}
export type ToastInput = Omit<AnimatedToast, 'id' | 'createdAt'> & { id?: string }
export interface ToastOptions { initialToasts?: readonly ToastInput[]; defaultDuration?: number; limit?: number }
type Timer = { handle?: number; started: number; remaining: number; duration: number; createdAt?: number }
const focusHandlers = new WeakMap<AnimatedToast, (focused: boolean) => void>()

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
    return { duration: defaultDuration, dismissible: true, ...input, id: input.id ?? `${prefix}-toast-${++counter}`, createdAt: Date.now() }
  }
  function cap(items: AnimatedToast[]) {
    if (limit === undefined || !Number.isFinite(limit)) return items
    return limit > 0 ? items.slice(-Math.floor(limit)) : []
  }
  const toasts = shallowRef(cap(initialToasts.map(create)))

  function dismissToast(id: string) { toasts.value = toasts.value.filter(item => item.id !== id) }
  function clearToasts() { toasts.value = [] }
  function showToast(input: ToastInput) {
    const toast = create(input)
    toasts.value = cap([...toasts.value.filter(item => item.id !== toast.id), toast])
    return toast.id
  }
  function updateToast(id: string, patch: Partial<ToastInput>) {
    toasts.value = toasts.value.map(item => item.id === id ? {
      ...item, ...patch, id, createdAt: patch.duration === undefined ? item.createdAt : Date.now(),
    } : item)
  }
  function setToasts(next: AnimatedToast[] | ((items: AnimatedToast[]) => AnimatedToast[])) {
    toasts.value = cap(typeof next === 'function' ? next(toasts.value) : next)
  }
  function expire(id: string, timer: Timer) {
    timer.started = Date.now()
    timer.handle = window.setTimeout(() => dismissToast(id), Math.max(0, timer.remaining))
  }
  function setFocus(id: string, active: boolean) {
    const timer = timers.get(id)
    if (active) {
      focused.add(id)
      if (!timer || timer.handle === undefined) return
      window.clearTimeout(timer.handle)
      timer.handle = undefined
      timer.remaining -= Date.now() - timer.started
    } else if (focused.delete(id) && timer && timer.handle === undefined) expire(id, timer)
  }
  function sync() {
    if (!mounted) return
    const live = new Set(toasts.value.map(item => item.id))
    for (const id of focused) if (!live.has(id)) focused.delete(id)
    for (const [id, timer] of timers) {
      if (live.has(id)) continue
      window.clearTimeout(timer.handle)
      timers.delete(id)
    }
    for (const toast of toasts.value) {
      focusHandlers.set(toRaw(toast), active => setFocus(toast.id, active))
      const duration = toast.duration ?? defaultDuration
      const existing = timers.get(toast.id)
      if (existing && existing.duration === duration && existing.createdAt === toast.createdAt) continue
      if (existing) { window.clearTimeout(existing.handle); timers.delete(toast.id) }
      if (duration <= 0 || !Number.isFinite(duration)) continue
      const now = Date.now()
      const timer = { started: now, remaining: duration - (now - (toast.createdAt ?? now)), duration, createdAt: toast.createdAt }
      timers.set(toast.id, timer)
      if (!focused.has(toast.id)) expire(toast.id, timer)
    }
  }
  watch(toasts, sync, { flush: 'sync' })
  onMounted(() => { mounted = true; sync() })
  onBeforeUnmount(() => {
    mounted = false
    for (const timer of timers.values()) window.clearTimeout(timer.handle)
    for (const toast of toasts.value) focusHandlers.delete(toRaw(toast))
    timers.clear()
  })
  return { toasts, showToast, updateToast, dismissToast, clearToasts, setToasts }
}
