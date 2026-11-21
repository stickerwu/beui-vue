import { inject, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { previewVariantKey } from '../.vitepress/preview-variant'

export function usePreviewVariant(alternate: string) {
  // Pinned by the surrounding DemoFrame when the page shows every example on its own.
  const pinned = inject(previewVariantKey, undefined)
  const fixed = Boolean(pinned)
  const variant = shallowRef(pinned === alternate ? alternate : 'default')
  function sync() {
    const requested = new URLSearchParams(location.search).get('variant')
    variant.value = requested === alternate ? alternate : 'default'
  }
  function select(name: string) {
    if (fixed) return
    const url = new URL(location.href)
    url.searchParams.set('variant', name)
    history.replaceState(history.state, '', url)
    sync()
  }
  onMounted(() => { if (!fixed) { sync(); window.addEventListener('popstate', sync) } })
  onBeforeUnmount(() => window.removeEventListener('popstate', sync))
  return { variant, select, fixed }
}
