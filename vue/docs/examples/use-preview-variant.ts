import { onBeforeUnmount, onMounted, shallowRef } from 'vue'

export function usePreviewVariant(alternate: string) {
  const variant = shallowRef('default')
  function sync() {
    const requested = new URLSearchParams(location.search).get('variant')
    variant.value = requested === alternate ? alternate : 'default'
  }
  function select(name: string) {
    const url = new URL(location.href)
    url.searchParams.set('variant', name)
    history.replaceState(history.state, '', url)
    sync()
  }
  onMounted(() => { sync(); window.addEventListener('popstate',sync) })
  onBeforeUnmount(() => window.removeEventListener('popstate',sync))
  return { variant, select }
}
