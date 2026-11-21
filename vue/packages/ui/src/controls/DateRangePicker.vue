<script lang="ts">
export { dateRangePickerMessages, type DateRangePickerMessages } from './drp-core'
</script>

<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, onBeforeUnmount, provide, shallowRef, useId, watch } from 'vue'
import { layoutSpring } from '../core/motion'
import DrpCalendar from './DrpCalendar.vue'
import DrpMorphPanel from './DrpMorphPanel.vue'
import { useDrpController } from './drp-controller'
import { DRP_KEY, parse, type DateRange, type DateRangePickerMessages, type DateRangePreset } from './drp-core'

/**
 * A date range picker: a trigger that morphs open into a calendar (or the calendar inline with
 * `inline`). Port of `components/motion/date-range-picker.tsx`.
 */
const props = withDefaults(defineProps<{
  /** The range, `{ from, to? }` as YYYY-MM-DD, or `null`. Use with `v-model`. */
  modelValue?: DateRange | null
  /** Uncontrolled initial range. */
  defaultValue?: DateRange | null
  defaultMonth?: string
  min?: string
  max?: string
  isDateDisabled?: (date: string) => boolean
  presets?: readonly DateRangePreset[]
  locale?: string
  label?: string
  disabled?: boolean
  /** Move focus to the active date on mount (an inline calendar) or on open (the popover). */
  autoFocus?: boolean
  /** Show the start/end summary above the calendar. Defaults to true inline, false in the popover. */
  showSummary?: boolean
  /** Controlled open state, `v-model:open`. */
  open?: boolean
  /** Close an open popover after a complete range or preset. Default false. */
  closeOnSelect?: boolean
  /** Render the calendar inline instead of behind a trigger. */
  inline?: boolean
  /** Trigger text when no range is chosen. */
  placeholder?: string
  /** Override any built-in string. */
  labels?: Partial<DateRangePickerMessages>
}>(), { modelValue: undefined, defaultValue: undefined, open: undefined, autoFocus: undefined, showSummary: undefined, disabled: false, closeOnSelect: false, inline: false })
const emit = defineEmits<{
  'update:modelValue': [value: DateRange | null]
  'update:open': [open: boolean]
}>()

const ctx = useDrpController(
  {
    get defaultValue() { return props.defaultValue },
    get defaultMonth() { return props.defaultMonth },
    get min() { return props.min },
    get max() { return props.max },
    get isDateDisabled() { return props.isDateDisabled },
    get presets() { return props.presets },
    get locale() { return props.locale },
    get label() { return props.label },
    get disabled() { return props.disabled },
    get autoFocus() { return props.autoFocus ?? false },
    get showSummary() { return props.showSummary ?? props.inline },
    get closeOnSelect() { return props.closeOnSelect },
    get labels() { return props.labels },
  },
  () => props.modelValue,
  () => props.open,
  value => emit('update:modelValue', value),
  next => emit('update:open', next),
)
provide(DRP_KEY, ctx)

const uid = useId()
const triggerId = `${uid}-trigger`
const contentId = `${uid}-content`
const root = ctx.root
const triggerEl = ctx.trigger

function setTrigger(node: unknown) {
  triggerEl.value = ((node as { $el?: HTMLElement } | null)?.$el ?? node) as HTMLElement | null
}

const summary = computed(() => {
  const value = ctx.value.value
  if (!value) return props.placeholder ?? ctx.t('placeholder')
  const sameYear = value.to && value.from.slice(0, 4) === value.to.slice(0, 4)
  const start = (sameYear ? ctx.formats.value.shortNoYear : ctx.formats.value.short).format(parse(value.from))
  return `${start} – ${value.to ? ctx.formats.value.short.format(parse(value.to)) : ctx.t('selectEnd')}`
})

function focusCalendarDate(content: HTMLElement | null) {
  const grid = Array.from(content?.querySelectorAll<HTMLElement>('[role="grid"]') ?? []).find(element => !element.closest('[inert]'))
  const target = grid?.querySelector<HTMLElement>('button[tabindex="0"]') ?? grid
  target?.focus({ preventScroll: true })
}
const focusOnOpen = computed(() => props.autoFocus !== false)
function opened(content: HTMLElement) {
  ctx.content.value = content
  if (focusOnOpen.value) focusCalendarDate(content)
}
// A rapid reopen can revive the exiting surface before it unmounts, which already ran `opened`.
watch(ctx.open, isOpen => { if (isOpen && focusOnOpen.value) focusCalendarDate(ctx.content.value) }, { flush: 'post' })

