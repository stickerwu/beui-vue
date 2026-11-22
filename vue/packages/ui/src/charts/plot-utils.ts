import { computed, onBeforeUnmount, onMounted, shallowRef, type ComputedRef, type Ref } from 'vue'

/** `(hover: hover) and (pointer: fine)` — only true hover devices get hover-driven highlights. */
export function useHoverCapable() {
  const canHover = shallowRef(false)
  let query: MediaQueryList | undefined
  const update = () => { canHover.value = Boolean(query?.matches) }
  onMounted(() => {
    if (!window.matchMedia) return
    query = window.matchMedia('(hover: hover) and (pointer: fine)')
    update()
    query.addEventListener?.('change', update)
  })
  onBeforeUnmount(() => query?.removeEventListener?.('change', update))
  return canHover
}

/**
 * Layout size of `element` (clientWidth/clientHeight), kept current by a ResizeObserver.
 * Mirrors upstream `useElementWidth`: a client rect would include ancestor transforms,
 * so a chart inside a scaled preview card would draw at the shrunken width.
 */
export function useMeasuredSize(element: Ref<HTMLElement | null>, initial: { width: number; height: number }) {
  const size = shallowRef(initial)
  let observer: ResizeObserver | undefined
  onMounted(() => {
    const plot = element.value
    if (!plot) return
    const measure = () => {
      const width = plot.clientWidth
      const height = plot.clientHeight
      if (width > 0 && height > 0 && (size.value.width !== width || size.value.height !== height)) size.value = { width, height }
    }
    measure()
    observer = new ResizeObserver(measure)
    observer.observe(plot)
  })
  onBeforeUnmount(() => observer?.disconnect())
  return size
}

/** Fill `{name}` placeholders, as the library's `useMessages` does. */
export function interpolate(template: string, values: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => key in values ? String(values[key]) : match)
}

export const SR_ONLY = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0'

/** Width of `element` in CSS pixels (0 until mounted), kept current by a ResizeObserver. */
export function useElementWidth(element: Ref<HTMLElement | null>) {
  const width = shallowRef(0)
  let observer: ResizeObserver | undefined
  onMounted(() => {
    const node = element.value
    if (!node) return
    width.value = node.clientWidth
    observer = new ResizeObserver(() => { width.value = node.clientWidth })
    observer.observe(node)
  })
  onBeforeUnmount(() => observer?.disconnect())
  return width
}

/** True once `amount` of `element` has been on screen (and stays true). Without IntersectionObserver it is true on mount. */
export function useInViewOnce(element: Ref<HTMLElement | null>, amount = 0.3) {
  const inView = shallowRef(false)
  let observer: IntersectionObserver | undefined
  onMounted(() => {
    const node = element.value
    if (!node) return
    if (!('IntersectionObserver' in window)) { inView.value = true; return }
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { inView.value = true; observer?.disconnect() }
    }, { threshold: amount })
    observer.observe(node)
  })
  onBeforeUnmount(() => observer?.disconnect())
  return inView
}

/** A read-only view of a ref: parts of a compound chart read shared state through it and change it only through the model's actions. */
export const readonlyView = <T>(source: { value: T }): ComputedRef<T> => computed(() => source.value)
