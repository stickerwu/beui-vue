<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const breadcrumbMessages = {
  label: 'Breadcrumb',
  showHidden: 'Show hidden paths',
}
export type BreadcrumbMessages = typeof breadcrumbMessages
export interface BreadcrumbItem { label: string; href?: string }
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { useMountedMedia } from '../core/mounted-media'
import { easeOut, layoutSpring } from '../core/motion'
import PopoverMorph from './popover/PopoverMorph.vue'

const props = withDefaults(defineProps<{
  items: readonly BreadcrumbItem[]
  /** Maximum visible slots, including the ellipsis. Minimum 3; Infinity disables collapsing. */
  maxItems?: number
  /** Accessible name of the navigation landmark. */
  label?: string
  labels?: Partial<BreadcrumbMessages>
}>(), { maxItems: 4 })
defineSlots<{ icon?: (props: { item: BreadcrumbItem; index: number }) => unknown }>()
const emit = defineEmits<{ navigate: [item: BreadcrumbItem, index: number, event: MouseEvent] }>()
const t = computed(() => ({ ...breadcrumbMessages, ...props.labels }))
const reduce = useReducedMotion()
const uid = useId()
const list = useTemplateRef<HTMLOListElement>('list')
// The ellipsis button lives inside the animated list, so a plain template ref
// would collect an array; hold the element itself.
const trigger = shallowRef<HTMLButtonElement | null>(null)
function bindTrigger(element: Element | { $el?: unknown } | null) {
  trigger.value = element instanceof HTMLButtonElement ? element : null
}

// --- Collapsing -----------------------------------------------------------
// `maxItems` counts the ellipsis slot: the first crumb, the disclosure, then
// the last (limit - 2) crumbs. Infinity disables collapsing entirely.
const limit = computed(() => (Number.isFinite(props.maxItems) ? Math.max(3, Math.floor(props.maxItems)) : 4))
const collapse = computed(() => props.maxItems !== Infinity && props.items.length > limit.value)
const tailCount = computed(() => limit.value - 2)
const hidden = computed(() => props.items.slice(1, props.items.length - tailCount.value))
type Entry = { kind: 'first' | 'ellipsis' | 'crumb'; index: number; item?: BreadcrumbItem }
const visible = computed<Entry[]>(() => {
  if (!collapse.value) return props.items.map((item, index) => ({ kind: 'crumb', index, item }))
  return [
    { kind: 'first', index: 0, item: props.items[0] },
    { kind: 'ellipsis', index: -1 },
    ...props.items.slice(-tailCount.value).map((item, position) => ({ kind: 'crumb' as const, index: props.items.length - tailCount.value + position, item })),
  ]
})
function keyOf(entry: Entry) { return entry.kind === 'ellipsis' ? 'ellipsis' : `crumb-${entry.index}` }

// --- Enter / exit ---------------------------------------------------------
// popLayout snapshots integer offsetWidth while an item leaves. Keep the exact
// measured width so a fractional-pixel loss cannot wrap the final character.
const widths = reactive(new Map<string, number>())
const measured = shallowRef<Map<string, number>>(new Map())
const observers = new Map<string, ResizeObserver>()
const presentKeys = computed(() => new Set(visible.value.map(keyOf)))

function bind(entry: string, element: Element | { $el?: unknown } | null) {
  observers.get(entry)?.disconnect()
  observers.delete(entry)
  // A ref on the animated <li> component resolves to its instance, not its node.
  const node = element && '$el' in element ? element.$el : element
  if (!(node instanceof HTMLElement)) return
  const measuredNode = node
  const measure = () => {
    widths.set(entry, measuredNode.getBoundingClientRect().width)
    measured.value = new Map(widths)
  }
  measure()
  const observer = new ResizeObserver(measure)
  observer.observe(measuredNode)
  observers.set(entry, observer)
}
// AnimatePresence keeps a leaving item's last vnode as it was, so the gate it
// rendered with is stale. React's exiting items re-render through
// `useIsPresent` and become inert there; do the same to the retained nodes, or
// a fading crumb keeps its aria-current and can still take a tab stop.
watch(presentKeys, keys => {
  const nodes = list.value?.children
  if (!nodes) return
  for (const node of Array.from(nodes) as HTMLElement[]) {
    const key = node.dataset.crumbKey
    if (!key || keys.has(key)) continue
    node.setAttribute('inert', '')
    node.setAttribute('aria-hidden', 'true')
    for (const current of node.querySelectorAll('[aria-current]')) current.removeAttribute('aria-current')
  }
}, { flush: 'post' })

function leavingWidth(entry: string) {
  if (presentKeys.value.has(entry)) return undefined
  const width = measured.value.get(entry)
  return width === undefined ? undefined : `${width}px`
}

const itemTransition = computed(() => ({ duration: reduce.value ? 0 : 0.2, ease: easeOut, layout: layoutSpring }))
const hiddenEnter = computed(() => (reduce.value ? { opacity: 0 } : { opacity: 0, y: 6 }))
const shown = { opacity: 1, y: 0 }

