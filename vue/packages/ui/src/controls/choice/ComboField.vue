<script setup lang="ts">
import { defaultFilter, type ComboFieldProps } from './combo-types'
import type { ChoiceOption } from '../types'
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../../core/reduced-motion'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { easeOut, layoutSpring, swapSpring } from '../../core/motion'
import { comboboxMessages, multiSelectMessages } from './messages'
import { useActiveOption } from './use-active-option'
import { usePortalPosition } from './use-portal-position'

// Shared engine of Combobox (single) and MultiSelect (tags): ports of components/motion/combobox/* and multi-select/*.
// The panel grows out of the field and then separates, on one weighted spring for both directions.
const MORPH = { type: 'spring', duration: 0.5, bounce: 0.22 } as const
const INSTANT = { duration: 0 } as const
const VIEWPORT_PADDING = 8

const props = withDefaults(defineProps<ComboFieldProps>(), {
  multiple: false, modelValue: undefined, defaultValue: undefined, open: undefined, defaultOpen: false, query: undefined, defaultQuery: '',
  filter: defaultFilter, disabled: false, side: 'bottom', align: 'start', sideOffset: 6, avoidCollisions: true,
})
const emit = defineEmits<{ 'update:modelValue': [value: any]; 'update:open': [open: boolean]; 'update:query': [query: string] }>()
defineSlots<{ option?: (props: { option: ChoiceOption; selected: boolean; active: boolean }) => unknown; chip?: (props: { option: ChoiceOption | undefined; value: string; label: string }) => unknown }>()

const strings = computed(() => ({ ...(props.multiple ? multiSelectMessages : comboboxMessages), ...props.labels }) as typeof multiSelectMessages & typeof comboboxMessages)
const reduce = useReducedMotion()
const uid = useId()
const triggerId = `${uid}-trigger`
const listId = `${uid}-list`
const inputId = `${uid}-input`
const activeLayoutId = `${uid}-active`
const root = useTemplateRef<HTMLElement>('root')
const triggerEl = useTemplateRef<HTMLElement>('triggerEl')
const inputEl = useTemplateRef<HTMLInputElement>('inputEl')
const panel = useTemplateRef<{ $el: HTMLElement }>('panel')
const measure = useTemplateRef<{ $el: HTMLElement }>('measure')
const panelEl = computed(() => panel.value?.$el ?? null)
const measureEl = computed(() => measure.value?.$el ?? null)

// State: each of value / open / query is controlled when its prop is given, uncontrolled otherwise.
const internalValue = shallowRef<string | string[] | undefined>(props.defaultValue ?? (props.multiple ? [] : undefined))
const internalOpen = shallowRef(props.defaultOpen)
const internalQuery = shallowRef(props.defaultQuery)
const modelValue = computed(() => props.modelValue !== undefined ? props.modelValue : internalValue.value)
const values = computed<string[]>(() => Array.isArray(modelValue.value) ? modelValue.value : modelValue.value ? [modelValue.value] : [])
const value = computed(() => values.value[0])
const open = computed(() => props.open !== undefined ? props.open : internalOpen.value)
const query = computed(() => props.query !== undefined ? props.query : internalQuery.value)

function updateQuery(next: string) {
  if (props.query === undefined) internalQuery.value = next
  emit('update:query', next)
}
function focusInput() { requestAnimationFrame(() => inputEl.value?.focus({ preventScroll: true })) }
function updateOpen(next: boolean, restoreFocus = false) {
  if (props.disabled && next) return
  if (next !== open.value) {
    if (props.open === undefined) internalOpen.value = next
    emit('update:open', next)
  }
  if (!next) updateQuery('')
  if (restoreFocus) focusInput()
}
function commit(next: string[]) {
  const out = props.multiple ? next : next[0]
  internalValue.value = out
  emit('update:modelValue', out)
}

const optionByValue = computed(() => new Map(props.options.map(option => [option.value, option])))
const labelFor = (v: string | undefined) => v === undefined ? undefined : optionByValue.value.get(v)?.label
const keywordsOf = (option: ChoiceOption) => [option.label, ...(option.keywords ?? []), ...(option.detail ? [option.detail] : []), ...(option.group ? [option.group] : [])]

