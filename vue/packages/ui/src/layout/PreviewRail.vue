<script lang="ts">
export type PreviewRailItem = {
  id: string
  label: string
  ariaLabel?: string
  description?: string
  href?: string
  target?: '_blank' | '_self' | '_parent' | '_top'
  rel?: string
}
export type PreviewRailMessages = { label: string }
export const previewRailMessages: PreviewRailMessages = { label: 'Section navigation' }
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { easeOut, layoutSpring } from '../core/motion'

const props = withDefaults(defineProps<{
  items: readonly PreviewRailItem[]
  /** Accessible name of the navigation landmark. */
  label?: string
  orientation?: 'vertical' | 'horizontal'
  /** Controlled active tick. `v-model` (`modelValue`) is the alias. */
  activeId?: string
  defaultActiveId?: string
  showPreview?: boolean
  previewSide?: 'before' | 'after'
  highlightActive?: boolean
  /** Height (or width, when horizontal) of one tick row in px. */
  itemSize?: number
  className?: string
  railClassName?: string
  previewContainerClassName?: string
  previewClassName?: string
  labels?: Partial<PreviewRailMessages>
}>(), { orientation: 'vertical', showPreview: true, previewSide: 'after', highlightActive: false, itemSize: 24 })

/** Stable identity of the chosen tick; `activeId` is the prop alias. */
const active = defineModel<string>()
const emit = defineEmits<{ select: [item: PreviewRailItem]; activeChange: [id: string] }>()

defineSlots<{
  /** Content beside the rail. */
  default?(): unknown
  /** Card shown for the highlighted tick. */
  preview?(props: { item: PreviewRailItem }): unknown
}>()

const text = computed(() => ({ ...previewRailMessages, ...props.labels }))
const uid = useId()
const reduce = useReducedMotion()

// `motion.div` exposes its DOM node on `$el`; the plain fallback covers a ref
// that resolves to the element itself.
const root = useTemplateRef<{ $el?: HTMLElement }>('root')
const rootElement = () => (root.value?.$el ?? (root.value as unknown as HTMLElement | null) ?? null)

const hoveredId = shallowRef<string | null>(null)
// A finger cannot hover, so a tap lights the tick instead. Kept apart from the
// hovered one: they end in different ways, and a stray mouse move must not clear
// a tick the keyboard or a tap chose.
const pinnedId = shallowRef<string | null>(null)
const focusedId = shallowRef<string | null>(null)

// A click carries no pointerType, so the pointerdown before it is what says
// whether the activation was a tap. Keyboard activation has none at all.
type TapRecord = { pointerType: string; state: boolean }
let tapRecord: TapRecord | null = null
const tapStart = (event: PointerEvent, state: boolean) => { tapRecord = { pointerType: event.pointerType, state } }
const tapTake = () => { const spent = tapRecord; tapRecord = null; return spent }
const tapDrop = () => { tapRecord = null }

// Enter and leave are paired per pointer: a pen that arrives in contact taps
// rather than hovers, and a mouse that pressed and dragged off still leaves.
const hoverContact = new Set<number>()
function hoverEnter(event: PointerEvent) {
  const hovering = event.pointerType !== 'touch' && event.buttons === 0
  if (hovering) hoverContact.delete(event.pointerId)
  else hoverContact.add(event.pointerId)
  return hovering
}
function hoverLeave(event: PointerEvent) {
  const arrivedInContact = hoverContact.delete(event.pointerId)
  return !arrivedInContact && event.pointerType !== 'touch'
}

const internalActiveId = shallowRef(props.defaultActiveId ?? props.items[0]?.id ?? '')
const requestedActiveId = computed(() => (props.activeId !== undefined ? props.activeId : active.value !== undefined ? active.value : internalActiveId.value))
const selectedId = computed(() => (props.items.some(item => item.id === requestedActiveId.value)
  ? requestedActiveId.value
  : (props.items[0]?.id ?? '')))
const displayedId = computed(() => hoveredId.value ?? pinnedId.value ?? focusedId.value ?? '')
const highlightedId = computed(() => displayedId.value || (props.highlightActive ? selectedId.value : ''))
const displayedIndex = computed(() => props.items.findIndex(item => item.id === highlightedId.value))
const rowTemplate = computed(() => (props.items.length ? `repeat(${props.items.length}, ${props.itemSize}px)` : undefined))
const isHorizontal = computed(() => props.orientation === 'horizontal')
const shownItem = computed(() => props.items.find(item => item.id === displayedId.value) ?? null)

