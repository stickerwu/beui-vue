import { onMounted, shallowRef, watch, type Ref } from 'vue'

interface VisibilityOptions { once: boolean; amount: number | 'some' | 'all'; root?: Element | null; margin?: string }

export function useVisibility(element: Ref<HTMLElement | null>, options: () => VisibilityOptions) {
  const entered = shallowRef(false)
  onMounted(() => {
    watch([element, options], ([target, settings], _, onCleanup) => {
      if (!target || (entered.value && settings.once)) return
      const threshold = settings.amount === 'some' ? 0 : settings.amount === 'all' ? 1 : Math.min(1, Math.max(0, settings.amount))
      const observer = new IntersectionObserver(entries => {
        const entry = entries[entries.length - 1]
        if (!entry) return
        entered.value = entry.isIntersecting && entry.intersectionRatio >= threshold
        if (settings.once && entered.value) observer.disconnect()
      }, { root: settings.root ?? null, rootMargin: settings.margin, threshold })
      observer.observe(target)
      onCleanup(() => observer.disconnect())
    }, { immediate: true, flush: 'post' })
  })
  return entered
}
