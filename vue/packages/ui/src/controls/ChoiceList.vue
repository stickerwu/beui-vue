<script setup lang="ts">
import { computed, nextTick, shallowRef, useId, useTemplateRef, watch } from 'vue'
import FloatingPanel from './FloatingPanel.vue'
import type { ChoiceOption } from './types'

const { options, multiple, searchable, morph, placeholder = 'Select an option', label = 'Options', empty = 'No results.', disabled, name } = defineProps<{
  options: readonly ChoiceOption[]; multiple?: boolean; searchable?: boolean; morph?: boolean; placeholder?: string; label?: string; empty?: string; disabled?: boolean; name?: string
}>()
const model = defineModel<string | string[]>()
const open = shallowRef(false)
const query = shallowRef('')
const cursor = shallowRef<string>()
const uid = useId()
const anchor = useTemplateRef('anchor')
const field = useTemplateRef('field')
const button = useTemplateRef('button')
const selected = computed(() => Array.isArray(model.value) ? model.value : model.value ? [model.value] : [])
const picked = computed(() => selected.value.map(value => options.find(option => option.value === value)).filter((item): item is ChoiceOption => Boolean(item)))
const filtered = computed(() => options.filter(option => [option.label, option.group, option.detail, ...(option.keywords ?? [])].join(' ').toLowerCase().includes(query.value.trim().toLowerCase())))
const enabled = computed(() => filtered.value.filter(item => !item.disabled))
const active = computed(() => enabled.value.find(item => item.value === cursor.value) ?? enabled.value.find(item => selected.value.includes(item.value)) ?? enabled.value[0])
const id = (value: string) => `${uid}-option-${encodeURIComponent(value)}`
let typeahead = ''
let lastKey = 0
function launch() {
  if (disabled || open.value) return
  query.value = ''
  cursor.value = undefined
  open.value = true
}
function close(reason?: string) {
  open.value = false
  query.value = ''
  if (reason === 'escape' || reason === 'selected') (field.value ?? button.value)?.focus({ preventScroll: true })
}
function choose(option: ChoiceOption) {
  if (option.disabled) return
  if (multiple) {
    model.value = selected.value.includes(option.value) ? selected.value.filter(value => value !== option.value) : [...selected.value, option.value]
    query.value = ''
    field.value?.focus()
  } else { model.value = option.value; close('selected') }
}
function key(event: KeyboardEvent) {
  if (disabled || event.isComposing) return
  if (event.key === 'Tab') { close(); return }
  if (event.key === 'Escape' && open.value) { event.preventDefault(); close('escape'); return }
  if (multiple && event.key === 'Backspace' && !query.value && selected.value.length) { model.value = selected.value.slice(0,-1); return }
  const index = enabled.value.findIndex(option => option.value === active.value?.value)
  const length = enabled.value.length
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) { launch(); if (event.key === 'ArrowUp' && !selected.value.length) cursor.value = enabled.value.at(-1)?.value; return }
    const step = event.key === 'ArrowDown' ? 1 : -1
    cursor.value = enabled.value[(index + step + length) % length]?.value
  } else if (open.value && ['Home','End'].includes(event.key) && (!searchable || event.ctrlKey)) {
    event.preventDefault(); cursor.value = (event.key === 'Home' ? enabled.value[0] : enabled.value.at(-1))?.value
  } else if (event.key === 'Enter' || (!searchable && event.key === ' ')) {
    event.preventDefault()
    if (open.value && active.value) choose(active.value)
    else launch()
  } else if (!searchable && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
    launch(); typeahead = (Date.now() - lastKey > 650 ? '' : typeahead) + event.key.toLowerCase(); lastKey = Date.now()
    cursor.value = enabled.value.find(option => option.label.toLowerCase().startsWith(typeahead))?.value
  }
}
watch(active, async option => { if (open.value && option) { await nextTick(); document.getElementById(id(option.value))?.scrollIntoView({ block: 'nearest' }) } })
</script>
<template>
  <div ref="anchor" class="choice-root" :data-disabled="disabled">
    <template v-if="name"><input v-for="value in selected" :key="value" type="hidden" :name="name" :value="value" :disabled="disabled" /></template>
    <template v-if="searchable">
      <span v-for="item in multiple ? picked : []" :key="item.value" class="token">{{ item.label }}<button type="button" :aria-label="`Remove ${item.label}`" :disabled="disabled" @click="choose(item)">×</button></span>
      <input ref="field" class="query" role="combobox" autocomplete="off" aria-autocomplete="list" :aria-label="label" :aria-expanded="open" :aria-controls="open ? uid : undefined" :aria-activedescendant="open && active ? id(active.value) : undefined"
        :disabled="disabled" :placeholder="open && !multiple && picked.length ? picked[0]?.label : placeholder" :value="open || multiple ? query : picked[0]?.label ?? ''"
        @click="launch" @input="launch(); query = ($event.target as HTMLInputElement).value; cursor = undefined" @keydown="key" />
    </template>
    <button v-else ref="button" type="button" role="combobox" class="trigger" :disabled="disabled" :aria-label="label" :aria-expanded="open" :aria-controls="open ? uid : undefined" :aria-activedescendant="open && active ? id(active.value) : undefined" @keydown="key" @click="open ? close() : launch()">
      <slot name="value" :option="picked[0]">{{ picked[0]?.label ?? placeholder }}</slot><span aria-hidden="true" class="chevron">⌄</span>
    </button>
    <FloatingPanel :id="uid" role="listbox" :aria-label="label" :aria-multiselectable="multiple || undefined" :open="open" :anchor="anchor" :variant="morph || searchable ? 'morph' : 'slide'" match-width dismiss-blur class="options" @dismiss="close">
      <template v-for="(item, index) in filtered" :key="item.value">
        <div v-if="item.group && item.group !== filtered[index - 1]?.group" aria-hidden="true" class="group">{{ item.group }}</div>
        <div :id="id(item.value)" role="option" :aria-selected="selected.includes(item.value)" :aria-disabled="item.disabled || undefined" :data-current="active?.value === item.value" class="option" @pointermove="!item.disabled && (cursor = item.value)" @mousedown.prevent @click="choose(item)">
          <slot name="option" :option="item"><span v-if="item.color" class="dot" :style="{ background: item.color }"/><span>{{ item.label }}<small v-if="item.detail">{{ item.detail }}</small></span></slot><span v-if="selected.includes(item.value)" class="check" aria-hidden="true">✓</span>
        </div>
      </template><div v-if="!filtered.length" role="presentation" class="empty">{{ empty }}</div>
    </FloatingPanel>
  </div>