function selectItem(id: string) {
  if (props.activeId === undefined && active.value === undefined) internalActiveId.value = id
  if (props.activeId === undefined) active.value = id
  emit('activeChange', id)
  const item = props.items.find(entry => entry.id === id)
  if (item) emit('select', item)
}

// The next tap outside the rail stands in for the pointer leaving it. The card
// is a preview, so the tap passes through to whatever it landed on.
function outside(event: PointerEvent) {
  if (event.target instanceof Node && rootElement()?.contains(event.target)) return
  pinnedId.value = null
}
function escape(event: KeyboardEvent) {
  if (event.key === 'Escape') pinnedId.value = null
}
watch(pinnedId, pinned => {
  if (typeof window === 'undefined') return
  window.removeEventListener('pointerdown', outside, true)
  window.removeEventListener('keydown', escape)
  if (pinned === null) return
  window.addEventListener('pointerdown', outside, true)
  window.addEventListener('keydown', escape)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', outside, true)
  window.removeEventListener('keydown', escape)
})

function onRootBlur(event: FocusEvent) {
  // Both tick sources leave with the focus: a tap does not always land focus,
  // but when it does, tabbing away must not strand the card.
  const next = event.relatedTarget
  if (next instanceof Node && rootElement()?.contains(next)) return
  focusedId.value = null
  pinnedId.value = null
}

function onNavLeave(event: PointerEvent) {
  // A touch pointer leaves on lift, which would clear the tick the tap just
  // chose — that one is cleared by the outside tap instead.
  if (hoverLeave(event)) hoveredId.value = null
}

function onItemEnter(item: PreviewRailItem, event: PointerEvent) {
  if (hoverEnter(event)) hoveredId.value = item.id
}

function onItemDown(item: PreviewRailItem, event: PointerEvent) {
  tapStart(event, pinnedId.value === item.id)
  focusedId.value = null
}

function onItemFocus(item: PreviewRailItem, event: FocusEvent) {
  const element = event.currentTarget as HTMLElement | null
  if (element?.matches(':focus-visible')) focusedId.value = item.id
}

function onItemSelect(item: PreviewRailItem, event: MouseEvent) {
  const gesture = tapTake()
  const tapped = gesture !== null && gesture.pointerType !== 'mouse'

  if (tapped) {
    // A link would otherwise show its preview and leave the page in the same
    // tap, so the card is never read: the first tap lights the tick, the second
    // follows the link.
    if (item.href && !gesture.state) {
      event.preventDefault()
      pinnedId.value = item.id
      return
    }
    pinnedId.value = item.id
  }

  selectItem(item.id)
}

function scaleFor(index: number) {
  if (props.items[index]?.id === highlightedId.value) return 1
  const distance = displayedIndex.value < 0 ? Number.POSITIVE_INFINITY : Math.abs(index - displayedIndex.value)
  return distance === 1 ? 0.68 : distance === 2 ? 0.44 : 0.25
}

const railTransition = computed(() => (reduce.value ? { duration: 0 } : layoutSpring))
const cardTransition = computed(() => (reduce.value ? { duration: 0 } : layoutSpring))
const contentInitial = computed(() => (reduce.value ? { opacity: 0 } : { opacity: 0, y: 4, filter: 'blur(6px)' }))
const contentAnimate = computed(() => (reduce.value ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }))
const contentExit = computed(() => (reduce.value
  ? { opacity: 0 }
  : { opacity: 0, y: -2, filter: 'blur(4px)', transition: { duration: 0.12, ease: easeOut } }))
const contentTransition = computed(() => ({ duration: reduce.value ? 0 : 0.18, ease: easeOut }))
</script>

