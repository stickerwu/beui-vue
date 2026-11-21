import { computed, inject, onMounted, onBeforeUnmount, ref } from 'vue'
import { previewVariantKey } from './preview-variant'

export function useAgentVariant(selected: () => string | undefined, choices: Record<string,string>) {
  // Pinned by the surrounding DemoFrame when the page shows every example on its own.
  const pinned = inject(previewVariantKey, undefined)
  const fixed = Boolean(pinned)
  const query = ref('')
  const options = Object.keys(choices)
  const variant = computed(() => {
    const requested = pinned || selected() || query.value
    return options.find(slug => requested === slug || requested === choices[slug]) ?? options[0]
  })
  function refresh() {
    query.value = new URL(location.href).searchParams.get('variant') ?? ''
  }
  function choose(slug:string) {
    if (fixed || !options.includes(slug)) return
    const url = new URL(location.href)
    url.searchParams.set('variant',slug)
    history.replaceState(history.state,'',url)
    refresh()
  }
  onMounted(() => {
    if (fixed) return
    refresh()
    window.addEventListener('popstate',refresh)
  })
  onBeforeUnmount(() => window.removeEventListener('popstate',refresh))
  return { variant, choose, options, fixed }
}