// The query the list filters by. Closing clears `query`, but the panel is still on screen for its exit, so it keeps the open query.
const openQuery = shallowRef(query.value)
watch([open, query], () => { if (open.value && openQuery.value !== query.value) openQuery.value = query.value }, { flush: 'sync', immediate: true })
const listQuery = computed(() => open.value ? query.value : openQuery.value)
const visibleItems = computed(() => props.options.filter(option => props.filter(option.value, listQuery.value, keywordsOf(option))))
const visibleValues = computed(() => new Set(visibleItems.value.map(option => option.value)))
const enabledVisible = computed(() => visibleItems.value.filter(option => !option.disabled))
const isVisible = (v: string) => !listQuery.value.trim() || visibleValues.value.has(v)

const { activeValue, setActiveValue, moveActive } = useActiveOption({ open, query: listQuery, value, enabledItems: enabledVisible })
const optionId = (v: string) => `${uid}-option-${props.options.findIndex(option => option.value === v)}`
const activeItemId = computed(() => activeValue.value ? optionId(activeValue.value) : undefined)

function select(next: string) {
  if (optionByValue.value.get(next)?.disabled) return
  commit([next])
  updateOpen(false, true)
}
function toggle(next: string) {
  if (optionByValue.value.get(next)?.disabled) return
  commit(values.value.includes(next) ? values.value.filter(v => v !== next) : [...values.value, next])
  updateQuery('')
  focusInput()
}
function remove(next: string) {
  if (values.value.includes(next)) commit(values.value.filter(v => v !== next))
}
function choose(next: string) { props.multiple ? toggle(next) : select(next) }
function chooseActive() { if (activeValue.value) choose(activeValue.value) }

// Focus the input on open; keep the active row inside the scroller.
watch(open, isOpen => { if (isOpen) focusInput() })
watch([activeValue, open], async () => {
  if (!activeValue.value || !open.value) return
  await nextTick()
  const item = panelEl.value?.querySelector<HTMLElement>(`[data-value="${CSS.escape(activeValue.value)}"]`)
  const list = item?.closest<HTMLElement>("[role='listbox']")
  if (!item || !list) return
  const itemRect = item.getBoundingClientRect()
  const listRect = list.getBoundingClientRect()
  if (itemRect.top < listRect.top) list.scrollTop -= listRect.top - itemRect.top
  else if (itemRect.bottom > listRect.bottom) list.scrollTop += itemRect.bottom - listRect.bottom
}, { flush: 'post' })

watch(open, (isOpen, _, onCleanup) => {
  if (!isOpen) return
  const inside = (target: Node) => root.value?.contains(target) || panelEl.value?.contains(target)
  const onPointerDown = (event: PointerEvent) => { if (!inside(event.target as Node)) updateOpen(false) }
  const onFocusIn = (event: FocusEvent) => { if (!inside(event.target as Node)) updateOpen(false) }
  const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); updateOpen(false, true) } }
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('focusin', onFocusIn)
  window.addEventListener('keydown', onKeyDown)
  onCleanup(() => { window.removeEventListener('pointerdown', onPointerDown); window.removeEventListener('focusin', onFocusIn); window.removeEventListener('keydown', onKeyDown) })
}, { immediate: true })