</template>
<style scoped>
.choice-root { box-sizing: border-box; display: flex; align-items: center; flex-wrap: wrap; gap: .3rem; min-width: 10rem; width: 100%; max-width: 24rem; min-height: 2.5rem; border: 1px solid var(--beui-border); border-radius: .75rem; background: var(--beui-background); }
.choice-root:focus-within { outline: 2px solid var(--beui-ring); outline-offset: 1px; } .choice-root[data-disabled=true] { opacity: .5; }
.trigger, .query { background: transparent; border: 0; color: var(--beui-foreground); font: inherit; font-size: .875rem; outline: 0; min-width: 0; padding: .55rem .75rem; }
.trigger { cursor: pointer; display: flex; align-items: center; justify-content: space-between; width: 100%; } .query { flex: 1; min-width: 6rem; } .chevron { color: var(--beui-muted-foreground); }
.token { display: inline-flex; align-items: center; gap: .25rem; margin: .25rem 0 .25rem .25rem; background: var(--beui-muted); color: var(--beui-foreground); border-radius: .5rem; padding: .18rem .45rem; font-size: .8rem; } .token button { background: none; border: 0; cursor: pointer; color: inherit; padding: .1rem; }
.options { max-height: min(20rem, 75vh); } .option { display: flex; align-items: center; gap: .55rem; min-height: 2rem; border-radius: .5rem; padding: .3rem .6rem; font-size: .875rem; cursor: pointer; } .option[data-current=true] { background: var(--beui-muted); } .option[aria-disabled=true] { opacity: .45; cursor: default; } .option small,.group,.empty { color: var(--beui-muted-foreground); font-size: .75rem; } .option small { display: block; } .group,.empty { padding: .4rem .6rem; } .check { margin-inline-start: auto; } .dot { width: .65rem; height: .65rem; border-radius: 50%; }
</style>