<template>
  <motion.div ref="root" layout-root class="preview-rail" :class="[className, { 'is-horizontal': isHorizontal }]" @focusout="onRootBlur">
    <nav
      :aria-label="label ?? text.label"
      class="rail-nav"
      :class="railClassName"
      :style="isHorizontal ? { gridTemplateColumns: rowTemplate } : { gridTemplateRows: rowTemplate }"
      @pointerleave="onNavLeave">
      <component
        :is="item.href ? 'a' : 'button'"
        v-for="(item, index) in items"
        :key="item.id"
        :href="item.href"
        :target="item.target"
        :rel="item.rel ?? (item.target === '_blank' ? 'noreferrer noopener' : undefined)"
        :type="item.href ? undefined : 'button'"
        :aria-label="item.ariaLabel ?? item.label"
        :aria-current="item.id === selectedId ? (item.href ? 'page' : 'location') : undefined"
        :style="isHorizontal ? { width: `${itemSize}px` } : { height: `${itemSize}px` }"
        class="rail-item"
        @pointerenter="onItemEnter(item, $event)"
        @pointerdown="onItemDown(item, $event)"
        @pointercancel="tapDrop"
        @keydown="tapDrop"
        @focus="onItemFocus(item, $event)"
        @click="onItemSelect(item, $event)">
        <motion.span
          class="rail-tick"
          :class="{ 'is-highlighted': item.id === highlightedId }"
          :animate="isHorizontal ? { scaleY: scaleFor(index) } : { scaleX: scaleFor(index) }"
          :transition="railTransition" />
      </component>
    </nav>

    <div v-if="showPreview" aria-hidden="true" class="preview-layer"
      :class="[previewContainerClassName, { 'is-before': previewSide === 'before' }]"
      :style="isHorizontal ? { gridTemplateColumns: rowTemplate } : { gridTemplateRows: rowTemplate }">
      <div v-for="item in items" :key="item.id" class="preview-slot" :style="isHorizontal ? { width: `${itemSize}px` } : { height: `${itemSize}px` }">
        <div v-if="item.id === displayedId" class="preview-anchor" :class="previewClassName">
          <motion.div :layout-id="`preview-rail-card-${uid}`" :transition="cardTransition">
            <AnimatePresence mode="wait" :initial="false">
              <motion.div :key="item.id" :initial="contentInitial" :animate="contentAnimate" :exit="contentExit" :transition="contentTransition">
                <slot name="preview" :item="item">
                  <div class="preview-card">
                    <p class="preview-title">{{ item.label }}</p>
                    <div v-if="item.description" class="preview-description">{{ item.description }}</div>
                  </div>
                </slot>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>

    <div v-if="$slots.default" class="preview-content"><slot /></div>
  </motion.div>
</template>

<style scoped>
.preview-rail {
  position: relative;
  isolation: isolate;
  display: flex;
  width: 100%;
  min-height: 20rem;
  overflow: visible;
}
.preview-rail.is-horizontal {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 16rem;
}

.rail-nav { position: relative; z-index: 10; display: grid; flex: none; width: 3rem; align-content: center; }
.is-horizontal .rail-nav { height: 3rem; width: fit-content; max-width: 100%; align-self: center; justify-content: center; }

.rail-item {
  position: relative;
  display: flex;
  align-items: center;
  width: 3rem;
  height: 1.5rem;
  color: var(--beui-muted-foreground);
  outline: none;
  text-decoration: none;
  cursor: pointer;
}
.is-horizontal .rail-item { align-items: flex-end; justify-content: center; width: 1.5rem; height: 3rem; }
.rail-item:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }

.rail-tick {
  display: block;
  width: 3rem;
  height: 2px;
  background: currentColor;
  transform-origin: left;
}
.is-horizontal .rail-tick { width: 2px; height: 3rem; transform-origin: bottom; }
.rail-tick.is-highlighted { color: var(--beui-foreground); }
.is-horizontal .rail-tick.is-highlighted { color: var(--beui-foreground); }

.preview-layer {
  pointer-events: none;
  position: absolute;
  inset-block: 0;
  left: 4rem;
  right: 1rem;
  z-index: 50;
  display: grid;
  align-content: center;
}
.preview-layer.is-before { left: 1rem; right: 4rem; }
.is-horizontal .preview-layer,
.is-horizontal .preview-layer.is-before {
  top: 50%;
  left: 50%;
  right: auto;
  bottom: auto;
  height: 1.25rem;
  width: fit-content;
  max-width: 100%;
  justify-content: center;
  translate: -50% -50%;
}

.preview-slot { position: relative; display: flex; align-items: center; }
.is-horizontal .preview-slot { justify-content: center; }
.preview-anchor { width: 100%; max-width: 24rem; }
.preview-layer.is-before .preview-anchor { margin-inline-start: auto; }
.is-horizontal .preview-anchor {
  position: absolute;
  bottom: 3rem;
  left: 50%;
  width: 18rem;
  max-width: none;
  translate: -50% 0;
}

.preview-card {
  padding: 1rem;
  border: 1px solid var(--beui-border);
  border-radius: 1rem;
  background: var(--beui-card);
  box-shadow: 0 1px 2px rgb(0 0 0 / .06);
}
.preview-title { margin: 0; font-weight: 500; color: var(--beui-foreground); }
.preview-description { margin-top: .25rem; font-size: .875rem; line-height: 1.5rem; color: var(--beui-muted-foreground); }

.preview-content { min-width: 0; min-height: 0; flex: 1; }
</style>