// Panel geometry.
const mounted = shallowRef(false)
const morphReady = shallowRef(false)
let readyFrame = 0
onMounted(() => { mounted.value = true; readyFrame = requestAnimationFrame(() => requestAnimationFrame(() => { morphReady.value = true })) })
onBeforeUnmount(() => cancelAnimationFrame(readyFrame))
const { layout } = usePortalPosition(triggerEl, measureEl, mounted)
const actualSide = shallowRef<'top' | 'bottom'>(props.side)
watch([open, layout, () => props.side, () => props.sideOffset, () => props.avoidCollisions], () => {
  // Preserve the resolved side during exit, so top panels close upward.
  const l = layout.value
  if (!open.value || !l) return
  if (!props.avoidCollisions) { actualSide.value = props.side; return }
  const below = innerHeight - (l.trigger.top + l.trigger.height)
  const above = l.trigger.top
  if (props.side === 'bottom' && below < l.content.height + props.sideOffset && above > below) actualSide.value = 'top'
  else if (props.side === 'top' && above < l.content.height + props.sideOffset && below > above) actualSide.value = 'bottom'
  else actualSide.value = props.side
}, { flush: 'pre' })
const surfaceHeight = computed(() => layout.value?.content.height ?? 0)
const transition = computed(() => reduce.value || !morphReady.value ? INSTANT : MORPH)
const panelStyle = computed(() => {
  const l = layout.value
  const triggerLeft = l?.trigger.left ?? 0
  const triggerWidth = l?.trigger.width ?? 0
  const contentWidth = l?.content.width ?? triggerWidth
  const desired = props.align === 'end' ? triggerLeft + triggerWidth - contentWidth : props.align === 'center' ? triggerLeft + (triggerWidth - contentWidth) / 2 : triggerLeft
  const maxLeft = Math.max(VIEWPORT_PADDING, (typeof window === 'undefined' ? 0 : innerWidth) - contentWidth - VIEWPORT_PADDING)
  return {
    left: `${Math.min(Math.max(desired, VIEWPORT_PADDING), maxLeft)}px`,
    top: actualSide.value === 'bottom' && l ? `${l.trigger.top + l.trigger.height}px` : undefined,
    bottom: actualSide.value === 'top' && l ? `${innerHeight - l.trigger.top}px` : undefined,
    minWidth: `${triggerWidth}px`,
    pointerEvents: open.value ? 'auto' : 'none',
    transformOrigin: actualSide.value === 'bottom' ? 'top' : 'bottom',
    visibility: l ? 'visible' : 'hidden',
    '--be-combo-width': `${triggerWidth}px`,
    ...props.contentStyle,
  } as Record<string, string | number | undefined>
})
const panelAnimate = computed(() => ({
  height: open.value ? surfaceHeight.value : 0,
  opacity: open.value ? 1 : 0,
  y: open.value ? (actualSide.value === 'bottom' ? props.sideOffset : -props.sideOffset) : 0,
}))

// Groups: consecutive options sharing a `group` render under one label.
const groups = computed(() => {
  const out: { key: string; label?: string; items: ChoiceOption[] }[] = []
  for (const option of props.options) {
    const last = out[out.length - 1]
    if (last && last.label === option.group) last.items.push(option)
    else out.push({ key: `${out.length}`, label: option.group, items: [option] })
  }
  return out
})
const groupVisible = (items: ChoiceOption[]) => items.some(item => visibleValues.value.has(item.value))
const selectedLabel = computed(() => labelFor(value.value))
const showPlaceholder = computed(() => values.value.length === 0 && !open.value)
const inputValue = computed(() => props.multiple || open.value ? query.value : selectedLabel.value ?? '')
const inputPlaceholder = computed(() => props.multiple ? (values.value.length ? '' : props.placeholder ?? strings.value.inputPlaceholder) : props.placeholder ?? strings.value.inputPlaceholder)
const chipPlaceholder = computed(() => props.placeholder ?? strings.value.valuePlaceholder)

function onTriggerPointerDown(event: PointerEvent) {
  const target = event.target as HTMLElement
  if (props.disabled || target === inputEl.value || target.closest('[data-combo-remove]')) return
  event.preventDefault()
  inputEl.value?.focus({ preventScroll: true })
  updateOpen(true)
}
function onInputPointerDown(event: PointerEvent) {
  if (open.value) return
  if (!props.multiple) { event.preventDefault(); inputEl.value?.focus({ preventScroll: true }) }
  updateOpen(true)
}
function onInput(event: Event) {
  updateOpen(true)
  updateQuery((event.target as HTMLInputElement).value)
}
function onKeyDown(event: KeyboardEvent) {
  if (props.multiple && event.key === 'Backspace' && !query.value && values.value.length) {
    event.preventDefault()
    remove(values.value[values.value.length - 1])
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    // Opening is the whole action; the next key steps through the list the user can see.
    if (!open.value) { updateOpen(true); return }
    moveActive(event.key === 'ArrowDown' ? 1 : -1)
  } else if (event.key === 'Home' && open.value) { event.preventDefault(); moveActive('first') }
  else if (event.key === 'End' && open.value) { event.preventDefault(); moveActive('last') }
  else if (event.key === 'Enter') {
    if (event.isComposing || event.keyCode === 229) return
    event.preventDefault()
    if (open.value) chooseActive()
    else updateOpen(true)
  } else if (event.key === 'Escape' && open.value) { event.preventDefault(); updateOpen(false, true) }
}
</script>

