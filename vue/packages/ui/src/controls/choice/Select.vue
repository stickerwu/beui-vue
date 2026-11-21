<script lang="ts">
export { selectMessages, type SelectMessages } from './messages'
</script>

<script setup lang="ts">
import { animate, motion, useMotionValue, useTransform } from 'motion-v'
import { useReducedMotion } from '../../core/reduced-motion'
import { computed, onBeforeUnmount, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { easeOut } from '../../core/motion'
import type { ChoiceOption } from '../types'
import { selectMessages, type SelectMessages } from './messages'
import { useChoiceListbox } from './use-listbox'

// One progress value drives the surface, gap, corners and chevron (see `components/motion/select.tsx`).
const UNFOLD_SPRING = { type: 'spring', visualDuration: 0.2, bounce: 0.12 } as const
const UNFOLD_EXIT = { duration: 0.2, ease: easeOut } as const
const RADIUS = 12
const GAP = 8
const LIP = 8
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const props = withDefaults(defineProps<{
  options: readonly ChoiceOption[]
  modelValue?: string
  defaultValue?: string
  open?: boolean
  defaultOpen?: boolean
  /** Placeholder shown while nothing is selected. */
  placeholder?: string
  /** Accessible name for the list. Falls back to the trigger. */
  label?: string
  disabled?: boolean
  name?: string
  /** Override any built-in string. */
  labels?: Partial<SelectMessages>
}>(), { open: undefined, defaultOpen: false })
const emit = defineEmits<{ 'update:modelValue': [value: string]; 'update:open': [open: boolean] }>()
defineSlots<{ value?: (props: { option?: ChoiceOption }) => unknown; option?: (props: { option: ChoiceOption; selected: boolean }) => unknown }>()

const strings = computed(() => ({ ...selectMessages, ...props.labels }))
const reduce = useReducedMotion()
const uid = useId()
const triggerId = `${uid}-trigger`
const listId = `${uid}-list`
const root = useTemplateRef<HTMLElement>('root')
const trigger = useTemplateRef<{ $el: HTMLElement }>('trigger')
const panel = useTemplateRef<{ $el: HTMLElement }>('panel')
const panelEl = computed(() => panel.value?.$el ?? null)

const internalValue = shallowRef(props.defaultValue)
const current = computed(() => props.modelValue !== undefined ? props.modelValue : internalValue.value)
const internalOpen = shallowRef(props.defaultOpen ?? false)
const open = computed(() => props.open !== undefined ? props.open : internalOpen.value)
function setOpen(next: boolean) {
  if (next && props.disabled) return
  if (props.open === undefined) internalOpen.value = next
  if (next !== open.value) emit('update:open', next)
}

const rows = computed(() => props.options.map(option => ({ id: option.value, label: option.label, disabled: option.disabled })))
const selectedOption = computed(() => props.options.find(option => option.value === current.value))
const { activeId, onKeyDown } = useChoiceListbox({ open, rows, selected: current, list: panelEl })
const progress = useMotionValue(open.value ? 1 : 0)
const placement = shallowRef<'bottom' | 'top'>('bottom')
const height = shallowRef(0)

// Keep descendants laid out while hidden (display:none resets nested scrollers); collapse only the hidden footprint after exit.
const exiting = shallowRef(false)
const present = computed(() => open.value || exiting.value)
const ready = computed(() => height.value > 0 && !reduce.value)

function close() {
  const el = trigger.value?.$el
  if (root.value?.contains(document.activeElement) && document.activeElement !== el) el?.focus()
  setOpen(false)
}
function select(value: string) {
  internalValue.value = value
  emit('update:modelValue', value)
  close()
}

let animation: ReturnType<typeof animate> | undefined
watch(open, (isOpen, wasOpen) => {
  if (!isOpen && wasOpen) exiting.value = true
  if (isOpen) {
    // Flip upward when there isn't room below and there's more above.
    const rect = trigger.value?.$el.getBoundingClientRect()
    const h = panelEl.value?.offsetHeight ?? 0
    if (rect) placement.value = innerHeight - rect.bottom < h + 16 && rect.top > innerHeight - rect.bottom ? 'top' : 'bottom'
  }
  animation?.stop()
  animation = animate(progress, isOpen ? 1 : 0, {
    ...(reduce.value ? { duration: 0.12 } : isOpen ? UNFOLD_SPRING : UNFOLD_EXIT),
    onComplete: () => { if (progress.get() === 0) exiting.value = false },
  })
}, { flush: 'post' })
onBeforeUnmount(() => animation?.stop())

// Measure the panel while it is on screen.
watch([panelEl, present], (_, __, onCleanup) => {
  const node = panelEl.value
  if (!node || !present.value) return
  const measure = () => { height.value = node.offsetHeight }
  measure()
  const observer = new ResizeObserver(measure)
  observer.observe(node)
  onCleanup(() => observer.disconnect())
}, { flush: 'post', immediate: true })

// Outside pointer / Escape.
watch(open, (isOpen, _, onCleanup) => {
  if (!isOpen) return
  const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
  const onPointer = (event: PointerEvent) => { if (root.value && !root.value.contains(event.target as Node)) setOpen(false) }
  window.addEventListener('keydown', onKey)
  window.addEventListener('pointerdown', onPointer)
  onCleanup(() => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onPointer) })
}, { immediate: true })

