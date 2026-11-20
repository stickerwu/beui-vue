import { useMediaQuery } from '@vueuse/core'
import { computed, onMounted, shallowRef } from 'vue'

export function useMountedMedia(query: string) {
  const mounted = shallowRef(false)
  const matches = useMediaQuery(query)
  onMounted(() => { mounted.value = true })
  return computed(() => mounted.value && matches.value)
}
