import { computed, getCurrentInstance, onBeforeUnmount, shallowRef, type Component, type ComputedRef, type InjectionKey, type Ref, type ShallowRef } from 'vue'

export type Labels = Partial<Record<string, string>>
export type Option = { value: string, label: string, description?: string, disabled?: boolean }
export type CitationItem = { id: string, title: string, domain?: string, url?: string, /** Replaces the URL favicon, e.g. a document icon for non-web sources. */ icon?: Component }
export const sideKey: InjectionKey<Readonly<Ref<'start' | 'end'>>> = Symbol('message-side')

export function useValue<Value>(controlled: () => Value | undefined, initial: Value, emit: (value: Value) => void): { value: ComputedRef<Value>, set: (value: Value) => void } {
  const local: ShallowRef<Value> = shallowRef(initial)
  const value = computed(() => {
    const supplied = controlled()
    return supplied === undefined ? local.value : supplied
  })
  function set(next: Value) {
    if (controlled() === undefined) local.value = next
    emit(next)
  }
  return { value, set }
}

export function useCopy() {
  const copied = shallowRef(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  async function copy(text: string, custom?: () => void | Promise<void>) {
    try {
      if (custom) await custom()
      else await navigator.clipboard.writeText(text)
      copied.value = true
      clearTimeout(timer)
      timer = setTimeout(() => { copied.value = false }, 1600)
    } catch { copied.value = false }
  }
  onBeforeUnmount(() => clearTimeout(timer))
  return { copied, copy }
}

/** Keeps http(s) and relative links; drops `javascript:` and other script-capable schemes. */
export function sourceUrl(url?: string) {
  if (!url) return undefined
  try { return ['https:', 'http:'].includes(new URL(url, 'https://beui.invalid').protocol) ? url : undefined } catch { return undefined }
}

export function citationTargetId(prefix: string, citationId: string) {
  return `${prefix}-${citationId.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

/**
 * Whether the parent bound a listener for `event` (`@retry` or `:on-retry`). Lets a component show an
 * optional action only when someone is listening, like upstream's optional `onRetry` callback prop.
 */
export function useHasListener(event: string) {
  const instance = getCurrentInstance()
  const key = `on${event.charAt(0).toUpperCase()}${event.slice(1)}`
  return () => Boolean(instance?.vnode.props?.[key])
}
