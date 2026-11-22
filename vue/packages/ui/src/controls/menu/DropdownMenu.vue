<script setup lang="ts">
import { useReducedMotion } from '../../core/reduced-motion'
import { computed, onMounted, provide, shallowRef, useId, watch } from 'vue'
import DropdownMenuContent from './DropdownMenuContent.vue'
import DropdownMenuTrigger from './DropdownMenuTrigger.vue'
import MenuItemsView from './MenuItemsView.vue'
import { rootKey, type FocusTarget } from './menu-shared'
import type { MenuItemSpec } from './menu-types'
import './menu.css'

// Compound API (DropdownMenuTrigger + DropdownMenuContent + rows as children)
// like the React source, or `items` for the data-driven form: the root then
// renders the "Options" pill trigger and the rows itself.
const props = withDefaults(defineProps<{
  items?: readonly MenuItemSpec[]
  /** Accessible name of the data-driven menu, and the trigger text unless the slot gives one. */
  label?: string
  open?: boolean
  defaultOpen?: boolean
}>(), { items: undefined, label: 'Actions', open: undefined })
const emit = defineEmits<{ select: [item: MenuItemSpec]; 'update:open': [open: boolean] }>()

const internal = shallowRef(props.defaultOpen ?? false)
const isOpen = computed(() => props.open ?? internal.value)
const focusTarget = shallowRef<FocusTarget>('first')
const mounted = shallowRef(false)
const triggerEl = shallowRef<HTMLElement | null>(null)
const menuId = useId()
const triggerId = useId()
const reduced = useReducedMotion()
const reduce = computed(() => Boolean(reduced.value))
onMounted(() => { mounted.value = true })

function setOpen(next: boolean, focus: FocusTarget = 'first') {
  if (next) focusTarget.value = focus
  internal.value = next
  emit('update:open', next)
}

// Focus goes back to the trigger when the menu closes from inside it, or with
// nothing focused. A click elsewhere keeps the focus it landed on.
watch(isOpen, (now, before) => {
  if (now || !before) return
  const active = document.activeElement
  if (!active || active === document.body || active.closest(`[data-menu-root="${CSS.escape(menuId)}"]`)) triggerEl.value?.focus({ preventScroll: true })
}, { flush: 'post' })

provide(rootKey, { open: isOpen, setOpen, focusTarget, menuId, triggerId, triggerEl, reduce, mounted })
</script>

<template>
  <template v-if="items">
    <DropdownMenuTrigger>
      <button type="button" class="be-menu-trigger">
        <slot>{{ label }}</slot>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent :aria-label="label" style="width: 14rem"><MenuItemsView :items="items" @select="emit('select', $event)" /></DropdownMenuContent>
  </template>
  <slot v-else />
</template>
