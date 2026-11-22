import { onBeforeUnmount, onMounted, shallowRef, watch, type ComputedRef, type Ref } from 'vue'
import { animate, motionValue, type MotionValue } from 'motion-v'
import { layoutSpring } from '../core/motion'
import type { Point } from './chart-geometry'

type Animated = { x: MotionValue<number>; y: MotionValue<number> }

/**
 * One spring per coordinate, keyed by identity (the upstream `useAnimatedPoints`). Paths, dots and fills read the same
 * published map, so a data change morphs every mark together on `layoutSpring`. An interrupting update retargets from the
 * live position and velocity; a resize or reduced motion jumps, because the data did not change.
 */
export function useChartMotion(targets: ComputedRef<Map<string, Point>>, width: Ref<number>) {
  const points = shallowRef(targets.value)
  const values = new Map<string, Animated>()
  let controls: { stop: () => void }[] = []
  const unsubscribe: (() => void)[] = []
  let queued = false
  let media: MediaQueryList | undefined

  // The motion loop updates many values per frame; publishing once after they settle keeps one render per frame.
  function publish() {
    if (queued) return
    queued = true
    queueMicrotask(() => {
      queued = false
      points.value = new Map([...targets.value.keys()].flatMap(key => {
        const value = values.get(key)
        return value ? [[key, { x: value.x.get(), y: value.y.get() }] as const] : []
      }))
    })
  }
  function stop() { for (const control of controls) control.stop(); controls = [] }
  function ensure(key: string, target: Point) {
    let value = values.get(key)
    if (!value) {
      value = { x: motionValue(target.x), y: motionValue(target.y) }
      values.set(key, value)
      unsubscribe.push(value.x.on('change', publish), value.y.on('change', publish))
    }
    return value
  }
  function snap() {
    stop()
    for (const [key, target] of targets.value) { const value = ensure(key, target); value.x.jump(target.x); value.y.jump(target.y) }
    points.value = targets.value
  }

  onMounted(() => {
    media = window.matchMedia('(prefers-reduced-motion: reduce)')
    media.addEventListener('change', snap)
    for (const [key, target] of targets.value) ensure(key, target)
    watch([targets, width], ([next, size], [, oldSize]) => {
      stop()
      for (const key of values.keys()) if (!next.has(key)) values.delete(key)
      const jump = media?.matches || size !== oldSize
      for (const [key, target] of next) {
        const existed = values.has(key)
        const value = ensure(key, target)
        if (jump || !existed) { value.x.jump(target.x); value.y.jump(target.y) }
        else controls.push(animate(value.x, target.x, layoutSpring), animate(value.y, target.y, layoutSpring))
      }
      if (jump) points.value = next
      else publish()
    })
  })
  onBeforeUnmount(() => { stop(); for (const off of unsubscribe) off(); media?.removeEventListener('change', snap) })
  return points
}