// Closes on an outside pointer press or Escape.
function close() {
  ctx.setOpen(false)
  const focused = document.activeElement
  if (focused instanceof HTMLElement && ctx.content.value?.contains(focused)) triggerEl.value?.focus()
}
let detach: (() => void) | undefined
watch(ctx.open, isOpen => {
  detach?.()
  detach = undefined
  if (!isOpen || props.inline) return
  const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
  const onPointer = (event: PointerEvent) => {
    const target = event.target as Node
    if (root.value && !root.value.contains(target) && !ctx.content.value?.contains(target)) close()
  }
  window.addEventListener('keydown', onKey)
  window.addEventListener('pointerdown', onPointer)
  detach = () => {
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('pointerdown', onPointer)
  }
})
onBeforeUnmount(() => detach?.())

const rootRef = (node: unknown) => { root.value = node as HTMLElement | null }
const toggle = () => ctx.setOpen(!ctx.open.value)

defineExpose({ open: ctx.open, setOpen: ctx.setOpen, clear: ctx.clear })
</script>

<template>
  <div :ref="rootRef" class="drp-root" :class="{ 'drp-inline': inline }">
    <DrpCalendar v-if="inline" />
    <template v-else>
      <motion.button
        :id="triggerId"
        :ref="setTrigger"
        type="button"
        class="drp-trigger"
        :layout="!ctx.reduce.value"
        :transition="{ layout: layoutSpring }"
        :style="{ borderRadius: '12px' }"
        :disabled="disabled"
        :aria-label="ctx.t('triggerLabel', { label: ctx.label.value, summary })"
        aria-haspopup="dialog"
        :aria-expanded="ctx.open.value"
        :aria-controls="ctx.open.value ? contentId : undefined"
        @click="toggle"
      >
        <motion.span :layout="ctx.reduce.value ? false : 'position'" :transition="{ layout: layoutSpring }" class="drp-trigger-icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" /></svg>
        </motion.span>
        <motion.span :layout="ctx.reduce.value ? false : 'position'" :transition="{ layout: layoutSpring }" class="drp-trigger-text">{{ summary }}</motion.span>
        <motion.span :layout="ctx.reduce.value ? false : 'position'" :transition="{ layout: layoutSpring }" class="drp-trigger-icon" aria-hidden="true">
          <svg class="drp-trigger-chevron" :class="{ 'drp-flip': ctx.open.value }" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </motion.span>
      </motion.button>
      <DrpMorphPanel :open="ctx.open.value" :anchor="triggerEl" :id="contentId" :labelled-by="triggerId" align="start" :radius="16" :shadow="false" width="20rem" @opened="opened">
        <DrpCalendar bare />
      </DrpMorphPanel>
    </template>
  </div>
</template>

<style scoped>
.drp-root { position: relative; display: inline-flex; max-width: 100%; }
.drp-root.drp-inline { display: block; }
.drp-trigger {
  display: inline-flex; box-sizing: border-box; width: fit-content; max-width: 100%; height: 2.25rem; align-items: center; gap: 0.5rem; margin: 0; padding: 0 0.75rem;
  border: 1px solid var(--beui-border); background: var(--beui-background); color: var(--beui-foreground); font: inherit; font-size: 13px; line-height: 1.25rem; font-weight: 500; cursor: pointer; outline: none;
  transition: color 150ms, background-color 150ms, box-shadow 150ms;
}
@media (hover: hover) { .drp-trigger:hover:not(:disabled) { background: color-mix(in srgb, var(--beui-muted) 40%, transparent); } }
.drp-trigger:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.drp-trigger:disabled { opacity: 0.4; cursor: default; }
.drp-trigger-icon { display: inline-flex; flex-shrink: 0; color: var(--beui-muted-foreground); }
.drp-trigger-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-variant-numeric: tabular-nums; }
.drp-flip { transform: rotate(180deg); }
</style>
