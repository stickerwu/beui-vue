import { useMediaQuery } from '@vueuse/core'
import { computed, onMounted, shallowRef, type ComputedRef } from 'vue'

// The server cannot know the visitor's motion preference, so it always renders "full motion".
// Reading the media query during hydration would make the first client render disagree with
// that HTML. Until the app has finished hydrating, report `false`; afterwards (and for every
// component created later, e.g. an overlay opened by the user) report the real preference at once.
let hydrated = false

/**
 * Hydration-safe `prefers-reduced-motion`, a drop-in for motion-v's `useReducedMotion`.
 * Use this instead of motion-v's hook in any component that renders on the server.
 */
export function useReducedMotion(): ComputedRef<boolean> {
  const media = useMediaQuery('(prefers-reduced-motion: reduce)')
  const ready = shallowRef(hydrated)
  if (!hydrated) {
    onMounted(() => {
      ready.value = true
      hydrated = true
    })
  }
  return computed(() => ready.value && media.value)
}