const isTop = computed(() => placement.value === 'top')
// The edge facing the panel flattens while attached and rounds back as the panel pulls away.
const nearRadius = useTransform(progress, [0, 0.2, 0.4, 1], [RADIUS, 0, 0, RADIUS])
const rotate = useTransform(progress, p => reduce.value ? (open.value ? 180 : 0) : Math.min(1, Math.max(0, p)) * 180)
const triggerStyle = computed(() => {
  const near = reduce.value ? RADIUS : nearRadius
  return {
    borderTopLeftRadius: isTop.value ? near : RADIUS, borderTopRightRadius: isTop.value ? near : RADIUS,
    borderBottomLeftRadius: isTop.value ? RADIUS : near, borderBottomRightRadius: isTop.value ? RADIUS : near,
  }
})

// Reveal a full-size panel from its near edge. All readers share one progress value.
const detach = useTransform(progress, [0.4, 1], [0, 1])
const y = useTransform(detach, d => lerp(ready.value ? (isTop.value ? GAP : -GAP) : 0, 0, d))
const panelNear = useTransform(detach, d => ready.value ? RADIUS * d : RADIUS)
const borderRadius = useTransform(panelNear, near => isTop.value ? `${RADIUS}px ${RADIUS}px ${near}px ${near}px` : `${near}px ${near}px ${RADIUS}px ${RADIUS}px`)
const clipPath = useTransform([progress, panelNear] as const, ([p, near]: number[]) => {
  if (!ready.value) return 'none'
  const reveal = Math.min(1, Math.max(0, p))
  if (reveal === 1) return 'none'
  const hidden = Math.max(0, (height.value - LIP) * (1 - reveal))
  const inset = isTop.value ? `${hidden}px 0 0 0` : `0 0 ${hidden}px 0`
  const corners = isTop.value ? `${RADIUS}px ${RADIUS}px ${near}px ${near}px` : `${near}px ${near}px ${RADIUS}px ${RADIUS}px`
  return `inset(${inset} round ${corners})`
})
const opacity = useTransform(progress, p => reduce.value ? Math.min(1, Math.max(0, p)) : Math.min(1, Math.max(0, p / 0.12)))
const panelStyle = computed(() => ({
  visibility: present.value ? undefined : 'hidden',
  maxHeight: present.value ? undefined : 0,
  borderWidth: present.value ? undefined : 0,
  y, clipPath, borderRadius, opacity,
  pointerEvents: open.value ? 'auto' : 'none',
  marginTop: isTop.value ? 0 : `${GAP}px`,
  marginBottom: isTop.value ? `${GAP}px` : 0,
}) as never)

function onTriggerKey(event: KeyboardEvent) {
  if (!open.value && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) { event.preventDefault(); setOpen(true) }
}
function onPanelKey(event: KeyboardEvent) {
  if (event.key === 'Tab') close()
  else onKeyDown(event)
}
</script>

