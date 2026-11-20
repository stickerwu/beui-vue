import { useReducedMotion, useSpring } from 'motion-v'
import { onMounted, onScopeDispose, shallowRef, watchEffect } from 'vue'

export function useHoverSpring() {
  const reduce = useReducedMotion()
  const hover = shallowRef(false)
  const config = {stiffness:200, damping:15, mass:0.3}
  const horizontal = useSpring(0, config)
  const vertical = useSpring(0, config)
  let media: MediaQueryList | undefined
  const sync = () => { hover.value = media?.matches ?? false }
  onMounted(() => {
    media = matchMedia('(hover:hover) and (pointer:fine)')
    sync()
    media.addEventListener('change', sync)
  })
  onScopeDispose(() => media?.removeEventListener('change', sync))
  watchEffect(() => {
    if (reduce.value || !hover.value) { horizontal.jump(0); vertical.jump(0) }
  })
  function position(event: PointerEvent) {
    if (!hover.value || reduce.value || event.pointerType === 'touch') return
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    if (rect.width && rect.height) return {left:event.clientX - rect.left, top:event.clientY - rect.top, rect}
  }
  function reset() { horizontal.set(0); vertical.set(0) }
  return { horizontal, vertical, position, reset, hover, reduce }
}