<template>
  <div ref="root" class="be-combo" :data-multiple="multiple || undefined">
    <template v-if="name"><input v-for="v in values" :key="v" type="hidden" :name="name" :value="v" :disabled="disabled"></template>
    <div
      :id="triggerId" ref="triggerEl" class="be-combo-trigger" :class="{ 'is-multi': multiple }" :style="triggerStyle"
      :data-state="open ? 'open' : 'closed'" :data-disabled="disabled || undefined" @pointerdown="onTriggerPointerDown"
    >
      <template v-if="!multiple">
        <span class="be-combo-slot">
          <div class="be-combo-field">
            <svg class="be-combo-search" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              :id="inputId" ref="inputEl" class="be-combo-input" role="combobox" autocomplete="off" aria-autocomplete="list"
              :aria-label="label ?? strings.inputLabel" :aria-expanded="open" :aria-controls="listId" :aria-activedescendant="open ? activeItemId : undefined"
              :disabled="disabled" :value="inputValue" :placeholder="inputPlaceholder"
              @pointerdown="onInputPointerDown" @focus="updateOpen(true)" @click="updateOpen(true)" @input="onInput" @keydown="onKeyDown"
            >
          </div>
        </span>
      </template>
      <div v-else class="be-combo-values">
        <AnimatePresence :initial="false" mode="popLayout">
          <span v-if="showPlaceholder" key="placeholder" class="be-combo-placeholder">{{ chipPlaceholder }}</span>
          <motion.span
            v-for="v in values" :key="`chip-${v}`" class="be-combo-chip" :layout="reduce ? false : 'position'"
            :initial="{ opacity: 0, clipPath: 'inset(0 0 0 0% round 0.5rem)', transform: reduce ? 'translateY(0px) scale(1)' : 'translateY(6px) scale(0.92)' }"
            :animate="{ opacity: 1, clipPath: 'inset(0 0 0 0% round 0.5rem)', transform: 'translateY(0px) scale(1)' }"
            :exit="{ opacity: 1, clipPath: reduce ? 'inset(0 0 0 0% round 0.5rem)' : 'inset(0 0 0 100% round 0.5rem)', transform: 'translateY(0px) scale(1)', transition: { clipPath: reduce ? INSTANT : { duration: 0.16, ease: easeOut }, transform: INSTANT } }"
            :transition="reduce ? { layout: INSTANT, opacity: { duration: 0.15, ease: easeOut }, transform: INSTANT } : { layout: layoutSpring, opacity: { duration: 0.18, ease: easeOut }, transform: swapSpring }"
          >
            <span class="be-combo-chip-label"><slot name="chip" :option="optionByValue.get(v)" :value="v" :label="labelFor(v) ?? v">{{ labelFor(v) ?? v }}</slot></span>
            <button
              type="button" data-combo-remove class="be-combo-remove" :aria-label="strings.removeValue.replace('{label}', labelFor(v) ?? v)" :disabled="disabled"
              @pointerdown.stop @click.stop="remove(v); inputEl?.focus({ preventScroll: true })"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </motion.span>
        </AnimatePresence>
        <div class="be-combo-field is-multi">
          <svg v-if="showIcon" class="be-combo-search" aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            :id="inputId" ref="inputEl" class="be-combo-input is-multi" role="combobox" autocomplete="off" aria-autocomplete="list"
            :aria-label="label ?? strings.inputLabel" :aria-expanded="open" :aria-controls="listId" :aria-activedescendant="open ? activeItemId : undefined"
            :disabled="disabled" :value="inputValue" :placeholder="inputPlaceholder"
            @pointerdown="onInputPointerDown" @focus="updateOpen(true)" @click="updateOpen(true)" @input="onInput" @keydown="onKeyDown"
          >
        </div>
      </div>
      <span aria-hidden="true" class="be-combo-chevrons">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg>
      </span>
    </div>

    <Teleport v-if="mounted" to="body">
      <motion.div
        ref="panel" class="be-combo-panel" :data-side="actualSide" :aria-hidden="!open" :inert="(open ? undefined : '') as never"
        :initial="false" :animate="panelAnimate" :transition="transition" :style="panelStyle"
      >
        <motion.div ref="measure" :initial="false" :animate="{ opacity: open ? 1 : 0 }" :transition="transition">
          <div :id="listId" role="listbox" class="be-combo-list" :aria-label="listLabel ?? strings.listLabel" :aria-multiselectable="multiple || undefined" :style="listStyle">
            <template v-for="(group, groupIndex) in groups" :key="group.key">
              <component :is="group.label !== undefined ? 'fieldset' : 'div'" :hidden="!groupVisible(group.items)" :class="group.label !== undefined ? 'be-combo-group' : 'be-combo-ungrouped'">
                <div v-if="groupSeparator && groupIndex > 0 && groupVisible(group.items)" aria-hidden="true" class="be-combo-separator" />
                <legend v-if="group.label !== undefined" class="be-combo-label">{{ group.label }}</legend>
                <template v-for="option in group.items" :key="option.value">
                  <button
                    v-if="isVisible(option.value)" :id="optionId(option.value)" type="button" role="option" class="be-combo-item"
                    :aria-selected="values.includes(option.value)" :disabled="option.disabled" tabindex="-1" :data-value="option.value"
                    :data-active="activeValue === option.value || undefined" :data-selected="values.includes(option.value) || undefined"
                    @pointermove="!option.disabled && setActiveValue(option.value)" @pointerdown.prevent @click="!option.disabled && choose(option.value)"
                  >
                    <motion.span
                      v-if="activeValue === option.value" aria-hidden="true" class="be-combo-active" :layout-id="activeLayoutId"
                      :transition="reduce ? INSTANT : layoutSpring"
                    />
                    <span class="be-combo-item-body">
                      <slot name="option" :option="option" :selected="values.includes(option.value)" :active="activeValue === option.value">
                        <span v-if="option.color" class="be-combo-dot" :style="{ background: option.color }" />
                        <span class="be-combo-text">
                          <span class="be-combo-name">{{ option.label }}</span>
                          <span v-if="option.detail" class="be-combo-detail">{{ option.detail }}</span>
                        </span>
                      </slot>
                    </span>
                    <motion.span
                      aria-hidden="true" class="be-combo-check" :initial="false"
                      :animate="{ opacity: values.includes(option.value) ? 1 : 0, transform: values.includes(option.value) ? 'scale(1)' : 'scale(0.82)' }"
                      :transition="reduce ? INSTANT : { duration: 0.14, ease: easeOut }"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    </motion.span>
                  </button>
                </template>
              </component>
            </template>
            <div v-if="visibleItems.length === 0" role="status" class="be-combo-empty">{{ empty ?? strings.empty }}</div>
          </div>
        </motion.div>
      </motion.div>
    </Teleport>
  </div>
