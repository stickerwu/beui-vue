<script setup lang="ts">
import { nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import type { MenuItem } from './types'

const { items, label, nested = false } = defineProps<{ items: readonly MenuItem[]; label: string; nested?: boolean }>()
const emit = defineEmits<{ select: [item: MenuItem]; close: []; back: [] }>()
const menu = useTemplateRef('menu')
const child = useTemplateRef<{ focus: (last?: boolean) => void }[]>('child')
const submenu = shallowRef('')
let typed = ''
let lastInput = 0

function rows() { return Array.from(menu.value?.querySelectorAll<HTMLButtonElement>(':scope > li > button:not(:disabled)') ?? []) }
function focus(last = false) { nextTick(() => (last ? rows().at(-1) : rows()[0])?.focus({ preventScroll: true })) }
defineExpose({ focus })
function toggle(item: MenuItem, keyboard = false) {
  if (item.disabled) return
  if (item.children?.length) {
    submenu.value = item.value
    if (keyboard) nextTick(() => child.value?.[0]?.focus())
  } else emit('select', item)
}
function key(event: KeyboardEvent) {
  const enabled = rows()
  const index = enabled.indexOf(document.activeElement as HTMLButtonElement)
  const right = getComputedStyle(menu.value!).direction !== 'rtl'
  const forward = right ? 'ArrowRight' : 'ArrowLeft'
  const backward = right ? 'ArrowLeft' : 'ArrowRight'
  if (event.key === 'Escape' || (event.key === backward && nested)) {
    event.preventDefault(); event.stopPropagation(); nested ? emit('back') : emit('close'); return
  }
  const next: Record<string, number> = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: enabled.length - 1 }
  if (event.key in next) { event.preventDefault(); event.stopPropagation(); enabled[(next[event.key]! + enabled.length) % enabled.length]?.focus(); return }
  if (event.key === forward) {
    const current = items.find(item => item.value === enabled[index]?.dataset.key)
    if (current?.children?.length) { event.preventDefault(); event.stopPropagation(); toggle(current, true) }
  } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.key !== ' ') {
    event.stopPropagation(); typed = (Date.now() - lastInput > 650 ? '' : typed) + event.key.toLowerCase(); lastInput = Date.now()
    enabled.find(row => row.dataset.label?.toLowerCase().startsWith(typed))?.focus()
  }
}
watch(() => items, next => { if (!next.some(item => item.value === submenu.value)) submenu.value = '' })
function closeChild() { const key = submenu.value; submenu.value = ''; nextTick(() => rows().find(row => row.dataset.key === key)?.focus()) }
</script>
<template><ul ref="menu" role="menu" :aria-label="label" class="menu" @keydown="key">
  <li v-for="item in items" :key="item.value" :role="item.type === 'separator' ? 'separator' : 'none'" :class="{ separator: item.type === 'separator' }">
    <span v-if="item.type === 'label'" class="heading">{{ item.label }}</span>
    <template v-else-if="item.type !== 'separator'">
      <button type="button" tabindex="-1" :role="item.type === 'checkbox' ? 'menuitemcheckbox' : item.type === 'radio' ? 'menuitemradio' : 'menuitem'" :aria-checked="item.type === 'checkbox' || item.type === 'radio' ? Boolean(item.checked) : undefined"
        :aria-haspopup="item.children ? 'menu' : undefined" :aria-expanded="item.children ? submenu === item.value : undefined" :data-key="item.value" :data-label="item.label" :data-danger="item.destructive" :disabled="item.disabled"
        @click="toggle(item, $event.detail === 0)" @pointerenter="event => { if (event.pointerType === 'mouse' && !item.disabled) submenu = item.children ? item.value : '' }">
        <span aria-hidden="true" class="check">{{ item.checked ? '✓' : '' }}</span>{{ item.label }}<small v-if="item.shortcut">{{ item.shortcut }}</small><small v-else-if="item.children">›</small>
      </button>
      <div v-if="item.children && submenu === item.value" class="child"><MenuRows ref="child" :items="item.children" :label="item.label" nested @select="emit('select', $event)" @back="closeChild" @close="emit('close')" /></div>
    </template>
  </li>
</ul></template>
<style scoped>.menu { list-style: none; margin: 0; padding: 0; min-width: 11rem; } .menu li { position: relative; margin: 0; } .menu button { display: flex; align-items: center; gap: .45rem; width: 100%; padding: .4rem .55rem; min-height: 2rem; border: 0; border-radius: .45rem; background: transparent; color: var(--beui-foreground); font: inherit; font-size: .875rem; text-align: start; cursor: pointer; } .menu button:is(:hover,:focus-visible,[aria-expanded=true]) { background: var(--beui-muted); outline: none; } .menu button:disabled { opacity: .4; } .menu button[data-danger=true] { color: var(--beui-destructive); } .menu small { margin-inline-start: auto; color: var(--beui-muted-foreground); } .check { width: .85rem; } .separator { border-top: 1px solid var(--beui-border); margin: .3rem 0 !important; } .heading { display: block; padding: .3rem .5rem; font-size: .72rem; font-weight: 600; color: var(--beui-muted-foreground); } .child { margin-inline-start: 1rem; padding-inline-start: .3rem; border-inline-start: 1px solid var(--beui-border); }</style>
