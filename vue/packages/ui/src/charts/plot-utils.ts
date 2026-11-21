import { onBeforeUnmount, onMounted, shallowRef, type Ref } from 'vue'

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

/** Measured border-box size of `element`, kept current by a ResizeObserver. */
export function useMeasuredSize(element: Ref<HTMLElement | null>, initial: { width: number; height: number }) {
  const size = shallowRef(initial)
  let observer: ResizeObserver | undefined
  onMounted(() => {
    const plot = element.value
    if (!plot) return
    const measure = () => {
      const { width, height } = plot.getBoundingClientRect()
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
