<script lang="ts">
export type NotificationStackItem = {
  id: string
  title: any
  description?: any
  trailing?: any
}

export type NotificationStackClassNames = {
  stack?: string
  card?: string
  content?: string
  title?: string
  description?: string
  trailing?: string
  footer?: string
  count?: string
}
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, shallowRef, watchEffect, type FunctionalComponent, type VNodeChild } from 'vue'
import { easeOut, layoutSpring, swapSpring } from '../core/motion'
import { formatMessage, notificationStackMessages } from './messages'

const props = withDefaults(defineProps<{
  items: readonly NotificationStackItem[]
  expanded?: boolean
  defaultExpanded?: boolean
  onViewAll?: () => void
  maxVisible?: number
  collapsedLabel?: string
  expandedLabel?: string
  emptyLabel?: string
  className?: string
  classNames?: NotificationStackClassNames
  /** Override any built-in string. */
  labels?: Partial<typeof notificationStackMessages>
}>(), {
  // `undefined`, not `false`: an absent boolean prop is cast to `false` by
  // Vue, which would read as a controlled stack that is always collapsed.
  expanded: undefined,
  defaultExpanded: false,
  maxVisible: 3,
})

const emit = defineEmits<{
  'update:expanded': [value: boolean]
  expandedChange: [value: boolean]
}>()

const reduce = useReducedMotion()

const Content: FunctionalComponent<{ value: VNodeChild }> = ({ value }) => value
Content.props = ['value']

const collapsedLabel = computed(() => props.collapsedLabel ?? props.labels?.collapsedLabel ?? notificationStackMessages.collapsedLabel)
const expandedLabel = computed(() => props.expandedLabel ?? props.labels?.expandedLabel ?? notificationStackMessages.expandedLabel)
const emptyLabel = computed(() => props.emptyLabel ?? props.labels?.emptyLabel ?? notificationStackMessages.emptyLabel)

const localExpanded = shallowRef(props.defaultExpanded)
const isExpanded = computed(() => (props.expanded !== undefined ? props.expanded : localExpanded.value))
function setIsExpanded(next: boolean) {
  if (props.expanded === undefined) localExpanded.value = next
  emit('update:expanded', next)
  emit('expandedChange', next)
}

const hasFocus = shallowRef(false)

// Enter and leave are paired per pointer: a pen that arrives in contact taps
// rather than hovers, and a mouse that pressed and dragged off still leaves.
// A tap reports as a hover on its way past — enter, leave, then click — so an
// unfiltered hover path would expand, collapse and expand again in the space
// of one tap. The tap has its own route through `onClick`.
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

// What the last gesture on the stack was, and whether it was already expanded
// when that gesture started. A click reports neither.
type TapRecord = { pointerType: string; state: boolean }
let tapRecord: TapRecord | null = null
const tapStart = (event: PointerEvent, state: boolean) => { tapRecord = { pointerType: event.pointerType, state } }
const tapTake = () => { const spent = tapRecord; tapRecord = null; return spent }
const tapDrop = () => { tapRecord = null }

// Set by the tap that expands the stack, and the reason the outside-tap
// dismisser exists at all — a hovering pointer has its own way out.
const tapExpanded = shallowRef(false)

function collapse() {
  tapExpanded.value = false
  setIsExpanded(false)
}

function open() {
  setIsExpanded(true)
}

function onPointerEnter(event: PointerEvent) {
  if (hoverEnter(event)) open()
}
function onPointerLeave(event: PointerEvent) {
  if (hoverLeave(event) && !hasFocus.value) collapse()
}
function onPointerDown(event: PointerEvent) {
  tapStart(event, isExpanded.value)
}
function onFocus() {
  hasFocus.value = true
  open()
}
function onBlur(event: FocusEvent) {
  const next = event.relatedTarget
  if (next instanceof Node && (event.currentTarget as HTMLElement | null)?.contains(next)) return
  hasFocus.value = false
  collapse()
}
function onKeyDown(event: KeyboardEvent) {
  // A key press is the start of a keyboard activation, never part of a tap:
  // whatever a taken-away gesture left behind must not be read as one.
  tapDrop()
  if (event.key !== 'Escape') return
  event.preventDefault()
  collapse()
  // Focus stays where the keyboard put it. Blurring here would collapse the
  // stack *and* throw the user back to the top of the document.
}
function onClick() {
  const gesture = tapTake()
  // Read from where the gesture started, not from now: a browser that focuses
  // the stack on contact expands it mid-tap, and the first tap would then
  // follow `onViewAll` instead of opening the list it was meant to.
  const wasExpanded = gesture ? gesture.state : isExpanded.value

  if (!wasExpanded) {
    open()
    if (gesture && gesture.pointerType !== 'mouse') tapExpanded.value = true
    return
  }
  if (props.onViewAll) {
    props.onViewAll()
    return
  }
  collapse()
}