<template>
  <div ref="root" class="be-select" :data-open="open || undefined">
    <input v-if="name && current !== undefined" type="hidden" :name="name" :value="current" :disabled="disabled">
    <motion.button
      :id="triggerId" ref="trigger" type="button" class="be-select-trigger" :disabled="disabled"
      aria-haspopup="listbox" :aria-expanded="open" :aria-controls="listId" :style="triggerStyle"
      @click="setOpen(!open)" @keydown="onTriggerKey"
    >
      <span class="be-select-value" :data-placeholder="selectedOption ? undefined : ''">
        <slot name="value" :option="selectedOption">{{ selectedOption?.label ?? placeholder ?? strings.valuePlaceholder }}</slot>
      </span>
      <motion.span aria-hidden="true" class="be-select-chevron" :style="{ rotate }">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </motion.span>
    </motion.button>
    <motion.div
      :id="listId" ref="panel" role="listbox" class="be-select-panel" :class="{ 'is-top': isTop }"
      :aria-label="label" :aria-labelledby="label ? undefined : triggerId" :aria-hidden="!open"
      :inert="(open ? undefined : '') as never" :style="panelStyle" @keydown="onPanelKey"
    >
      <div class="be-select-list" :data-open="open" :data-reduce="reduce || undefined">
        <template v-for="(option, index) in options" :key="option.value">
          <div v-if="option.group && option.group !== options[index - 1]?.group" class="be-select-group" aria-hidden="true">{{ option.group }}</div>
          <div class="be-select-row">
            <button
              type="button" role="option" class="be-select-item" :aria-selected="option.value === current"
              :disabled="option.disabled" :tabindex="activeId === option.value ? 0 : -1" :data-listbox-id="option.value"
              :data-selected="option.value === current || undefined" @click="select(option.value)"
            >
              <slot name="option" :option="option" :selected="option.value === current">
                <span v-if="option.color" class="be-select-dot" :style="{ background: option.color }" />
                <span>{{ option.label }}</span>
              </slot>
              <svg v-if="option.value === current" class="be-select-check" aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </button>
          </div>
        </template>
      </div>
    </motion.div>
  </div>
</template>

<style scoped>
.be-select { position: relative; box-sizing: border-box; font-size: .875rem; line-height: 1.25rem; }
.be-select-trigger { position: relative; z-index: 10; box-sizing: border-box; display: flex; width: 100%; align-items: center; justify-content: space-between; gap: .5rem; margin: 0; padding: .5rem .75rem; border: 1px solid var(--beui-border); background: var(--beui-background); color: var(--beui-foreground); font: inherit; font-size: .875rem; line-height: 1.25rem; text-align: left; outline: none; cursor: pointer; transition: color .15s cubic-bezier(.4, 0, .2, 1), background-color .15s cubic-bezier(.4, 0, .2, 1), border-color .15s cubic-bezier(.4, 0, .2, 1); }
.be-select-trigger:hover { border-color: var(--beui-border-strong, color-mix(in srgb, var(--beui-foreground) 12%, transparent)); }
.be-select-trigger:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 20%, transparent); }
.be-select-trigger:disabled { pointer-events: none; opacity: .5; }
.be-select-value[data-placeholder] { color: var(--beui-muted-foreground); }
.be-select-chevron { display: inline-flex; color: var(--beui-muted-foreground); }
.be-select-panel { position: absolute; left: 0; right: 0; top: 100%; z-index: 20; box-sizing: border-box; overflow: hidden; border: 1px solid var(--beui-border); background: var(--beui-background); box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1); }
.be-select-panel.is-top { top: auto; bottom: 100%; }
.be-select-list { box-sizing: border-box; padding: .25rem; }
.be-select-row { opacity: 0; transform: translateY(-4px); transition: opacity .08s cubic-bezier(.16, 1, .3, 1), transform .08s cubic-bezier(.16, 1, .3, 1); }
.be-select-list[data-open=true] .be-select-row { opacity: 1; transform: none; transition-duration: .12s; }
.be-select-list[data-reduce] .be-select-row { opacity: 1; transform: none; }
.be-select-item { box-sizing: border-box; display: flex; width: 100%; align-items: center; justify-content: space-between; gap: .5rem; margin: 0; padding: .375rem .625rem; border: 0; border-radius: .5rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: .875rem; line-height: 1.25rem; text-align: left; outline: none; cursor: pointer; transition: color .15s cubic-bezier(.4, 0, .2, 1), background-color .15s cubic-bezier(.4, 0, .2, 1); }
.be-select-item:hover, .be-select-item:focus-visible { background: var(--beui-muted); color: var(--beui-foreground); }
.be-select-item[data-selected] { background: var(--beui-muted); color: var(--beui-foreground); }
.be-select-item:disabled { pointer-events: none; opacity: .5; }
.be-select-item > span { display: inline-flex; align-items: center; gap: .5rem; }
.be-select-check { flex: none; }
.be-select-dot { width: .65rem; height: .65rem; border-radius: 50%; }
.be-select-group { padding: .375rem .625rem .125rem; color: var(--beui-muted-foreground); font-size: .75rem; }
</style>
