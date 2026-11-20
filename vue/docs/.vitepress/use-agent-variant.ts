import { computed, onMounted, onBeforeUnmount, ref } from 'vue'

export function useAgentVariant(selected: () => string | undefined, choices: Record<string,string>) {
  const query = ref('')
  const options = Object.keys(choices)
  const variant = computed(() => {
    const requested = selected() || query.value
    return options.find(slug => requested === slug || requested === choices[slug]) ?? options[0]
  })
  function refresh() {
    query.value = new URL(location.href).searchParams.get('variant') ?? ''
  }
  function choose(slug:string) {
    if (!options.includes(slug)) return
    const url = new URL(location.href)
    url.searchParams.set('variant',slug)
    history.replaceState(history.state,'',url)
    refresh()
  }
  onMounted(() => {
    refresh()
    window.addEventListener('popstate',refresh)
  })
  onBeforeUnmount(() => window.removeEventListener('popstate',refresh))
  return { variant, choose, options }
}
