import { inject, onBeforeUnmount, onMounted, shallowRef, type InjectionKey, type Ref, type ShallowRef } from 'vue'
import { useMotionValue, type MotionValue } from 'motion-v'
import type Lenis from 'lenis'
import { useReducedMotion } from '../core/reduced-motion'

export interface SmoothScrollApi {
  container: Readonly<Ref<HTMLElement | undefined>>
  /** Underlying Lenis engine, or `null` on the reduced-motion / native path. */
  lenis: Readonly<ShallowRef<Lenis | null>>
  /** Scroll position as 0..1 of the scrollable height. */
  progress: MotionValue<number>
  /** Current scroll offset in px. */
  scrollY: MotionValue<number>
  /** Signed scroll velocity (px/frame); drives velocity-based effects. */
  velocity: MotionValue<number>
  /** Programmatic smooth scroll. Respects reduced motion (jumps instantly). */
  scrollTo: (target: number | string | HTMLElement, options?: { offset?: number; duration?: number; immediate?: boolean }) => void
}

export const scrollKey: InjectionKey<SmoothScrollApi> = Symbol('beui-scroll')

/** The provider's API, or `null` when no `SmoothScroll` is above. Internal: components that pick their own fallback. */
export const useSmoothScrollProvider = () => inject(scrollKey, null)

/**
 * Read the page's smooth-scroll state. Inside `<SmoothScroll>` it returns the shared motion values;
 * outside it falls back to a native window scroll listener so scroll-driven code still works without the provider.
 */
export function useSmoothScroll(): SmoothScrollApi {
  const provided = inject(scrollKey, null)
  if (provided) return provided
  const reduce = useReducedMotion()
  const progress = useMotionValue(0)
  const scrollY = useMotionValue(0)
  const velocity = useMotionValue(0)
  const container = shallowRef<HTMLElement | undefined>(undefined)
  const lenis = shallowRef<Lenis | null>(null)
  let lastY = 0
  let lastT = 0
  function onScroll() {
    const y = window.scrollY
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    const now = performance.now()
    const dt = now - lastT || 16
    scrollY.set(y)
    progress.set(max > 0 ? y / max : 0)
    velocity.set((y - lastY) / dt * 16)
    lastY = y
    lastT = now
  }
  onMounted(() => {
    lastY = window.scrollY
    lastT = performance.now()
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
  })
  onBeforeUnmount(() => { if (typeof window !== 'undefined') window.removeEventListener('scroll', onScroll) })
  const scrollTo: SmoothScrollApi['scrollTo'] = (target, options = {}) => {
    let top: number
    if (typeof target === 'number') top = target + (options.offset ?? 0)
    else {
      let element: Element | null
      try { element = typeof target === 'string' ? document.querySelector(target) : target } catch { return }
      if (!element) return
      top = element.getBoundingClientRect().top + window.scrollY + (options.offset ?? 0)
    }
    window.scrollTo({ top, behavior: reduce.value || options.immediate ? 'instant' : 'smooth' })
  }
  return { container, lenis, progress, scrollY, velocity, scrollTo }
}