/* ---- dismissal for a stack a tap expanded -------------------------------- */

// A pointer leaving the stack is what collapses it, and a finger never leaves:
// without this the stack stays open for good once tapped, and when `onViewAll`
// is set the next tap follows the link instead of closing. The tap that lands
// somewhere else stands in for the pointer leaving, and it is consumed rather
// than passed through — the expanded stack covers the page, so the tap that
// dismisses it is aimed at nothing else.
const dismissOpen = computed(() => tapExpanded.value && isExpanded.value)
let dismissRoot: HTMLElement | null = null

function consumeActivation(source: Event) {
  const swallow = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    release()
  }
  const restart = (event: Event) => { if (event !== source) release() }
  const release = () => {
    window.removeEventListener('click', swallow, true)
    window.removeEventListener('pointerdown', restart, true)
    window.removeEventListener('pointercancel', restart, true)
    window.removeEventListener('keydown', release, true)
  }
  window.addEventListener('click', swallow, true)
  window.addEventListener('pointerdown', restart, true)
  window.addEventListener('pointercancel', restart, true)
  window.addEventListener('keydown', release, true)
}

function outsideDismiss(event: PointerEvent) {
  if (event.target instanceof Node && dismissRoot?.contains(event.target)) return
  consumeActivation(event)
  collapse()
}
function escapeDismiss(event: KeyboardEvent) {
  if (event.key === 'Escape') collapse()
}
function bindRoot(element: unknown) {
  const node = element as (HTMLElement & { $el?: HTMLElement }) | null
  dismissRoot = node?.$el ?? node ?? null
  applyDismiss()
}
function applyDismiss() {
  if (typeof window === 'undefined') return
  window.removeEventListener('pointerdown', outsideDismiss, true)
  window.removeEventListener('keydown', escapeDismiss)
  if (!dismissOpen.value) return
  window.addEventListener('pointerdown', outsideDismiss, true)
  window.addEventListener('keydown', escapeDismiss)
}
watchEffect(applyDismiss)
onBeforeUnmount(() => {
  // `dispose` here means only the listeners: the stack keeps its state.
  dismissRoot = null
  window.removeEventListener('pointerdown', outsideDismiss, true)
  window.removeEventListener('keydown', escapeDismiss)
  tapDrop()
})

/* ---- geometry and motion ------------------------------------------------ */

const STACK_PEEK = 8
const STACK_INSET = 12

const visibleItems = computed(() => props.items.slice(0, Math.max(1, props.maxVisible)))
const primaryItem = computed(() => visibleItems.value[0])

const transition = computed(() => (reduce.value ? { duration: 0 } : layoutSpring))
const cardTransition = computed(() => (reduce.value ? { duration: 0 } : { duration: 0.32, ease: easeOut }))
const backgroundTransition = computed(() => (reduce.value ? { duration: 0 } : { duration: 0.26, ease: easeOut }))

const ariaLabel = computed(() => (isExpanded.value
  ? formatMessage(props.labels?.expandedAria ?? notificationStackMessages.expandedAria, { count: props.items.length, label: expandedLabel.value })
  : formatMessage(props.labels?.collapsedAria ?? notificationStackMessages.collapsedAria, { count: props.items.length })))

const cardMotion = (index: number) => ({
  y: isExpanded.value ? 0 : index * STACK_PEEK,
  clipPath: isExpanded.value ? 'inset(0px 0px round 16px)' : `inset(0px ${index * STACK_INSET}px round 16px)`,
})

/* ---- footer label swap (the React `ActionSwapText` with animation="roll") - */

