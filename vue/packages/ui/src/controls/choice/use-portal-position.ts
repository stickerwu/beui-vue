import { onBeforeUnmount, shallowRef, watch, type Ref } from 'vue'

export interface PortalLayout {
  trigger: { left: number; top: number; width: number; height: number }
  content: { width: number; height: number }
}

/** Measures a trigger and a portalled panel in viewport coordinates (port of `popover-position.ts`). */
export function usePortalPosition(trigger: Ref<HTMLElement | null | undefined>, content: Ref<HTMLElement | null | undefined>, active: Ref<boolean>) {
  const layout = shallowRef<PortalLayout | null>(null)
  function update() {
    const t = trigger.value
    const c = content.value
    if (!t || !c) return
    const rect = t.getBoundingClientRect()
    const next: PortalLayout = { trigger: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }, content: { width: c.offsetWidth, height: c.offsetHeight } }
    const a = layout.value
    if (a && a.trigger.left === next.trigger.left && a.trigger.top === next.trigger.top && a.trigger.width === next.trigger.width && a.trigger.height === next.trigger.height && a.content.width === next.content.width && a.content.height === next.content.height) return
    layout.value = next
  }
  watch([trigger, content, active], (_, __, onCleanup) => {
    update()
    if (!active.value) return
    const observer = new ResizeObserver(update)
    if (trigger.value) observer.observe(trigger.value)
    if (content.value) observer.observe(content.value)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    onCleanup(() => { observer.disconnect(); window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update) })
  }, { flush: 'post', immediate: true })
  onBeforeUnmount(() => { layout.value = null })
  return { layout, update }
}