// --- Hidden-paths disclosure ---------------------------------------------
const open = shallowRef(false)
const canHover = useMountedMedia('(hover: hover) and (pointer: fine)')
// Same as the trigger: the slot renders inside a v-for, so a string ref there
// resolves to an array. Hold the node itself.
const overflow = shallowRef<HTMLOListElement | null>(null)
function bindOverflow(element: Element | { $el?: unknown } | null) {
  overflow.value = element instanceof HTMLOListElement ? element : null
}
let closeTimer: number | undefined
let focusOnOpen = false
// Enter or Space on the trigger opens through PopoverMorph, which moves focus
// to the first path itself; ArrowDown opens here.
const placement = reactive<{ align: 'start' | 'end'; side: 'top' | 'bottom'; width: number }>({ align: 'start', side: 'bottom', width: 224 })
function measurePlacement() {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  const right = window.innerWidth - rect.left - 8
  const left = rect.right - 8
  const align = right < 224 && left > right ? 'end' : 'start'
  const below = window.innerHeight - rect.bottom
  placement.align = align
  placement.side = below < 280 && rect.top > below ? 'top' : 'bottom'
  placement.width = Math.max(32, Math.min(224, align === 'start' ? right : left))
}

function cancelClose() {
  if (closeTimer !== undefined) window.clearTimeout(closeTimer)
  closeTimer = undefined
}
function leave() {
  cancelClose()
  // Allow the pointer to cross the gap between the trigger and the panel.
  closeTimer = window.setTimeout(() => {
    const active = document.activeElement
    if (!overflow.value?.contains(active) && active !== trigger.value) open.value = false
  }, 160)
}
function enter(event: PointerEvent) {
  cancelClose()
  if (canHover.value && event.pointerType === 'mouse') {
    focusOnOpen = false
    open.value = true
  }
}
function firstPath() {
  overflow.value?.querySelector<HTMLElement>('a[href],button')?.focus({ preventScroll: true })
}
function triggerKeys(event: KeyboardEvent) {
  if (event.key !== 'ArrowDown') return
  event.preventDefault()
  focusOnOpen = true
  open.value = true
}
watch(open, async next => {
  if (!next) return
  measurePlacement()
  await nextTick()
  if (!focusOnOpen) return
  // The panel becomes visible after its parent's layout measurement.
  let frames = 0
  const focus = () => {
    firstPath()
    if (overflow.value?.contains(document.activeElement) || ++frames > 6) { focusOnOpen = false; return }
    requestAnimationFrame(focus)
  }
  focus()
})
function pick(event: MouseEvent, item: BreadcrumbItem, index: number) {
  emit('navigate', item, index, event)
  if (!(event.target as Element | null)?.closest('a[href]')) return
  open.value = false
  // The chosen path may leave the visible list, and its link unmounts with
  // the panel, so focus would fall to the body. The current page is where the
  // reader just arrived.
  restoreFocus = true
}
// A consumer that moves focus itself still wins: this only rescues a focus
// that would otherwise be lost with the removed link.
let restoreFocus = false
watch(() => props.items, async () => {
  if (!restoreFocus) return
  restoreFocus = false
  await nextTick()
  queueMicrotask(() => {
    // A consumer that focused something still in the page wins; a focus left
    // on the link that just unmounted, or on a crumb that is fading out
    // (inert), does not.
    const active = document.activeElement
    if (active && active !== document.body && active.isConnected && !active.closest('[inert]')) return
    const current = list.value?.querySelector<HTMLElement>('[aria-current="page"]:not([inert] *)')
    if (current && !current.closest('[inert]')) current.focus({ preventScroll: true })
  })
})
function focusOutside(event: FocusEvent) {
  if (!open.value) return
  const target = event.target as Node | null
  if (!target || target === trigger.value || overflow.value?.contains(target)) return
  open.value = false
}
onMounted(() => { document.addEventListener('focusin', focusOutside); window.addEventListener('resize', measurePlacement) })
onBeforeUnmount(() => {
  cancelClose()
  document.removeEventListener('focusin', focusOutside)
  window.removeEventListener('resize', measurePlacement)
  for (const observer of observers.values()) observer.disconnect()
  observers.clear()
})
</script>