// The arriving layer rolls up from below, the leaving one out through the
// top; both fade through a light blur so the swap does not read as a smear.
const TEXT_ROLL = {
  initial: { opacity: 0, y: '90%', filter: 'blur(3px)' },
  animate: { opacity: 1, y: '0%', filter: 'blur(0px)', transition: swapSpring },
  exit: { opacity: 0, y: '-90%', filter: 'blur(3px)', transition: { duration: 0.14, ease: easeOut } },
}
const REST = { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
const footerValue = computed(() => (isExpanded.value ? 'expanded' : 'collapsed'))
</script>

<template>
  <div
    v-if="!primaryItem"
    class="be-notify-empty"
    :class="className">
    <svg class="be-notify-bell" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
      <path d="M17 17H4a1 1 0 0 1-.74-1.673C4.59 13.956 6 12.499 6 8a6 6 0 0 1 .258-1.742" />
      <path d="m2 2 20 20" />
      <path d="M8.668 3.01A6 6 0 0 1 18 8c0 2.687.77 4.653 1.707 6.05" />
    </svg>
    {{ emptyLabel }}
  </div>

  <motion.button
    v-else
    :ref="bindRoot"
    type="button"
    :initial="false"
    :aria-expanded="isExpanded"
    :aria-label="ariaLabel"
    class="be-notify"
    :class="className"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @pointerdown="onPointerDown"
    @pointercancel="tapDrop"
    @focus="onFocus"
    @blur="onBlur"
    @keydown="onKeyDown"
    @click="onClick">
    <!-- This invisible first card gives the button its compact intrinsic
         footprint. -->
    <span aria-hidden="true" class="be-notify-measure">
      <span class="be-notify-measure-row">
        <span class="be-notify-card is-measuring" :class="classNames?.card">
          <slot name="item" :item="primaryItem">
            <span class="be-notify-content" :class="classNames?.content">
              <span class="be-notify-heading">
                <span class="be-notify-title" :class="classNames?.title"><Content :value="primaryItem.title" /></span>
                <span v-if="primaryItem.trailing !== undefined" class="be-notify-trailing" :class="classNames?.trailing">
                  <Content :value="primaryItem.trailing" />
                </span>
              </span>
              <span v-if="primaryItem.description !== undefined" class="be-notify-description" :class="classNames?.description">
                <Content :value="primaryItem.description" />
              </span>
            </span>
          </slot>
        </span>
      </span>
      <span class="be-notify-spacer" />
    </span>

    <span class="be-notify-layer">
      <motion.span
        aria-hidden="true"
        :layout="true"
        :initial="false"
        :transition="backgroundTransition"
        class="be-notify-sheet" />
      <span class="be-notify-grid" :class="classNames?.stack" :data-collapsed="isExpanded ? undefined : true">
        <motion.span
          v-for="(item, index) in visibleItems"
          :key="item.id"
          layout="position"
          :initial="false"
          :animate="cardMotion(index)"
          :transition="cardTransition"
          class="be-notify-card"
          :class="classNames?.card"
          :style="{ zIndex: visibleItems.length - index, gridColumn: 1, gridRow: isExpanded ? index + 1 : 1 }">
          <span class="be-notify-card-inner" :data-hidden="index !== 0 && !isExpanded ? true : undefined">
            <slot name="item" :item="item">
              <span class="be-notify-content" :class="classNames?.content">
                <span class="be-notify-heading">
                  <span class="be-notify-title" :class="classNames?.title"><Content :value="item.title" /></span>
                  <span v-if="item.trailing !== undefined" class="be-notify-trailing" :class="classNames?.trailing">
                    <Content :value="item.trailing" />
                  </span>
                </span>
                <span v-if="item.description !== undefined" class="be-notify-description" :class="classNames?.description">
                  <Content :value="item.description" />
                </span>
              </span>
            </slot>
          </span>
        </motion.span>
      </span>

      <motion.span
        layout="position"
        :transition="transition"
        class="be-notify-footer"
        :class="classNames?.footer">
        <span class="be-notify-count" :class="classNames?.count">{{ items.length }}</span>
        <span class="be-notify-label">
          <span class="be-notify-swap">
            <span aria-hidden="true" class="be-notify-swap-measure">
              <span v-if="isExpanded" class="be-notify-swap-inline">{{ expandedLabel }}<svg class="be-notify-arrow" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10" /><path d="M7 17 17 7" /></svg></span>
              <template v-else>{{ collapsedLabel }}</template>
            </span>
            <AnimatePresence :initial="false">
              <motion.span
                :key="`roll-${footerValue}`"
                :variants="TEXT_ROLL"
                :initial="reduce ? false : 'initial'"
                :animate="reduce ? REST : 'animate'"
                :exit="reduce ? undefined : 'exit'"
                class="be-notify-swap-layer">
                <span v-if="isExpanded" class="be-notify-swap-inline">{{ expandedLabel }}<svg class="be-notify-arrow" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10" /><path d="M7 17 17 7" /></svg></span>
                <template v-else>{{ collapsedLabel }}</template>
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
      </motion.span>
    </span>
  </motion.button>
</template>

<style scoped>
.be-notify-empty {
  box-sizing: border-box;
  display: flex; align-items: center; justify-content: center; gap: .5rem;
  width: 100%; max-width: 22rem; padding: 2rem 1.25rem;
  border-radius: 1.5rem;
  background: color-mix(in srgb, var(--beui-muted) 70%, transparent);
  color: var(--beui-muted-foreground);
  font-size: .875rem; font-weight: 500;
}
.be-notify-bell { width: 1rem; height: 1rem; flex: none; }

.be-notify {
  position: relative; z-index: 10; display: block; box-sizing: border-box;
  width: 100%; max-width: 22rem; padding: 0;
  border: 0; background: transparent; color: var(--beui-foreground);
  font: inherit; text-align: left; cursor: pointer; outline: none;
  border-radius: 1.5rem;
}
.be-notify:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }

