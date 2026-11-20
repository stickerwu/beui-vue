<script setup lang="ts">
import { motion, useReducedMotion } from 'motion-v'
import { computed, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { useTabTrack } from './core/tab-track'

interface TabItem { value: string; label: string; content?: string; disabled?: boolean }
const { items, modelValue, defaultValue, variant = 'pill', icons = 'always', labels } = defineProps<{
  items: readonly TabItem[]
  modelValue?: string
  defaultValue?: string
  variant?: 'pill' | 'segment' | 'underline'
  icons?: 'always' | 'selected'
  labels?: { list?: string; scrollLeft?: string; scrollRight?: string }
}>()
const slots = defineSlots<{
  trigger?(props: { item: TabItem; active: boolean }): unknown
  icon?(props: { item: TabItem; active: boolean }): unknown
  panel?(props: { item: TabItem; active: boolean }): unknown
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; valueChange: [value: string] }>()
const enabled = computed(() => items.filter(item => !item.disabled))
const internal = shallowRef(defaultValue ?? enabled.value[0]?.value ?? '')
const current = computed(() => modelValue ?? internal.value)
const tabStop = computed(() => enabled.value.find(item => item.value === current.value)?.value ?? enabled.value[0]?.value)
const panelItems = computed(() => items.filter(hasPanel))
const groupId = useId()
const viewport = useTemplateRef('viewport')
const list = shallowRef<HTMLElement | null>(null)
const reduce = useReducedMotion()
const { edges, placed, trackStyles, left, width, refresh, measureEdges, reveal, scroll } = useTabTrack(viewport, list, current, reduce)
const mask = computed(() => `linear-gradient(to right, ${edges.value.left ? 'transparent, black 40px' : 'black'}, ${edges.value.right ? 'black calc(100% - 40px), transparent' : 'black'})`)

watch(() => items.map(item => [item.value, item.disabled, item.label]), refresh, { flush: 'post' })
watch(enabled, available => {
  if (modelValue === undefined && !available.some(item => item.value === internal.value)) internal.value = available[0]?.value ?? ''
})

function id(kind: string, value: string) { return `${groupId}-${kind}-${encodeURIComponent(value)}` }
function hasPanel(item: TabItem) { return Boolean(slots.panel) || item.content !== undefined }
function select(item: TabItem) {
  if (item.disabled || current.value === item.value) return
  if (modelValue === undefined) internal.value = item.value
  emit('update:modelValue', item.value)
  emit('valueChange', item.value)
}
function navigate(event: KeyboardEvent, item: TabItem) {
  const rows = enabled.value
  const index = rows.findIndex(row => row.value === item.value)
  if (index < 0 || !list.value) return
  const forward = getComputedStyle(list.value).direction === 'rtl' ? -1 : 1
  const steps: Record<string, number> = { ArrowRight: index + forward, ArrowLeft: index - forward, Home: 0, End: rows.length - 1 }
  const next = steps[event.key]
  if (next === undefined) return
  event.preventDefault()
  const target = rows[(next + rows.length) % rows.length]!
  select(target)
  document.getElementById(id('tab', target.value))?.focus({ preventScroll: true })
}
</script>

<template>
  <div class="be-tabs" :data-variant="variant">
    <div class="be-scroll-frame" :data-overflow="edges.left || edges.right">
      <button v-if="edges.left || edges.right" type="button" class="be-scroll left" :aria-controls="`${groupId}-viewport`" :aria-label="labels?.scrollLeft ?? 'Scroll tabs left'" :disabled="!edges.left" @click="scroll(-1)">‹</button>
      <div :id="`${groupId}-viewport`" ref="viewport" class="be-viewport" :style="{ maskImage: mask }" @scroll.passive="measureEdges">
        <motion.div :ref="(node: any) => { list = node?.$el ?? node }" class="be-list" role="tablist" :aria-label="labels?.list ?? 'Tabs'" :style="trackStyles" :data-placed="placed">
          <motion.span v-if="placed" class="be-indicator" aria-hidden="true" :style="{ x: left, width }" />
          <button v-for="item in items" :id="id('tab', item.value)" :key="item.value" type="button" role="tab" class="be-trigger" :data-value="item.value"
            :disabled="item.disabled" :aria-selected="item.value === current" :tabindex="!item.disabled && tabStop === item.value ? 0 : -1"
            :aria-controls="hasPanel(item) ? id('panel', item.value) : undefined" @click="select(item)" @keydown="navigate($event, item)" @focus="reveal($event.currentTarget as HTMLElement)">
            <span v-if="slots.icon" class="be-icon" :data-open="icons === 'always' || item.value === current" aria-hidden="true"><span><slot name="icon" :item="item" :active="item.value === current" /></span></span>
            <slot name="trigger" :item="item" :active="item.value === current"><span class="be-label">{{ item.label }}</span></slot>
            <span v-if="!slots.trigger && variant !== 'underline'" class="be-ink" aria-hidden="true">{{ item.label }}</span>
          </button>
        </motion.div>
      </div>
      <button v-if="edges.left || edges.right" type="button" class="be-scroll right" :aria-controls="`${groupId}-viewport`" :aria-label="labels?.scrollRight ?? 'Scroll tabs right'" :disabled="!edges.right" @click="scroll(1)">›</button>
    </div>
    <div v-for="item in panelItems" :id="id('panel', item.value)" :key="item.value" class="be-panel" role="tabpanel" :aria-labelledby="id('tab', item.value)"
      :tabindex="item.value === current ? 0 : undefined" :hidden="item.value !== current">
      <slot name="panel" :item="item" :active="item.value === current">{{ item.content }}</slot>
    </div>
  </div>
</template>

<style scoped>
.be-tabs { min-width: 0; max-width: 100%; }
.be-scroll-frame { position: relative; min-width: 0; border-radius: 999px; }
.be-scroll-frame[data-overflow=true] { background: var(--beui-card); }
.be-viewport { overflow-x: auto; scrollbar-width: none; border-radius: inherit; }
.be-viewport::-webkit-scrollbar { display: none; }
.be-list { position: relative; isolation: isolate; display: flex; align-items: stretch; width: max-content; box-sizing: border-box; padding: 4px; gap: 4px; border-radius: 999px; background: var(--beui-card); }
.be-trigger { position: relative; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap; margin: 0; border: 0; background: transparent; border-radius: inherit; cursor: pointer; color: var(--beui-muted-foreground); padding: 6px 14px; font: inherit; font-size: .875rem; line-height: 1.25rem; font-weight: 500; }
.be-trigger[aria-selected=true] { color: var(--beui-primary-foreground); }
.be-list[data-placed=false] .be-trigger[aria-selected=true] { background: var(--beui-primary); }
.be-trigger:disabled { opacity: .5; cursor: default; }
.be-trigger:focus-visible, .be-scroll:focus-visible, .be-panel:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: -2px; }
.be-indicator { position: absolute; pointer-events: none; top: 4px; bottom: 4px; left: 0; background: var(--beui-primary); border-radius: inherit; }
.be-ink { position: absolute; inset: 0; display: flex; align-items: center; justify-content: flex-end; padding-inline: inherit; clip-path: inset(0 max(0px, calc(100% + var(--tab-left) - var(--pill-right))) 0 max(0px, calc(var(--pill-left) - var(--tab-left)))); color: var(--beui-primary-foreground); pointer-events: none; }
.be-list[data-placed=false] .be-ink { display: none; }
.be-list[data-placed=true] .be-label { color: var(--beui-muted-foreground); }
.be-icon { display: grid; grid-template-columns: 1fr; margin-inline-end: 6px; transition: grid-template-columns .2s, margin .2s, opacity .15s; }
.be-icon > span { overflow: hidden; min-width: 0; display: grid; place-items: center; }
.be-icon[data-open=false] { grid-template-columns: 0fr; margin: 0; opacity: 0; }
.be-tabs[data-variant=segment] :is(.be-scroll-frame,.be-list) { border-radius: .5rem; }
.be-tabs[data-variant=segment] .be-list { padding: 2px; gap: 0; }
.be-tabs[data-variant=segment] .be-indicator { inset-block: 2px; border-radius: .375rem; }
.be-tabs[data-variant=underline] :is(.be-list,.be-scroll-frame) { border-radius: 0; background: transparent; }
.be-tabs[data-variant=underline] .be-list { padding: 0; border-bottom: 1px solid var(--beui-border); }
.be-tabs[data-variant=underline] .be-indicator { top: auto; bottom: 0; height: 1px; }
.be-tabs[data-variant=underline] .be-trigger { min-height: 44px; padding: 4px 12px 10px; }
.be-tabs[data-variant=underline] .be-trigger[aria-selected=true] { color: var(--beui-foreground); background: transparent; }
.be-tabs[data-variant=underline] .be-trigger[aria-selected=true] .be-label { color: inherit; }
.be-tabs[data-variant=underline] .be-list[data-placed=false] .be-trigger[aria-selected=true] { box-shadow: inset 0 -1px var(--beui-primary); }
.be-scroll { position: absolute; z-index: 2; inset-block: 0; width: 36px; border: 0; border-radius: inherit; background: transparent; color: var(--beui-foreground); font: inherit; font-size: 1.5rem; cursor: pointer; }
.be-scroll.left { left: 0; } .be-scroll.right { right: 0; } .be-scroll:disabled { visibility: hidden; }
.be-panel { margin-top: 1rem; border-radius: .375rem; }
.be-panel:not([hidden]) { animation: be-panel-in .18s cubic-bezier(.16,1,.3,1); }
@keyframes be-panel-in { from { opacity: 0; transform: translateY(4px); } }
@media (prefers-reduced-motion: reduce) { .be-icon { transition: none; } .be-panel:not([hidden]) { animation: none; } }
@media (forced-colors: active) { .be-trigger[aria-selected=true] { border-bottom: 2px solid Highlight; } .be-ink { display: none; } }
</style>
