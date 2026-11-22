import { useMotionValue, type MotionValue } from 'motion-v'
import { watch } from 'vue'

/**
 * Mirrors reactive Vue state (props, refs, computeds) into a motion value.
 *
 * `useTransform(() => ...)` only re-runs when a motion value it read with
 * `.get()` changes, so a prop or ref read there goes stale while the motion
 * values rest. Read `source.get()` inside the callback instead. React re-renders
 * the transform on every prop change, which is why upstream does not need this.
 */
export function useMotionSource<T>(source: () => T): MotionValue<T> {
  const value = useMotionValue(source())
  watch(source, next => value.set(next), { flush: 'sync' })
  return value
}