.be-notify-measure { display: block; padding: .75rem; visibility: hidden; }
.be-notify-measure-row { display: block; }
.be-notify-spacer { display: block; height: 2.25rem; margin-top: .5rem; }

.be-notify-layer { position: absolute; inset-inline: 0; bottom: 0; display: block; padding: .75rem; }
.be-notify-sheet { position: absolute; inset: 0; display: block; border-radius: 1.5rem; background: var(--beui-muted); }

.be-notify-grid { position: relative; z-index: 10; display: grid; gap: .25rem; }
.be-notify-grid[data-collapsed] { padding-bottom: .5rem; }

.be-notify-card {
  box-sizing: border-box; display: block; padding: 0 1rem;
  border: 1px solid color-mix(in srgb, var(--beui-border) 60%, transparent);
  border-radius: 1rem;
  background: var(--beui-background);
}
.be-notify-card.is-measuring { border-color: transparent; }
.be-notify-card-inner { display: block; }
.be-notify-card-inner[data-hidden] { visibility: hidden; }

.be-notify-content { display: flex; flex-direction: column; gap: .375rem; min-width: 0; padding: 1rem 0; }
.be-notify-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; min-width: 0; }
.be-notify-title { min-width: 0; font-size: .875rem; font-weight: 500; line-height: 1.375; }
.be-notify-trailing { flex: none; font-size: .75rem; line-height: 1rem; }
.be-notify-description { font-size: .75rem; line-height: 1.625; color: var(--beui-muted-foreground); }

.be-notify-footer {
  position: relative; z-index: 10; display: flex; align-items: center; gap: .5rem;
  min-height: 2.25rem; margin-top: .5rem; padding: 0 .25rem;
}
.be-notify-count {
  display: grid; place-items: center; flex: none;
  width: 1.75rem; height: 1.75rem; border-radius: 999px;
  background: #ea580c; color: #fff;
  font-size: .75rem; font-weight: 500;
  box-shadow: inset 0 1px 2px rgb(0 0 0 / .2), inset 0 -1px 0 rgb(255 255 255 / .16);
}
:global(.dark .be-notify-count) { background: #f97316; }
.be-notify-label { display: flex; align-items: center; font-size: .875rem; font-weight: 500; }

/* The swap keeps a hidden copy at rest so the footer's width never jumps while
   a layer rolls; the visible layer is taken out of flow over it. */
.be-notify-swap {
  position: relative; display: inline-block; max-width: 100%;
  padding-block: .08em; margin-block: -.08em;
  white-space: nowrap; vertical-align: bottom;
  clip-path: inset(0 -999px); -webkit-clip-path: inset(0 -999px);
}
.be-notify-swap-measure { display: inline-block; visibility: hidden; white-space: nowrap; }
.be-notify-swap-layer {
  position: absolute; left: 0; top: .08em;
  display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  will-change: opacity, filter, transform;
}
.be-notify-swap-inline { display: inline-flex; align-items: center; gap: .25rem; }
.be-notify-arrow { width: 1rem; height: 1rem; flex: none; }

@media (prefers-reduced-motion: reduce) {
  .be-notify { transition: none; }
}
</style>
