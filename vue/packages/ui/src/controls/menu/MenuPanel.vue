<script setup lang="ts">
import { motion, usePresence } from 'motion-v'
import { computed, inject, onBeforeUnmount, onMounted, provide, shallowRef, useId, watch } from 'vue'
import { easeOut } from '../../core/motion'
import {
  TYPEAHEAD_RESET, enabledItems, levelKey, place, useMenuLayout, useRoot,
  type Align, type FocusTarget, type LevelContext, type Placement, type Side,
} from './menu-shared'
import './menu.css'

// One open panel, shared by the menu and its submenus. Port of `MenuPanel` in
// `components/motion/dropdown-menu.tsx`: placement held once measured, springs
// out of its trigger, answers keys for its own rows only.
defineOptions({ inheritAttrs: false })
const props = defineProps<{
  id: string
  anchor: HTMLElement | null
  side: Side
  align: Align
  sideOffset: number
  focus: FocusTarget
  labelledBy: string
  /** Handles a key before the shared navigation; returns true when it did. */
  keyHook?: (event: KeyboardEvent) => boolean
}>()
const emit = defineEmits<{ close: []; pointerEnter: [] }>()

const root = useRoot('DropdownMenuContent')
const parent = inject(levelKey, null)
const levelId = useId()
const panelEl = shallowRef<HTMLElement | null>(null)
const activeId = shallowRef<string | null>(null)
const openSub = shallowRef<string | null>(null)
const subFocus = shallowRef<FocusTarget>('none')
const present = shallowRef(true)
const grace: LevelContext['grace'] = { current: null }
let typeahead = ''
let typeaheadTimer: ReturnType<typeof setTimeout> | undefined

// Vue clears the template ref when the panel unmounts, before its exit has played.
let leaving: HTMLElement | null = null
function setPanel(node: unknown) {
  const el = (node as { $el?: HTMLElement } | null)?.$el ?? (node as HTMLElement | null)
  panelEl.value = el instanceof HTMLElement ? el : null
  if (panelEl.value) leaving = panelEl.value
}

// Interaction releases in the same commit that starts the exit while the
// visual exit keeps playing (`PresenceGate`): the retained subtree is not
// re-rendered, so the gate is patched straight onto the leaving element.
usePresence({
  element: () => panelEl.value ?? leaving,
  onExit() {
    present.value = false
    const el = panelEl.value ?? leaving
    el?.setAttribute('inert', '')
    if (el) el.style.pointerEvents = 'none'
  },
  onEnter() {
    present.value = true
    const el = panelEl.value ?? leaving
    el?.removeAttribute('inert')
    if (el) el.style.pointerEvents = ''
  },
})

const { layout } = useMenuLayout(() => props.anchor, panelEl)
// Held once placed: an exiting panel stays where it was, even if the trigger
// scrolls away under it.
const placement = shallowRef<Placement | null>(null)
watch([layout, present, () => props.side, () => props.align, () => props.sideOffset], () => {
  const measured = layout.value
  if (!measured || !present.value) return
  // A submenu measures its gap from the parent panel's edge, not from the row
  // inside it, so the two panels never touch.
  const edge = parent?.panelEl.value?.getBoundingClientRect()
  const anchor = edge ? { ...measured.trigger, left: edge.left, width: edge.width } : measured.trigger
  placement.value = place(anchor, measured.content, props.side, props.align, props.sideOffset)
}, { immediate: true })

function setOpenSub(next: string | null, focus: FocusTarget = 'none') {
  subFocus.value = focus
  openSub.value = next
}

// Waits for the first placement: the panel is `visibility: hidden` until then,
// and the browser will not focus anything inside it.
function focusIn() {
  const panel = panelEl.value
  if (!placement.value || !present.value || !panel || props.focus === 'none') return
  if (props.focus === 'panel') { panel.focus({ preventScroll: true }); return }
  const items = enabledItems(panel)
  ;(props.focus === 'last' ? items[items.length - 1] : items[0])?.focus({ preventScroll: true })
}
watch([() => placement.value !== null, present, () => props.focus], focusIn, { flush: 'post' })
onMounted(focusIn)
onBeforeUnmount(() => { if (typeaheadTimer) clearTimeout(typeaheadTimer) })

