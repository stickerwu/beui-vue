<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { easeOut } from '../core/motion'
import { useValue } from '../agents/shared'
import { expandableTabsMessages } from './messages'

export type FoldingTab = { id: string; label: string; icon?: string; content?: string; disabled?: boolean }

const props = withDefaults(defineProps<{
  items: readonly FoldingTab[]
  modelValue?: string | null
  value?: string | null
  defaultValue?: string | null
  /** Kept from the original port; the measured shell morphs in every mode, so it changes nothing today. */
  morph?: boolean
  ariaLabel?: string
  /** Shows a close affordance on the open tab, also bound to Delete on it. */
  onClose?: (id: string) => void
  labels?: Partial<typeof expandableTabsMessages>
}>(), { defaultValue: null })

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  valueChange: [value: string | null]
  /** Kept from the original port. The bar is not reorderable, so it never fires. */
  orderChange: [ids: string[]]
}>()

defineSlots<{
  panel?(props: { item: FoldingTab; index: number }): unknown
  icon?(props: { item: FoldingTab; index: number }): unknown
}>()

type Size = { width: number; height: number }

// DynamicIsland-style real width/height motion, tuned tighter here so the tab
// bar feels controlled instead of elastic.
const SHELL_SPRING = { type: 'spring', duration: 0.58, bounce: 0.06 } as const
// Position-only tab layout motion keeps switching loose without stretching
// icons or letting the label linger.
const TAB_CHANGE_SPRING = { type: 'spring', duration: 0.46, bounce: 0.04 } as const
const LABEL_OPEN = { type: 'spring', duration: 0.38, bounce: 0.03 } as const
const LABEL_CLOSE = { duration: 0.16, ease: easeOut } as const
// Content is clipped above the dock so rows never pass through the icon bar.
// It enters from slightly above instead of from the dock line.
const CONTENT_SPRING = { type: 'spring', duration: 0.46, bounce: 0.08 } as const

// Fixed bar height keeps the content panel's bottom reserve static so the open
// height is right on the first frame. p-2 (16) + h-9 button (36).
const BAR_H = 52
const TAB_W = 32
const BAR_X = 16
const BAR_GAP = 4
const ROOT_BORDER = 2
const ICON_W = 16
const ACTIVE_LEFT_PAD = 10
const ACTIVE_RIGHT_PAD = 16
const LABEL_GAP = 7
const PANEL_DOCK_GAP = 4

const reduce = useReducedMotion()
const root = useTemplateRef<HTMLElement>('root')
const sizer = useTemplateRef<HTMLElement>('sizer')

const model = useValue<string | null>(
  () => (props.modelValue !== undefined ? props.modelValue : props.value),
  props.defaultValue,
  next => { emit('update:modelValue', next); emit('valueChange', next) },
)

const activeId = computed(() => model.value.value)
const activeIndex = computed(() => props.items.findIndex(item => item.id === activeId.value))
const active = computed(() => (activeIndex.value < 0 ? null : props.items[activeIndex.value] ?? null))
const firstEnabledId = computed(() => props.items.find(item => !item.disabled)?.id ?? null)
const tabStopId = computed(() => activeId.value ?? firstEnabledId.value)

const size = shallowRef<Size | null>(null)
const labelWidths = shallowRef<Record<string, number>>({})
const labelNodes: Record<string, HTMLElement | null> = {}

// Outside click / Escape closes it: an open panel behaves like an open menu.
function outside(event: Event) {
  if (event.target instanceof Node && root.value?.contains(event.target)) return
  model.set(null)
}
function escape(event: KeyboardEvent) { if (event.key === 'Escape') model.set(null) }
watch(activeId, id => {
  if (typeof document === 'undefined') return
  document.removeEventListener('pointerdown', outside)
  document.removeEventListener('keydown', escape)
  if (!id) return
  document.addEventListener('pointerdown', outside)
  document.addEventListener('keydown', escape)
})

// Closed: one row of icon slots. Open: the measured content plus that row.
const closedSize = computed<Size>(() => ({
  width: props.items.length * TAB_W + Math.max(0, props.items.length - 1) * BAR_GAP + BAR_X + ROOT_BORDER,
  height: BAR_H + ROOT_BORDER,
}))
const openSize = computed<Size>(() => (size.value
  ? {
      width: Math.max(size.value.width + ROOT_BORDER, closedSize.value.width),
      height: Math.max(size.value.height + ROOT_BORDER, closedSize.value.height),
    }
  : closedSize.value))
const shellTarget = computed(() => (active.value ? openSize.value : closedSize.value))

function activeTabWidth(item: FoldingTab) {
  return Math.max(TAB_W, ACTIVE_LEFT_PAD + ICON_W + LABEL_GAP + (labelWidths.value[item.id] ?? 0) + ACTIVE_RIGHT_PAD)
}

