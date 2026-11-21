<script lang="ts">
export type InfiniteMasonryKey = string | number
</script>

<script setup lang="ts" generic="Item">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { infiniteMasonryMessages } from './messages'
import InfiniteMasonryReveal from './InfiniteMasonryReveal.vue'

const props = withDefaults(defineProps<{
  items: readonly Item[]
  getItemKey: (item: Item, index: number) => InfiniteMasonryKey
  /** Called when the tail comes into view (or the manual button is pressed). */
  onLoadMore: () => void | Promise<void>
  hasMore: boolean
  /** A load owned by the consumer, rather than the tail trigger. */
  loading?: boolean
  /** Message rendered in the tail error card, under the heading. */
  error?: string
  onRetry?: () => void
  /** Height estimate per item, used to pack the columns. */
  estimateSize?: (item: Item, index: number) => number
  minColumnWidth?: number
  maxColumns?: number
  gap?: number
  /** Distance from the scroll edge that starts a load, in px. */
  prefetch?: number
  ariaLabel?: string
  emptyState?: string
  endState?: string
  animateItems?: boolean
  labels?: Partial<typeof infiniteMasonryMessages>
}>(), {
  loading: false,
  minColumnWidth: 208,
  maxColumns: 4,
  gap: 12,
  prefetch: 160,
  animateItems: true,
})

defineSlots<{
  default?(props: { item: Item; index: number }): unknown
  loading?(props: { index: number }): unknown
  empty?(): unknown
}>()

const text = computed(() => ({ ...infiniteMasonryMessages, ...props.labels }))

const defaultEstimate = () => 240
const estimate = (item: Item, index: number) => (props.estimateSize ?? defaultEstimate)(item, index)

const root = useTemplateRef<HTMLElement>('root')
const content = useTemplateRef<HTMLElement>('content')
const tail = useTemplateRef<HTMLElement>('tail')

/* ---- measurements -------------------------------------------------------- */

const width = shallowRef(0)
const measuredColumns = shallowRef(1)
// The column count drives the DOM; changing it is deferred a frame so a
// ResizeObserver callback never writes layout inside its own delivery, which is
// what produces the "ResizeObserver loop completed with undelivered
// notifications" error.
let resizeFrame = 0

function applyWidth(next: number) {
  const rounded = Math.round(next)
  if (rounded === width.value) return
  cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(() => {
    if (rounded === width.value) return
    width.value = rounded
    measuredColumns.value = Math.min(props.maxColumns, Math.max(1, Math.floor((rounded + props.gap) / (props.minColumnWidth + props.gap))))
  })
}

let resize: ResizeObserver | undefined
onMounted(() => {
  const node = content.value
  if (!node) return
  applyWidth(node.getBoundingClientRect().width)
  if (typeof ResizeObserver === 'undefined') return
  resize = new ResizeObserver(([entry]) => { if (entry) applyWidth(entry.contentRect.width) })
  resize.observe(node)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(resizeFrame)
  resize?.disconnect()
  observer?.disconnect()
})

watch(() => [props.minColumnWidth, props.gap, props.maxColumns], () => {
  applyWidth(width.value || content.value?.getBoundingClientRect().width || 0)
})

/* ---- layout -------------------------------------------------------------- */

type Slot = { item: Item; index: number; key: InfiniteMasonryKey }
type Lane = { height: number; entries: Slot[] }

const lanes = computed<Lane[]>(() => {
  const count = measuredColumns.value
  const result: Lane[] = Array.from({ length: count }, () => ({ height: 0, entries: [] }))
  props.items.forEach((item, index) => {
    // Shortest lane wins; equal heights keep the leftmost, so the order is
    // stable across renders.
    let target = result[0]!
    for (const lane of result) if (lane.height < target.height) target = lane
    target.entries.push({ item, index, key: props.getItemKey(item, index) })
    target.height += estimate(item, index) + props.gap
  })
  return result
})

