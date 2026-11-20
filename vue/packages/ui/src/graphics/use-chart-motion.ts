import { onMounted, onBeforeUnmount, shallowRef, watch, type ComputedRef, type Ref } from 'vue'
import type { Point } from './chart-geometry'

export function useChartMotion(targets: ComputedRef<Map<string, Point>>, width: Ref<number>) {
  const points = shallowRef(targets.value)
  let frame = 0
  let media: MediaQueryList | undefined
  function snap() {
    cancelAnimationFrame(frame)
    points.value = targets.value
  }
  onMounted(() => {
    media = window.matchMedia('(prefers-reduced-motion: reduce)')
    media.addEventListener('change', snap)
    watch([targets, width], ([next, size], [, oldSize]) => {
      cancelAnimationFrame(frame)
      if (media?.matches || size !== oldSize || !points.value.size) {
        points.value = next
        return
      }
      const start = points.value
      const started = performance.now()
      function draw(now: number) {
        const elapsed = Math.max(0, now - started) / 1000
        if (elapsed >= 0.48) { points.value = next; return }
        const distance = (1 + 18 * elapsed) * Math.exp(-18 * elapsed)
        const result = new Map<string, Point>()
        for (const [key, target] of next) {
          const previous = start.get(key) ?? target
          result.set(key, {
            x: target.x + (previous.x - target.x) * distance,
            y: target.y + (previous.y - target.y) * distance,
          })
        }
        points.value = result
        frame = requestAnimationFrame(draw)
      }
      frame = requestAnimationFrame(draw)
    })
  })
  onBeforeUnmount(() => { cancelAnimationFrame(frame); media?.removeEventListener('change', snap) })
  return points
}
