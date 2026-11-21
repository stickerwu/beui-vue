<script lang="ts">
export { selectMessages as selectMorphMessages, type SelectMessages as SelectMorphMessages } from './messages'
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../../core/reduced-motion'
import { computed, nextTick, shallowRef, useId, useTemplateRef, watch } from 'vue'
import type { ChoiceOption } from '../types'
import { selectMessages, type SelectMessages } from './messages'
import { useChoiceListbox } from './use-listbox'

// Shared-layout morph: trigger box grows into the panel and back, one surface (see `components/motion/select-morph.tsx`).
const MORPH = { type: 'spring', duration: 0.5, bounce: 0.22 } as const
const INSTANT = { duration: 0 } as const
const LIST = { hidden: {}, show: { transition: { staggerChildren: 0.035, delayChildren: 0.08 } } }
const ITEM = { hidden: { opacity: 0, y: -6, filter: 'blur(3px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)' } }

const props = withDefaults(defineProps<{
  options: readonly ChoiceOption[]
  modelValue?: string
  defaultValue?: string
  /** Placeholder shown while nothing is selected. */
  placeholder?: string
  /** Accessible name for the list. Falls back to the panel header. */
  label?: string
  disabled?: boolean
  name?: string
  labels?: Partial<SelectMessages>
}>(), { modelValue: undefined, defaultValue: undefined })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
defineSlots<{ value?: (props: { option?: ChoiceOption }) => unknown; option?: (props: { option: ChoiceOption; selected: boolean }) => unknown }>()

const strings = computed(() => ({ ...selectMessages, ...props.labels }))
const reduce = useReducedMotion()
const transition = computed(() => reduce.value ? INSTANT : MORPH)
const uid = useId()
const layoutId = `${uid}-surface`
const triggerId = `${uid}-trigger`
const listId = `${uid}-list`
const headerId = `${uid}-header`
const root = useTemplateRef<HTMLElement>('root')
const trigger = useTemplateRef<{ $el: HTMLElement }>('trigger')
const list = useTemplateRef<{ $el: HTMLElement }>('list')
const listEl = computed(() => list.value?.$el ?? null)
const open = shallowRef(false)
// Set when the panel closes holding focus: the trigger is unmounted while open, so focus can only go back once it has mounted again.
let restoreFocus = false

const internalValue = shallowRef(props.defaultValue)
const current = computed(() => props.modelValue !== undefined ? props.modelValue : internalValue.value)
const selectedOption = computed(() => props.options.find(option => option.value === current.value))
const text = computed(() => selectedOption.value?.label ?? props.placeholder ?? strings.value.valuePlaceholder)
const rows = computed(() => props.options.map(option => ({ id: option.value, label: option.label, disabled: option.disabled })))
const { activeId, onKeyDown } = useChoiceListbox({ open, rows, selected: current, list: listEl })

function setOpen(next: boolean) { if (!next || !props.disabled) open.value = next }
function close() {
  if (root.value?.contains(document.activeElement)) restoreFocus = true
  open.value = false
}
function select(value: string) {
  internalValue.value = value
  emit('update:modelValue', value)
  close()
}
watch(open, async isOpen => {
  if (isOpen || !restoreFocus) return
  restoreFocus = false
  await nextTick()
  trigger.value?.$el.focus()
})
watch(open, (isOpen, _, onCleanup) => {
  if (!isOpen) return
  const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
  const onPointer = (event: PointerEvent) => { if (root.value && !root.value.contains(event.target as Node)) open.value = false }
  window.addEventListener('keydown', onKey)
  window.addEventListener('pointerdown', onPointer)
  onCleanup(() => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onPointer) })
})

function onTriggerKey(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true) }
}
function onListKey(event: KeyboardEvent) {
  if (event.key === 'Tab') { event.preventDefault(); close() }
  else onKeyDown(event)
}
</script>