const contentHeight = computed(() => {
  if (props.items.length === 0) return 0
  return Math.max(0, Math.max(...lanes.value.map(lane => lane.height)) - props.gap)
})

/* ---- loading ------------------------------------------------------------ */

const pending = shallowRef(false)
// Items released by the automatic tail: the same list is loaded once.
let lastLength = -1
let initialCount = props.items.length
const revealedKeys = new Set<string>()

const hasError = computed(() => props.error !== undefined && props.error !== null)
const showEmpty = computed(() => props.items.length === 0 && !props.hasMore && !props.loading && !hasError.value)

async function load(manual = false) {
  if (!props.hasMore || pending.value || props.loading || hasError.value) return
  if (!manual && lastLength === props.items.length) return
  lastLength = props.items.length
  pending.value = true
  try {
    await props.onLoadMore()
  } catch {
    // A rejection is reported by the consumer through `error`; the button in
    // the tail is the retry affordance.
    pending.value = false
    return
  }
  pending.value = false
}

/* ---- tail trigger ------------------------------------------------------- */

let observer: IntersectionObserver | undefined
const tailVisible = shallowRef(false)

function observeTail() {
  if (typeof IntersectionObserver === 'undefined') return
  observer?.disconnect()
  const rootNode = root.value
  const tailNode = tail.value
  if (!rootNode || !tailNode) return
  observer = new IntersectionObserver(entries => {
    const visible = entries.some(entry => entry.isIntersecting)
    tailVisible.value = visible
  }, { root: rootNode, rootMargin: `0px 0px ${props.prefetch}px 0px` })
  observer.observe(tailNode)
}

// A visible tail keeps loading while it is on screen, as the virtualized React
// version does: each completed load that added items lets the next one start,
// and the item-count guard keeps a load that added nothing from spinning. When
// the tail leaves, the guard is cleared so a later scroll can try again.
watch([tailVisible, () => props.items.length, pending], ([visible]) => {
  if (visible) void load(false)
  else lastLength = -1
}, { flush: 'post' })

onMounted(() => observeTail())
watch(() => props.items.length, () => {
  requestAnimationFrame(() => observeTail())
}, { flush: 'post' })

// Initial fill: the very first items do not animate.
const isNew = (index: number) => props.animateItems && index >= initialCount

function onRetryClick() {
  if (props.onRetry) props.onRetry()
  else void load(true)
}

const columnStyle = computed(() => ({ gap: `${props.gap}px` }))
</script>

<template>
  <section ref="root" class="be-masonry" :class="{ 'is-empty': showEmpty }" :aria-label="ariaLabel ?? text.label"
    :aria-busy="showEmpty ? undefined : loading || pending">
    <div v-if="showEmpty" class="masonry-empty">
      <slot name="empty">
        <template v-if="emptyState">{{ emptyState }}</template>
        <template v-else>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" /></svg>
          <p class="masonry-empty-title">{{ text.emptyTitle }}</p>
          <p class="masonry-empty-description">{{ text.emptyDescription }}</p>
        </template>
      </slot>
    </div>
    <div v-else ref="content" class="be-masonry-cols" :style="{ ...columnStyle, minHeight: `${contentHeight}px` }">
      <div v-for="(lane, laneIndex) in lanes" :key="laneIndex" class="be-masonry-lane" :style="columnStyle">
        <div v-for="entry in lane.entries" :key="entry.key" class="be-masonry-item">
          <InfiniteMasonryReveal :item-key="String(entry.key)" :lane="laneIndex" :revealed-keys="revealedKeys" :animate="isNew(entry.index)">
            <slot :item="entry.item" :index="entry.index" />
          </InfiniteMasonryReveal>
        </div>
      </div>
    </div>

    <div v-if="!showEmpty" ref="tail" class="masonry-tail">
      <div v-if="hasError" class="masonry-error">
        <div class="masonry-error-heading">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 8v4m0 4h.01" /></svg>
          <p>{{ text.loadError }}</p>
        </div>
        <div v-if="error" class="masonry-error-detail">{{ error }}</div>
        <button v-if="onRetry" type="button" class="masonry-retry" @click="onRetryClick">{{ text.retry }}</button>
      </div>
      <div v-else-if="loading || pending" class="masonry-skeleton-row" aria-hidden="true">
        <div v-for="index in Math.max(1, lanes.length)" :key="index" class="masonry-skeleton">
          <slot name="loading" :index="index - 1">
            <div class="masonry-skeleton-line is-title" />
            <div class="masonry-skeleton-line" />
            <div class="masonry-skeleton-line is-short" />
          </slot>
        </div>
      </div>
      <p v-else-if="!hasMore && items.length" class="masonry-end">{{ endState ?? text.endOfResults }}</p>
    </div>
    <span v-if="!showEmpty" class="masonry-sr" aria-live="polite">{{ loading || pending ? text.loadingMore : '' }}</span>
  </section>