const contentVariants = computed(() => (reduce.value
  ? {
      enter: { opacity: 0, filter: 'blur(0px)' },
      center: { opacity: 1, filter: 'blur(0px)' },
      exit: { opacity: 0, filter: 'blur(0px)', transition: { duration: 0.08, ease: easeOut } },
    }
  : {
      enter: { y: -8, scale: 0.98, opacity: 0, filter: 'blur(4px)' },
      center: { y: 0, scale: 1, opacity: 1, filter: 'blur(0px)' },
      exit: { y: -6, scale: 0.98, opacity: 0, filter: 'blur(4px)', transition: { duration: 0.08, ease: easeOut } },
    }))

const label = computed(() => props.ariaLabel ?? props.labels?.label ?? expandableTabsMessages.label)
const closeLabel = (name: string) => `Close ${name}`

/* ---- measurement --------------------------------------------------------- */

let sizeObserver: ResizeObserver | undefined
let labelObserver: ResizeObserver | undefined

function measureSize() {
  const element = sizer.value
  if (!element) return
  const next = { width: element.offsetWidth, height: element.offsetHeight }
  if (size.value?.width === next.width && size.value?.height === next.height) return
  size.value = next
}
function measureLabels() {
  const next: Record<string, number> = {}
  for (const item of props.items) {
    const node = labelNodes[item.id]
    if (node) next[item.id] = Math.ceil(node.offsetWidth)
  }
  labelWidths.value = next
}
function setLabelNode(id: string, element: unknown) {
  const node = (element as HTMLElement | null) ?? null
  labelNodes[id] = node
  if (node && labelObserver) labelObserver.observe(node)
}

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') {
    sizeObserver = new ResizeObserver(measureSize)
    labelObserver = new ResizeObserver(measureLabels)
    for (const node of Object.values(labelNodes)) if (node) labelObserver.observe(node)
    if (sizer.value) sizeObserver.observe(sizer.value)
  }
  measureSize()
  measureLabels()
})
onBeforeUnmount(() => {
  sizeObserver?.disconnect()
  labelObserver?.disconnect()
  document.removeEventListener('pointerdown', outside)
  document.removeEventListener('keydown', escape)
})

/* ---- interaction --------------------------------------------------------- */

function tabElement(id: string) {
  return Array.from(root.value?.querySelectorAll<HTMLElement>('[role="tab"]') ?? []).find(tab => tab.dataset.tabId === id)
}

function select(id: string) {
  model.set(activeId.value === id ? null : id)
}

// Roving tab stop: arrows walk the bar, Home/End jump to its ends, Delete
// dismisses the focused tab when the host allows it, Escape closes the panel.
async function keydown(event: KeyboardEvent, item: FoldingTab) {
  const enabled = props.items.filter(entry => !entry.disabled)
  const index = enabled.findIndex(entry => entry.id === item.id)
  if (index < 0) return
  const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 1, ArrowUp: -1 }
  let next: FoldingTab | undefined
  if (event.key in step) next = enabled[(index + step[event.key]! + enabled.length) % enabled.length]
  else if (event.key === 'Home') next = enabled[0]
  else if (event.key === 'End') next = enabled[enabled.length - 1]
  else if (event.key === 'Escape') { event.preventDefault(); model.set(null); return }
  else if (event.key === 'Delete' && props.onClose) { event.preventDefault(); props.onClose(item.id); return }
  if (!next) return
  event.preventDefault()
  if (activeId.value !== null) model.set(next.id)
  await nextTick()
  tabElement(next.id)?.focus({ preventScroll: true })
}
</script>