<template>
  <nav :aria-label="label ?? t.label" class="be-crumb">
    <ol ref="list" class="be-crumb-list">
      <AnimatePresence :initial="false" mode="popLayout">
        <motion.li v-for="entry in visible" :key="keyOf(entry)"
          :ref="element => bind(keyOf(entry), element)"
          :layout="reduce ? false : 'position'" :initial="hiddenEnter" :animate="shown" :exit="hiddenEnter"
          :transition="itemTransition" :style="{ minWidth: leavingWidth(keyOf(entry)) }"
          :inert="!presentKeys.has(keyOf(entry)) || undefined"
          :aria-hidden="!presentKeys.has(keyOf(entry)) || undefined"
          :data-crumb-key="keyOf(entry)" class="be-crumb-item">
          <template v-if="entry.kind === 'ellipsis'">
            <span aria-hidden="true" class="be-crumb-separator">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </span>
            <PopoverMorph v-model:open="open" as-child :side="placement.side" :align="placement.align" :side-offset="6" :radius="10">
              <template #trigger>
                <button :ref="bindTrigger" type="button" class="be-crumb-ellipsis" :aria-label="t.showHidden"
                  @pointerenter="enter" @pointerleave="leave" @keydown="triggerKeys">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="19" cy="12" r="1.6" fill="currentColor" /></svg>
                </button>
              </template>
              <ol :ref="bindOverflow" class="be-crumb-overflow" :style="{ width: `${placement.width - 14}px` }" @pointerenter="cancelClose" @pointerleave="leave">
                <li v-for="(item, position) in hidden" :key="`hidden-${position}`" class="be-crumb-hidden">
                  <a v-if="item.href" :href="item.href" @click="pick($event, item, position + 1)">{{ item.label }}</a>
                  <button v-else type="button" @click="pick($event, item, position + 1)">{{ item.label }}</button>
                </li>
              </ol>
            </PopoverMorph>
          </template>

          <template v-else-if="entry.item">
            <span v-if="entry.index > 0" aria-hidden="true" class="be-crumb-separator">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </span>
            <!-- A crumb on its way out keeps its old props, but it must not claim
                 aria-current while it fades: focus lands on the crumb that is
                 actually the page, not on the node about to leave. -->
            <span v-if="entry.index === items.length - 1 && presentKeys.has(keyOf(entry))" class="be-crumb-page" aria-current="page" tabindex="-1"><slot name="icon" :item="entry.item" :index="entry.index" />{{ entry.item.label }}</span>
            <span v-else-if="entry.index === items.length - 1" class="be-crumb-page"><slot name="icon" :item="entry.item" :index="entry.index" />{{ entry.item.label }}</span>
            <a v-else-if="entry.item.href" class="be-crumb-link" :href="entry.item.href" @click="pick($event, entry.item!, entry.index)"><slot name="icon" :item="entry.item" :index="entry.index" />{{ entry.item.label }}</a>
            <button v-else type="button" class="be-crumb-link" @click="pick($event, entry.item!, entry.index)"><slot name="icon" :item="entry.item" :index="entry.index" />{{ entry.item.label }}</button>
          </template>
        </motion.li>
      </AnimatePresence>
    </ol>
  </nav>
</template>

<style scoped>
.be-crumb { min-width: 0; }
.be-crumb-list { position: relative; display: flex; flex-wrap: wrap; align-items: center; column-gap: .25rem; row-gap: .25rem; margin: 0; padding: 0; list-style: none; font-size: .875rem; }
.be-crumb-item { position: relative; display: inline-flex; min-width: 0; max-width: 100%; align-items: center; gap: .25rem; }
.be-crumb-item[inert] { pointer-events: none; }
.be-crumb-separator { display: inline-flex; flex: none; align-items: center; color: color-mix(in srgb, var(--beui-muted-foreground) 50%, transparent); }
.be-crumb-separator svg { width: .875rem; height: .875rem; }
.be-crumb-link { display: inline-flex; box-sizing: border-box; min-height: 2rem; min-width: 0; align-items: center; gap: .375rem; padding: 0 .5rem; border: 0; border-radius: .375rem; background: none; color: var(--beui-muted-foreground); font: inherit; font-weight: 500; text-decoration: none; cursor: pointer; transition: background-color .15s, color .15s; }
.be-crumb-link:hover { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); color: var(--beui-foreground); }
.be-crumb-link:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.be-crumb-page { position: relative; isolation: isolate; display: inline-flex; box-sizing: border-box; min-height: 2rem; min-width: 0; align-items: center; gap: .375rem; padding: 0 .5rem; border-radius: .375rem; color: var(--beui-foreground); font-weight: 500; overflow-wrap: anywhere; }
.be-crumb-page:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.be-crumb-ellipsis { display: inline-flex; box-sizing: border-box; width: 2rem; height: 2rem; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: .375rem; background: none; color: var(--beui-muted-foreground); cursor: pointer; transition: background-color .15s, color .15s; }
.be-crumb-ellipsis:hover { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); color: var(--beui-foreground); }
.be-crumb-ellipsis:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.be-crumb-link :slotted(svg), .be-crumb-page :slotted(svg) { width: .875rem; height: .875rem; flex: none; }
.be-crumb-ellipsis svg { width: 1rem; height: 1rem; }
.be-crumb-overflow { box-sizing: content-box; padding: .375rem; display: flex; flex-direction: column; gap: .125rem; max-height: 16rem; overflow-y: auto; margin: 0; padding: 0; list-style: none; }
.be-crumb-hidden { width: 100%; }
.be-crumb-hidden :is(a, button) { box-sizing: border-box; display: flex; width: 100%; align-items: center; padding: .25rem .5rem; border: 0; border-radius: .375rem; background: none; color: var(--beui-muted-foreground); font: inherit; font-weight: 500; text-align: start; text-decoration: none; cursor: pointer; overflow-wrap: anywhere; }
.be-crumb-hidden :is(a, button):hover { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); color: var(--beui-foreground); }
.be-crumb-hidden :is(a, button):focus-visible { outline: 2px solid var(--beui-ring); outline-offset: -2px; }
</style>