<template>
  <div ref="root" class="be-select-morph">
    <input v-if="name && current !== undefined" type="hidden" :name="name" :value="current" :disabled="disabled">
    <!-- invisible sizer reserves the closed height (the morph surface is absolute) -->
    <div aria-hidden="true" inert class="be-smorph-row be-smorph-sizer">
      <span>{{ text }}</span>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
    </div>

    <AnimatePresence :initial="false" mode="popLayout">
      <motion.button
        v-if="!open" :id="triggerId" key="trigger" ref="trigger" :layout-id="layoutId" type="button" class="be-smorph-row be-smorph-trigger"
        :disabled="disabled" aria-haspopup="listbox" :aria-expanded="false" :aria-controls="listId" :transition="transition"
        :style="{ borderRadius: 12 }" @click="setOpen(true)" @keydown="onTriggerKey"
      >
        <motion.span layout="position" class="be-smorph-text" :data-placeholder="selectedOption ? undefined : ''">
          <slot name="value" :option="selectedOption">{{ text }}</slot>
        </motion.span>
        <motion.span layout="position" class="be-smorph-chevron">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </motion.span>
      </motion.button>
    </AnimatePresence>

    <AnimatePresence :initial="false" mode="popLayout">
      <motion.div v-if="open" key="panel" :layout-id="layoutId" class="be-smorph-panel" :transition="transition" :style="{ borderRadius: 12 }">
        <!-- header mirrors the trigger (continuous morph) and collapses the panel back when clicked -->
        <motion.button :id="headerId" type="button" layout="position" class="be-smorph-row be-smorph-header" aria-haspopup="listbox" aria-expanded="true" :aria-controls="listId" @click="close">
          <span class="be-smorph-text" :data-placeholder="selectedOption ? undefined : ''">{{ text }}</span>
          <motion.span aria-hidden="true" class="be-smorph-chevron" :animate="{ rotate: 180 }" :transition="transition">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </motion.span>
        </motion.button>
        <div class="be-smorph-rule" />
        <motion.ul
          :id="listId" ref="list" role="listbox" class="be-smorph-list" :aria-label="label" :aria-labelledby="label ? undefined : headerId"
          initial="hidden" animate="show" :variants="reduce ? undefined : LIST" @keydown="onListKey"
        >
          <template v-for="(option, index) in options" :key="option.value">
            <li v-if="option.group && option.group !== options[index - 1]?.group" role="presentation" class="be-smorph-group" aria-hidden="true">{{ option.group }}</li>
            <motion.li role="none" :variants="reduce ? undefined : ITEM">
              <button
                type="button" role="option" class="be-smorph-item" :aria-selected="option.value === current" :disabled="option.disabled"
                :tabindex="activeId === option.value ? 0 : -1" :data-listbox-id="option.value" :data-selected="option.value === current || undefined"
                @click="select(option.value)"
              >
                <slot name="option" :option="option" :selected="option.value === current">
                  <span v-if="option.color" class="be-smorph-dot" :style="{ background: option.color }" />
                  <span>{{ option.label }}</span>
                </slot>
                <svg v-if="option.value === current" class="be-smorph-check" aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </button>
            </motion.li>
          </template>
        </motion.ul>
      </motion.div>
    </AnimatePresence>
  </div>
</template>

<style scoped>
.be-select-morph { position: relative; box-sizing: border-box; font-size: .875rem; line-height: 1.25rem; }
.be-smorph-row { box-sizing: border-box; display: flex; width: 100%; align-items: center; justify-content: space-between; gap: .5rem; margin: 0; padding: .625rem .875rem; font: inherit; font-size: .875rem; line-height: 1.25rem; text-align: left; }
.be-smorph-sizer { visibility: hidden; border: 1px solid transparent; border-radius: .75rem; }
.be-smorph-trigger { position: absolute; inset-inline: 0; top: 0; z-index: 10; border: 1px solid var(--beui-border); background: var(--beui-background); color: var(--beui-foreground); outline: none; cursor: pointer; transition: color .15s cubic-bezier(.4, 0, .2, 1), background-color .15s cubic-bezier(.4, 0, .2, 1), border-color .15s cubic-bezier(.4, 0, .2, 1); }
.be-smorph-trigger:hover { border-color: var(--beui-border-strong, color-mix(in srgb, var(--beui-foreground) 12%, transparent)); }
.be-smorph-trigger:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 20%, transparent); }
.be-smorph-trigger:disabled { pointer-events: none; opacity: .5; }
.be-smorph-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--beui-foreground); }
.be-smorph-text[data-placeholder] { color: var(--beui-muted-foreground); }
.be-smorph-chevron { display: inline-flex; color: var(--beui-muted-foreground); }
.be-smorph-panel { position: absolute; inset-inline: 0; top: 0; z-index: 30; box-sizing: border-box; overflow: hidden; border: 1px solid var(--beui-border); background: var(--beui-background); box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1); }
.be-smorph-header { border: 0; background: transparent; color: var(--beui-foreground); outline: none; cursor: pointer; }
.be-smorph-rule { height: 1px; background: var(--beui-border); }
.be-smorph-list { box-sizing: border-box; margin: 0; padding: .25rem; list-style: none; }
.be-smorph-item { box-sizing: border-box; display: flex; width: 100%; align-items: center; justify-content: space-between; gap: .5rem; margin: 0; padding: .375rem .625rem; border: 0; border-radius: .5rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: .875rem; line-height: 1.25rem; text-align: left; outline: none; cursor: pointer; transition: color .15s cubic-bezier(.4, 0, .2, 1), background-color .15s cubic-bezier(.4, 0, .2, 1); }
.be-smorph-item:hover, .be-smorph-item:focus-visible { background: var(--beui-muted); color: var(--beui-foreground); }
.be-smorph-item[data-selected] { background: var(--beui-muted); color: var(--beui-foreground); }
.be-smorph-item:disabled { pointer-events: none; opacity: .5; }
.be-smorph-item > span { display: inline-flex; align-items: center; gap: .5rem; }
.be-smorph-check { flex: none; }
.be-smorph-dot { width: .65rem; height: .65rem; border-radius: 50%; }
.be-smorph-group { padding: .375rem .625rem .125rem; color: var(--beui-muted-foreground); font-size: .75rem; }
</style>