<template>
  <div ref="root" class="be-fold">
    <motion.div class="fold-shell" :initial="false" :animate="shellTarget" :transition="reduce ? { duration: 0 } : SHELL_SPRING" :style="{ transformOrigin: 'bottom center' }">
      <div ref="sizer" aria-hidden="true" class="fold-sizer" :style="{ paddingBottom: `${BAR_H + PANEL_DOCK_GAP}px` }">
        <div v-for="(item, index) in items" :key="item.id" class="fold-sizer-cell">
          <slot name="panel" :item="item" :index="index">{{ item.content }}</slot>
        </div>
      </div>

      <div class="fold-panel" :style="{ bottom: `${BAR_H + PANEL_DOCK_GAP}px` }">
        <AnimatePresence mode="popLayout" :initial="false">
          <motion.div v-if="active" :key="active.id" :variants="contentVariants" initial="enter" animate="center" exit="exit"
            :transition="reduce ? { duration: 0.15, ease: easeOut } : CONTENT_SPRING" class="fold-panel-content">
            <slot name="panel" :item="active" :index="activeIndex">{{ active.content }}</slot>
          </motion.div>
        </AnimatePresence>
      </div>

      <div role="tablist" aria-orientation="horizontal" :aria-label="label" class="fold-bar" :style="{ height: `${BAR_H}px` }">
        <div v-for="(item, index) in items" :key="item.id" class="fold-slot">
          <motion.button :data-tab-id="item.id" type="button" role="tab" :aria-selected="activeId === item.id" :aria-label="item.label"
            :aria-controls="`${item.id}-panel`" :disabled="item.disabled" :tabindex="tabStopId === item.id ? 0 : -1"
            :layout="reduce ? false : 'position'" :animate="{ width: activeId === item.id && active ? activeTabWidth(item) : TAB_W }"
            :transition="reduce ? { duration: 0 } : TAB_CHANGE_SPRING" class="fold-tab" :class="{ 'is-active': activeId === item.id }"
            @click="select(item.id)" @keydown="keydown($event, item)">
            <span v-if="activeId === item.id" class="fold-pill" />
            <span class="fold-icon"><slot name="icon" :item="item" :index="index">{{ item.icon ?? item.label.slice(0, 1) }}</slot></span>
            <motion.span aria-hidden="true" :initial="false"
              :animate="{ width: activeId === item.id ? (labelWidths[item.id] ?? 0) : 0, opacity: activeId === item.id ? 1 : 0, marginLeft: activeId === item.id ? LABEL_GAP : 0, filter: reduce || activeId === item.id ? 'blur(0px)' : 'blur(3px)' }"
              :transition="reduce ? { duration: 0 } : activeId === item.id ? LABEL_OPEN : LABEL_CLOSE" class="fold-label">{{ item.label }}</motion.span>
          </motion.button>
          <button v-if="onClose && activeId === item.id" type="button" class="fold-close" :aria-label="closeLabel(item.label)" @click="onClose?.(item.id)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </div>
      </div>
    </motion.div>

    <div aria-hidden="true" class="fold-measure">
      <span v-for="item in items" :key="item.id" :ref="element => setLabelNode(item.id, element)" class="fold-measure-label">{{ item.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.be-fold { position: relative; display: inline-block; max-width: 100%; }
.fold-shell { position: relative; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 26px; background: var(--beui-card); color: var(--beui-foreground); }
.fold-sizer { pointer-events: none; visibility: hidden; position: absolute; left: 0; top: 0; display: grid; width: max-content; padding-inline: .5rem; padding-top: .5rem; }
.fold-sizer-cell { grid-column-start: 1; grid-row-start: 1; width: max-content; }
.fold-panel { position: absolute; left: 0; right: 0; top: 0; z-index: 10; overflow: hidden; padding-inline: .5rem; padding-top: .5rem; }
.fold-panel-content { width: max-content; transform-origin: top center; will-change: transform, opacity, filter; }
.fold-bar { position: absolute; left: 0; right: 0; bottom: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: .25rem; width: 100%; padding: .5rem; }
.fold-slot { position: relative; display: flex; flex: none; align-items: center; }
.fold-tab { position: relative; isolation: isolate; display: flex; align-items: center; justify-content: center; height: 2.25rem; min-width: 2rem; flex: none; overflow: hidden; padding-inline: .5rem; border: 0; border-radius: 18px; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: .875rem; font-weight: 500; outline: none; cursor: pointer; }
.fold-tab:hover:not(.is-active) { color: var(--beui-foreground); }
.fold-tab:disabled { cursor: not-allowed; opacity: .5; }
.fold-tab.is-active { min-width: 0; justify-content: flex-start; padding-left: .625rem; padding-right: 1rem; color: var(--beui-foreground); }
.fold-tab:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
.fold-pill { position: absolute; inset: 0; z-index: -1; border-radius: 18px; background: color-mix(in srgb, var(--beui-foreground) 10%, transparent); }
.fold-icon { display: grid; place-items: center; flex: none; }
.fold-label { display: inline-block; overflow: hidden; white-space: nowrap; }
.fold-close { position: absolute; right: .25rem; top: 50%; display: grid; place-items: center; width: 1.1rem; height: 1.1rem; translate: 0 -50%; padding: 0; border: 0; border-radius: 50%; background: color-mix(in srgb, var(--beui-foreground) 12%, transparent); color: var(--beui-muted-foreground); cursor: pointer; }
.fold-close svg { width: .7rem; height: .7rem; }
.fold-close:hover { color: var(--beui-foreground); }
.fold-close:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 1px; }
.fold-measure { pointer-events: none; position: fixed; left: 0; top: 0; z-index: -10; display: flex; opacity: 0; }
.fold-measure-label { white-space: nowrap; font-size: .875rem; font-weight: 500; line-height: 1; }
</style>