</template>

<style scoped>
.be-masonry {
  box-sizing: border-box;
  width: 100%;
  max-height: 28rem;
  padding: .75rem;
  overflow-y: auto;
  overscroll-behavior: none;
  contain: layout paint;
  overflow-anchor: none;
  scrollbar-gutter: stable;
  border: 1px solid var(--beui-border);
  border-radius: 1.5rem;
  background: var(--beui-background);
  color: var(--beui-foreground);
}
.be-masonry.is-empty { display: grid; place-items: center; min-height: 16rem; }

.be-masonry-cols { display: flex; align-items: flex-start; width: 100%; }
.be-masonry-lane { display: grid; flex: 1 1 0; align-items: start; min-width: 0; }
.be-masonry-item { min-width: 0; }

.masonry-tail { padding: .75rem 0 0; text-align: center; }
.masonry-end { margin: 0; padding: .5rem 0; font-size: .75rem; color: var(--beui-muted-foreground); }

.masonry-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem; text-align: center; }
.masonry-empty svg { width: 2rem; height: 2rem; fill: none; stroke: var(--beui-muted-foreground); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.masonry-empty-title { margin: .75rem 0 0; font-size: .875rem; font-weight: 500; }
.masonry-empty-description { margin: .25rem 0 0; max-width: 20rem; font-size: .75rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }

.masonry-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-height: 9rem;
  padding: 1rem;
  text-align: start;
  border: 1px solid color-mix(in srgb, var(--beui-destructive) 20%, transparent);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--beui-destructive) 5%, transparent);
}
.masonry-error-heading { display: flex; align-items: center; gap: .5rem; color: var(--beui-destructive); }
.masonry-error-heading p { margin: 0; font-size: .875rem; font-weight: 500; }
.masonry-error-heading svg { width: 1rem; height: 1rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.masonry-error-detail { margin-top: .5rem; font-size: .75rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.masonry-retry {
  margin-top: .75rem;
  min-height: 2.5rem;
  padding: 0 1rem;
  border: 1px solid var(--beui-border);
  border-radius: 999px;
  background: var(--beui-background);
  color: var(--beui-foreground);
  font: inherit;
  font-size: .75rem;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  transition: background-color .15s;
}
.masonry-retry:hover { background: var(--beui-muted); }
.masonry-retry:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }

.masonry-skeleton-row { display: flex; gap: .75rem; }
.masonry-skeleton { flex: 1; min-height: 9rem; padding: .75rem; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-card); animation: masonry-pulse 1.6s ease-in-out infinite; }
.masonry-skeleton-line { height: .5rem; margin-top: .75rem; border-radius: 999px; background: var(--beui-muted); }
.masonry-skeleton-line.is-title { width: 66%; height: .75rem; margin-top: 0; }
.masonry-skeleton-line.is-short { width: 80%; }
@keyframes masonry-pulse { 50% { opacity: .55; } }

.masonry-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

@media (prefers-reduced-motion: reduce) {
  .masonry-skeleton { animation: none; }
}
</style>
