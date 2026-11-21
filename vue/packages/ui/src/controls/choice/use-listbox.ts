import { computed, shallowRef, watch, type Ref } from 'vue'

export interface ListboxRow { id: string; label: string; disabled?: boolean }

/** How long typed characters keep building one typeahead query. */
const TYPEAHEAD_MS = 500

/**
 * Keyboard model for a popup listbox whose options are focusable buttons (port of `lib/hooks/use-listbox`).
 * The active option is resolved from state (never in a post-render effect), opening starts on the selected
 * option, arrows/Home/End move between enabled options, printable characters jump by label prefix, and
 * DOM focus follows the active option while the list is open (`data-listbox-id` marks each option).
 */
export function useChoiceListbox(options: {
  open: Ref<boolean>
  rows: Ref<readonly ListboxRow[]>
  selected: Ref<string | undefined>
  list: Ref<HTMLElement | null | undefined>
}) {
  const { open, rows, selected, list } = options
  const enabled = computed(() => rows.value.filter(row => !row.disabled))
  const cursor = shallowRef<string | null>(null)
  const activeIndex = computed(() => {
    const index = cursor.value === null ? -1 : enabled.value.findIndex(row => row.id === cursor.value)
    return index < 0 ? 0 : index
  })
  const activeId = computed(() => enabled.value[activeIndex.value]?.id)
  watch(open, isOpen => {
    if (isOpen) cursor.value = enabled.value.some(row => row.id === selected.value) ? selected.value ?? null : null
  }, { flush: 'sync', immediate: true })

  let openedOnMount = open.value
  watch(open, isOpen => { if (!isOpen) openedOnMount = false })
  watch([open, activeId], () => {
    if (!open.value || activeId.value === undefined) return
    const root = list.value
    if (!root) return
    if (openedOnMount && !root.contains(document.activeElement)) return
    const target = Array.from(root.querySelectorAll<HTMLElement>('[data-listbox-id]')).find(element => element.dataset.listboxId === activeId.value)
    target?.focus({ preventScroll: false })
  }, { flush: 'post', immediate: true })

  function moveTo(id: string | null) { cursor.value = id }
  function moveActive(direction: 1 | -1) {
    const last = enabled.value.length - 1
    if (last < 0) return
    const next = Math.min(Math.max(activeIndex.value + direction, 0), last)
    cursor.value = enabled.value[next].id
  }

  let typed = { text: '', at: 0 }
  function onKeyDown(event: KeyboardEvent) {
    const { key } = event
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault()
      moveActive(key === 'ArrowDown' ? 1 : -1)
    } else if (key === 'Home' || key === 'End') {
      event.preventDefault()
      const row = key === 'Home' ? enabled.value[0] : enabled.value[enabled.value.length - 1]
      if (row) moveTo(row.id)
    } else if (key.length === 1 && key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now()
      const char = key.toLowerCase()
      const text = now - typed.at < TYPEAHEAD_MS ? typed.text + char : char
      typed = { text, at: now }
      // A repeated single letter cycles through the options that start with it.
      const from = text.length === 1 ? activeIndex.value + 1 : activeIndex.value
      for (let step = 0; step < enabled.value.length; step++) {
        const row = enabled.value[(from + step) % enabled.value.length]
        if (row.label.toLowerCase().startsWith(text)) { moveTo(row.id); break }
      }
    }
  }
  return { activeId, onKeyDown, moveTo }
}
