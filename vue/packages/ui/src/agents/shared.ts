import { computed, onBeforeUnmount, shallowRef, type ComputedRef, type InjectionKey, type Ref, type ShallowRef } from 'vue'

export type Labels = Partial<Record<string, string>>
export type Option = { value: string, label: string, description?: string, disabled?: boolean }
export type CitationItem = { id: string, title: string, domain?: string, url?: string }
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

export function sourceUrl(url?: string) {
  if (!url) return undefined
  try { return ['https:', 'http:'].includes(new URL(url).protocol) ? url : undefined } catch { return undefined }
}