</template>

<style scoped>
.be-combo { position: relative; box-sizing: border-box; width: 100%; font-size: .875rem; line-height: 1.25rem; }
.be-combo-trigger { position: relative; z-index: 20; box-sizing: border-box; display: flex; width: 100%; min-width: 13rem; height: 2.5rem; cursor: text; align-items: center; justify-content: space-between; gap: .75rem; padding: 0 .75rem; border: 1px solid var(--beui-border); border-radius: .75rem; background: transparent; color: var(--beui-foreground); transition: border-color .15s cubic-bezier(.4, 0, .2, 1); }
.be-combo-trigger.is-multi { height: auto; min-height: 2.75rem; gap: .5rem; padding: .375rem .625rem; }
.be-combo-trigger:hover { border-color: var(--beui-border-strong, color-mix(in srgb, var(--beui-foreground) 12%, transparent)); }
.be-combo-trigger:focus-within { box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 20%, transparent); }
.be-combo-trigger[data-disabled] { pointer-events: none; opacity: .5; }
.be-combo-slot { min-width: 0; flex: 1 1 0%; text-align: left; }
.be-combo-field { display: flex; min-width: 0; flex: 1 1 0%; align-items: center; gap: .5rem; }
.be-combo-field.is-multi { min-width: 5rem; gap: .375rem; }
.be-combo-search { flex: none; color: var(--beui-muted-foreground); }
.be-combo-input { box-sizing: border-box; height: 2.5rem; min-width: 0; flex: 1 1 0%; margin: 0; padding: 0; border: 0; background: transparent; color: var(--beui-foreground); font: inherit; font-size: .875rem; line-height: 1.25rem; outline: none; }
.be-combo-input.is-multi { height: 1.75rem; min-width: 3rem; }
.be-combo-input::placeholder { color: var(--beui-muted-foreground); opacity: 1; }
.be-combo-input:disabled { cursor: not-allowed; }
.be-combo-chevrons { flex: none; display: inline-flex; color: var(--beui-muted-foreground); }
.be-combo-values { display: flex; min-width: 0; flex: 1 1 0%; flex-wrap: wrap; align-items: center; gap: .375rem; }
.be-combo-placeholder { color: var(--beui-muted-foreground); }
.be-combo-chip { display: inline-flex; box-sizing: border-box; height: 1.75rem; max-width: 100%; align-items: center; gap: .25rem; padding: 0 .5rem; border-radius: .5rem; background: var(--beui-muted); color: var(--beui-foreground); font-size: .75rem; line-height: 1rem; font-weight: 500; }
.be-combo-chip-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.be-combo-remove { display: grid; flex: none; width: 1.25rem; height: 1.25rem; margin: 0 -.25rem 0 0; padding: 0; place-items: center; border: 0; border-radius: .375rem; background: transparent; color: var(--beui-muted-foreground); cursor: pointer; outline: none; transition: color .15s cubic-bezier(.4, 0, .2, 1), background-color .15s cubic-bezier(.4, 0, .2, 1); }
.be-combo-remove:hover { background: color-mix(in srgb, var(--beui-foreground) 10%, transparent); color: var(--beui-foreground); }
.be-combo-remove:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-combo-panel { position: fixed; z-index: 9999; box-sizing: border-box; width: var(--be-combo-width); overflow: hidden; border: 1px solid var(--beui-border); border-radius: .75rem; background: var(--beui-background); color: var(--beui-foreground); outline: none; font-size: .875rem; line-height: 1.25rem; will-change: height, transform; }
.be-combo-list { position: relative; isolation: isolate; box-sizing: border-box; max-height: 16rem; overflow-y: auto; overscroll-behavior: contain; padding: .375rem; scrollbar-width: none; -ms-overflow-style: none; }
.be-combo-list::-webkit-scrollbar { display: none; }
.be-combo-group { min-width: 0; margin: 0; padding: .125rem 0; border: 0; }
.be-combo-group[hidden], .be-combo-ungrouped[hidden] { display: none; }
.be-combo-label { box-sizing: border-box; width: 100%; padding: .375rem .5rem; color: var(--beui-muted-foreground); font-size: .68rem; line-height: 1rem; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; }
.be-combo-separator { height: 1px; margin: .25rem -.25rem; background: var(--beui-border); }
.be-combo-item { position: relative; box-sizing: border-box; display: flex; width: 100%; align-items: center; gap: .5rem; margin: 0; padding: .5rem; border: 0; border-radius: .5rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: .875rem; line-height: 1.25rem; text-align: left; outline: none; cursor: pointer; transition: color .15s; }
.be-combo-item[data-active], .be-combo[data-multiple] .be-combo-item[data-selected] { color: var(--beui-foreground); }
.be-combo-item:disabled { pointer-events: none; opacity: .45; }
.be-combo-active { position: absolute; inset: 0; z-index: -10; border-radius: .5rem; background: var(--beui-muted); }
.be-combo-item-body { display: flex; min-width: 0; flex: 1 1 0%; align-items: center; gap: .5rem; }
.be-combo-text { display: block; min-width: 0; }
.be-combo-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.be-combo-detail { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--beui-muted-foreground); font-size: .75rem; line-height: 1rem; }
.be-combo-dot { flex: none; width: .65rem; height: .65rem; border-radius: 50%; }
.be-combo-check { display: grid; flex: none; width: 1.25rem; height: 1.25rem; place-items: center; color: var(--beui-foreground); }
.be-combo-empty { padding: 2rem .75rem; color: var(--beui-muted-foreground); font-size: .875rem; text-align: center; }
</style>