function onKeydown(event: KeyboardEvent) {
  const panel = panelEl.value
  const target = event.target as HTMLElement
  if (!panel || target.closest('[data-menu-panel]') !== panel) return
  if (props.keyHook?.(event)) return
  const items = enabledItems(panel)
  const index = items.indexOf(target)
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (items.length === 0) return
    const step = event.key === 'ArrowDown' ? 1 : -1
    const next = index < 0 ? (step === 1 ? 0 : items.length - 1) : (index + step + items.length) % items.length
    items[next]?.focus()
    return
  }
  if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    items[event.key === 'Home' ? 0 : items.length - 1]?.focus()
    return
  }
  if (event.key === 'Tab') { event.preventDefault(); emit('close'); return }
  const typed = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
  if (!typed || (event.key === ' ' && typeahead === '')) return
  typeahead += event.key.toLocaleLowerCase()
  if (typeaheadTimer) clearTimeout(typeaheadTimer)
  typeaheadTimer = setTimeout(() => { typeahead = '' }, TYPEAHEAD_RESET)
  // Start after the current row, so repeating a letter cycles its matches.
  const ordered = [...items.slice(index + 1), ...items.slice(0, index + 1)]
  const query = typeahead
  const repeated = query.length > 1 && [...query].every(char => char === query[0])
  const needle = repeated ? query[0]! : query
  const match = ordered.find(item => (item.dataset.textValue ?? item.textContent ?? '').trim().toLocaleLowerCase().startsWith(needle))
  if (match) { event.preventDefault(); match.focus() }
}

provide(levelKey, {
  levelId, present, panelEl, activeId, openSub, subFocus, grace, setOpenSub,
  setActiveId(id) { activeId.value = id },
})

// The panel starts tucked toward its trigger and springs out of it.
const OPEN_SCALE = 0.94
const OPEN_TRAVEL = 6
const EXIT = { duration: 0.12, ease: easeOut }
const OPEN = { duration: 0.2, ease: easeOut }
const used = computed(() => placement.value?.side ?? props.side)
function travel(distance: number) {
  const toward = used.value === 'top' || used.value === 'left' ? 1 : -1
  return used.value === 'top' || used.value === 'bottom' ? { y: distance * toward } : { x: distance * toward }
}
const initial = computed(() => root.reduce.value ? { opacity: 0 } : { opacity: 0, scale: OPEN_SCALE, ...travel(OPEN_TRAVEL) })
const animate = computed(() => root.reduce.value
  ? { opacity: 1, transition: { duration: 0.15, ease: easeOut } }
  : { opacity: 1, scale: 1, x: 0, y: 0, transition: { ...OPEN, opacity: { duration: 0.12, ease: easeOut } } })
const exit = computed(() => root.reduce.value
  ? { opacity: 0, transition: EXIT }
  : { opacity: 0, scale: 0.97, ...travel(OPEN_TRAVEL / 2), transition: EXIT })
const style = computed(() => ({
  left: `${placement.value?.left ?? 0}px`,
  top: `${placement.value?.top ?? 0}px`,
  transformOrigin: placement.value?.origin,
  maxHeight: placement.value ? `${placement.value.maxHeight}px` : undefined,
  visibility: placement.value ? undefined : 'hidden',
}))

function onPointerleave(event: PointerEvent) {
  // Leaving the panel drops the highlight, unless the row it sits on owns the
  // open submenu the pointer is heading into.
  if (event.pointerType === 'touch' || openSub.value) return
  const panel = panelEl.value
  if (panel?.contains(document.activeElement)) panel.focus({ preventScroll: true })
}
</script>

<template>
  <motion.div
    v-bind="$attrs" :ref="setPanel" :id="id" role="menu" :aria-labelledby="labelledBy" aria-orientation="vertical" tabindex="-1"
    data-menu-panel="" :data-menu-root="root.menuId" :data-level="levelId" :data-side="placement?.side ?? side" :data-sub="parent ? '' : undefined"
    class="be-menu-panel" :initial="initial" :animate="animate" :exit="exit" :style="style"
    @keydown="onKeydown" @focus="(event: FocusEvent) => { if (event.target === event.currentTarget) activeId = null }"
    @pointerenter="emit('pointerEnter')" @pointerleave="onPointerleave"
  >
    <slot />
  </motion.div>
</template>
