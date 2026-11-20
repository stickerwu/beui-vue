<script setup lang="ts">
import { nextTick, onBeforeUnmount, shallowRef, useTemplateRef } from 'vue'

const props = defineProps<{ label: string; items: { label: string; action: () => void }[] }>()
const open = shallowRef(false)
const left = shallowRef(0), top = shallowRef(0)
const trigger = useTemplateRef<HTMLButtonElement>('trigger')
const menu = useTemplateRef<HTMLDivElement>('menu')
function close(restoreFocus = false) {
  if (!open.value) return
  open.value = false
  window.removeEventListener('resize', dismiss)
  window.removeEventListener('scroll', dismiss, true)
  document.removeEventListener('pointerdown', outside)
  if (restoreFocus) trigger.value?.focus({ preventScroll: true })
}
function dismiss() { close() }
function outside(event: PointerEvent) {
  if (!menu.value?.contains(event.target as Node) && !trigger.value?.contains(event.target as Node)) close()
}
async function toggle() {
  if (open.value || !trigger.value) { close(); return }
  const rect = trigger.value.getBoundingClientRect()
  left.value = Math.max(4, Math.min(rect.left, window.innerWidth - 160))
  top.value = rect.bottom + props.items.length * 34 < window.innerHeight ? rect.bottom : Math.max(4, rect.top - props.items.length * 34 - 8)
  open.value = true
  window.addEventListener('resize', dismiss)
  window.addEventListener('scroll', dismiss, true)
  document.addEventListener('pointerdown', outside)
  await nextTick()
  menu.value?.querySelector('button')?.focus({ preventScroll: true })
}
function navigation(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); close(true); return }
  if (event.key === 'Tab') { close(true); return }
  const choices = Array.from(menu.value?.querySelectorAll('button') ?? [])
  const index = choices.indexOf(document.activeElement as HTMLButtonElement)
  const direction = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
  if (direction) { event.preventDefault(); choices[(index + direction + choices.length) % choices.length]?.focus() }
}
function choose(action: () => void) { close(true); action() }
onBeforeUnmount(dismiss)
</script>

<template>
  <button ref="trigger" type="button" class="table-menu-trigger" :aria-label="label" aria-haspopup="menu" :aria-expanded="open" @click="toggle" @keydown.down.prevent="toggle">⋯</button>
  <Teleport v-if="open" to="body">
    <div ref="menu" class="beui-table-menu" role="menu" :aria-label="label" :style="{ top: `${top}px`, left: `${left}px` }" @keydown="navigation">
      <button v-for="item in items" :key="item.label" type="button" role="menuitem" @click="choose(item.action)">{{ item.label }}</button>
    </div>
  </Teleport>
</template>

<style scoped>
.table-menu-trigger { border: 0; border-radius: 4px; background: transparent; color: inherit; font: inherit; cursor: pointer; }
.beui-table-menu { position: fixed; z-index: 150; box-sizing: border-box; min-width: 150px; padding: 4px; border: 1px solid #8885; border-radius: 8px; color: CanvasText; background: Canvas; box-shadow: 0 4px 15px #0002; }
.beui-table-menu button { display: block; text-align: left; width: 100%; height: 32px; padding: 0 8px; border: 0; border-radius: 4px; color: inherit; background: transparent; font: 13px system-ui; cursor: pointer; }
.beui-table-menu button:focus-visible { background: #8882; outline: 1px solid currentColor; }
</style>
