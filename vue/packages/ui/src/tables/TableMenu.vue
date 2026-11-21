<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { nextTick, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import { panelSpring } from '../core/motion'
import type { TableIconName } from './icons'
import TableIcon from './TableIcon.vue'

defineOptions({ inheritAttrs: false })
export interface TableMenuItem { label: string; icon?: TableIconName; destructive?: boolean; action: () => void }
const props = defineProps<{ label: string; items: TableMenuItem[] }>()
const emit = defineEmits<{ openChange: [open: boolean] }>()

const MENU_WIDTH = 188
const reduce = useReducedMotion()
const open = shallowRef(false)
const left = shallowRef(0), top = shallowRef(0)
const trigger = useTemplateRef<HTMLButtonElement>('trigger')
const menu = useTemplateRef<{ $el?: HTMLElement } | HTMLElement>('menu')
// A motion component ref is the component instance; the menu element is its $el.
const menuElement = () => (menu.value && '$el' in menu.value ? menu.value.$el : menu.value) as HTMLElement | null | undefined

function close(restoreFocus = false) {
  if (!open.value) return
  open.value = false
  if (restoreFocus) trigger.value?.focus({ preventScroll: true })
}
function dismiss() { close() }
function toggle() {
  if (open.value) { close(); return }
  const element = trigger.value
  if (!element) return
  const rect = element.getBoundingClientRect()
  const height = props.items.length * 34 + 10
  left.value = Math.max(8, rect.right - MENU_WIDTH)
  top.value = rect.bottom + 4 + height > window.innerHeight ? Math.max(8, rect.top - 4 - height) : rect.bottom + 4
  open.value = true
}
// Fixed coordinates go stale as soon as the trigger moves, so any scroll or resize ends the menu.
watch(open, async value => {
  emit('openChange', value)
  if (value) {
    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('resize', dismiss)
    await nextTick()
    menuElement()?.querySelector<HTMLElement>('[role=menuitem]')?.focus({ preventScroll: true })
  } else {
    window.removeEventListener('scroll', dismiss, true)
    window.removeEventListener('resize', dismiss)
  }
})
function navigation(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return }
  if (event.key === 'Tab') { close(true); return }
  const choices = Array.from(menuElement()?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])
  const index = choices.indexOf(document.activeElement as HTMLElement)
  const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
  if (step) { event.preventDefault(); choices[(index + step + choices.length) % choices.length]?.focus() }
  else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); choices[event.key === 'Home' ? 0 : choices.length - 1]?.focus() }
}
function choose(item: TableMenuItem) {
  close(true)
  item.action()
}
onBeforeUnmount(() => {
  if (open.value) { window.removeEventListener('scroll', dismiss, true); window.removeEventListener('resize', dismiss); emit('openChange', false) }
})
defineExpose({ close })
</script>

<template>
  <button ref="trigger" v-bind="$attrs" type="button" :aria-label="label" aria-haspopup="menu" :aria-expanded="open" @click.stop="toggle" @keydown.down.prevent="open || toggle()"><slot /></button>
  <Teleport v-if="open" to="body">
    <div class="be-table-menu-backdrop" @pointerdown="close()" />
    <motion.div
      ref="menu"
      class="be-table-menu"
      role="menu"
      :aria-label="label"
      :style="{ top: `${top}px`, left: `${left}px`, width: `${MENU_WIDTH}px` }"
      :initial="reduce ? { opacity: 0 } : { opacity: 0, scale: .96, y: -4 }"
      :animate="reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }"
      :transition="reduce ? { duration: 0 } : panelSpring"
      @keydown="navigation"
    >
      <button v-for="item in items" :key="item.label" type="button" role="menuitem" class="be-table-menu-item" :data-destructive="item.destructive || undefined" @click="choose(item)">
        <TableIcon v-if="item.icon" :name="item.icon" />{{ item.label }}
      </button>
    </motion.div>
  </Teleport>
</template>

<style>
.be-table-menu-backdrop { position: fixed; inset: 0; z-index: 40; }
.be-table-menu { position: fixed; z-index: 50; box-sizing: border-box; overflow: hidden; padding: .25rem; border: 1px solid var(--beui-border); border-radius: .75rem; color: var(--beui-foreground); background: var(--beui-background); box-shadow: 0 20px 25px -5px rgb(0 0 0 / .1), 0 8px 10px -6px rgb(0 0 0 / .1); font-size: .875rem; line-height: 1.25rem; }
.be-table-menu-item { display: flex; box-sizing: border-box; align-items: center; gap: .625rem; width: 100%; margin: 0; padding: .375rem .625rem; border: 0; border-radius: .5rem; background: transparent; color: var(--beui-foreground); font: inherit; text-align: left; cursor: pointer; transition: background-color .15s, color .15s; }
.be-table-menu-item .be-table-icon { width: 1rem; height: 1rem; flex: none; }
.be-table-menu-item[data-destructive] { color: #f43f5e; }
@media (hover: hover) { .be-table-menu-item:hover { background: var(--beui-muted); } .be-table-menu-item[data-destructive]:hover { background: rgb(244 63 94 / .1); } }
.be-table-menu-item:focus-visible { background: var(--beui-muted); outline: none; }
.be-table-menu-item[data-destructive]:focus-visible { background: rgb(244 63 94 / .1); }
</style>
