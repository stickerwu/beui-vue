import { computed, shallowRef, watch, type Ref } from 'vue'

type Cursor = { value: string; query: string }
interface Source { open: Ref<boolean>; query: Ref<string>; value: Ref<string | undefined>; enabledItems: Ref<readonly { value: string }[]> }

/**
 * Port of `components/motion/combobox/use-active-option.ts`. Where the keyboard or pointer last moved,
 * stamped with the query it was placed under. The active option is derived from it (not set in an effect):
 * the live cursor if its row is still enabled under the same query, otherwise the selection, otherwise the
 * first enabled row. Nothing is active until the list has opened once.
 */
export function useActiveOption(source: Source) {
  const { open, query, value, enabledItems } = source
  const cursor = shallowRef<Cursor | null>(null)
  const isEnabled = (candidate: string | undefined): candidate is string => candidate !== undefined && enabledItems.value.some(item => item.value === candidate)
  const live = computed(() => cursor.value === null || cursor.value.query !== query.value ? null : isEnabled(cursor.value.value) ? cursor.value.value : null)
  // Cleared rather than ignored, so a row that comes back later cannot revive a stale cursor.
  watch(live, current => { if (cursor.value !== null && current === null) cursor.value = null }, { flush: 'sync' })
  const derived = computed(() => live.value ?? (isEnabled(value.value) ? value.value : enabledItems.value[0]?.value ?? null))
  const opened = shallowRef(open.value)
  watch(open, isOpen => { if (isOpen) opened.value = true }, { flush: 'sync' })
  const activeValue = computed(() => opened.value ? derived.value : null)

  function setActiveValue(next: string | null) { cursor.value = next === null ? null : { value: next, query: query.value } }
  function moveActive(direction: 1 | -1 | 'first' | 'last') {
    if (!open.value) return
    const rows = enabledItems.value
    const last = rows.length - 1
    if (last < 0) { cursor.value = null; return }
    const from = derived.value
    const at = rows.findIndex(item => item.value === from)
    const index = direction === 'first' ? 0 : direction === 'last' ? last : (at + direction + rows.length) % rows.length
    cursor.value = { value: rows[index].value, query: query.value }
  }
  return { activeValue, setActiveValue, moveActive }
}
