<script lang="ts">
export type InfiniteMasonryKey = string | number | bigint
</script>

<script setup lang="ts" generic="Item">
import { computed, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { infiniteMasonryMessages } from './messages'
import InfiniteMasonryItem from './InfiniteMasonryItem.vue'
import InfiniteMasonryReveal from './InfiniteMasonryReveal.vue'
import { packLanes, totalSize, visibleIndexes } from './masonry-layout'
import { useReducedMotion } from '../core/reduced-motion'

const props = withDefaults(defineProps<{
  items: readonly Item[]
  getItemKey: (item: Item, index: number) => InfiniteMasonryKey
  /** Called when the last few items scroll into view (see `prefetch`). */
  onLoadMore: () => void | Promise<void>
  hasMore: boolean
  /** A load owned by the consumer, rather than the tail trigger. */
  loading?: boolean
  /** Message rendered in the tail error card, under the heading. Use the `error` slot for markup. */
  error?: string
  onRetry?: () => void
  /** Height estimate per item, used to pack the columns until the item is measured. */
  estimateSize?: (item: Item, index: number) => number
  emptyState?: string
  endState?: string
  minColumnWidth?: number
  maxColumns?: number
  gap?: number
  /** Rows kept mounted beyond the viewport, in items per column. */
  overscan?: number
  /** Starts a load once an item within this many of the end is visible, counted in items. */
  prefetch?: number
  animateItems?: boolean
  ariaLabel?: string
  contentClassName?: string
  itemClassName?: string
  labels?: Partial<typeof infiniteMasonryMessages>
}>(), {
  loading: false,
  minColumnWidth: 208,
  maxColumns: 4,
  gap: 12,
  overscan: 4,
  prefetch: 3,
  animateItems: true,
})

const slots = defineSlots<{
  /** Renders one item. */
  default?(props: { item: Item; index: number }): unknown
  /** Alias of the default slot, named after the React `renderItem` prop. */
  renderItem?(props: { item: Item; index: number }): unknown
  /** Placeholder shown in a column while `loading`. */
  loading?(props: { index: number }): unknown
  /** Alias of the `loading` slot, named after the React `renderLoadingItem` prop. */
  renderLoadingItem?(props: { index: number }): unknown
  /** Shown when there are no items and nothing more to load. */
  empty?(): unknown
  /** Alias of the `empty` slot, named after the React `emptyState` prop. */
  emptyState?(): unknown
  /** Tail error card details. Render it with `v-if` on the `<template>` so it only exists while loading failed. */
  error?(): unknown
  /** Shown under the items once nothing more can load. */
  endState?(): unknown
}>()

const text = computed(() => ({ ...infiniteMasonryMessages, ...props.labels }))
const reduce = useReducedMotion()

const scrollEl = useTemplateRef<HTMLElement>('scroll')
const contentEl = useTemplateRef<HTMLElement>('content')

/* ---- measurements -------------------------------------------------------- */

const contentWidth = shallowRef(0)
const columns = shallowRef(1)
const scrollTop = shallowRef(0)
const viewport = shallowRef(0)

function applyWidth(next: number) {
  if (next === contentWidth.value) return
  contentWidth.value = next
  columns.value = Math.min(props.maxColumns, Math.max(1, Math.floor((next + props.gap) / (props.minColumnWidth + props.gap))))
}

// One observer, on the scroll frame. Its size does not depend on how the items pack (its content box is
// exactly the content layer's width), so re-packing never resizes what is observed. Observing the content
// layer itself would resize it from inside its own callback (its height follows the columns) and trip
// WebKit's "ResizeObserver loop completed with undelivered notifications".
watch(scrollEl, (node, _previous, onCleanup) => {
  if (!node) return
  applyWidth(contentEl.value?.getBoundingClientRect().width ?? node.getBoundingClientRect().width)
  viewport.value = node.offsetHeight
  scrollTop.value = node.scrollTop
  if (typeof ResizeObserver === 'undefined') return
  const observer = new ResizeObserver(([entry]) => {
    if (!entry) return
    applyWidth(entry.contentRect.width)
    const box = entry.borderBoxSize?.[0]
    viewport.value = Math.round(box ? box.blockSize : node.offsetHeight)
  })
  observer.observe(node)
  onCleanup(() => observer.disconnect())
}, { flush: 'post' })

watch(() => [props.minColumnWidth, props.gap, props.maxColumns], () => {
  const next = contentWidth.value
  contentWidth.value = -1
  applyWidth(next)
})

/* ---- layout -------------------------------------------------------------- */

const hasError = computed(() => (props.error !== undefined && props.error !== null) || Boolean(slots.error))
const tailCount = computed(() => (hasError.value ? 1 : props.loading ? columns.value : 0))
const count = computed(() => props.items.length + tailCount.value)

// Measured heights by item key, and the lane each index was first given. Neither is
// reactive state: `sizeVersion` tells the layout when they changed.
const sizes = new Map<InfiniteMasonryKey, number>()
const laneCache = new Map<number, number>()
const sizeVersion = shallowRef(0)

watch(columns, () => {
  // A new column count repacks everything from scratch, as the virtualizer does.
  sizes.clear()
  laneCache.clear()
  sizeVersion.value++
}, { flush: 'pre' })

const tailKey = (index: number) => `masonry-tail-${index - props.items.length}`
const keyAt = (index: number): InfiniteMasonryKey => index < props.items.length ? props.getItemKey(props.items[index]!, index) : tailKey(index)
const defaultEstimate = () => 240

const cells = computed(() => {
  void sizeVersion.value
  return packLanes(count.value, columns.value, props.gap, keyAt, (index, key) => {
    const measured = sizes.get(key)
    if (measured !== undefined) return measured
    return index < props.items.length ? (props.estimateSize ?? defaultEstimate)(props.items[index]!, index) : 144 + ((index - props.items.length) % 3) * 36
  }, laneCache)
})

const contentHeight = computed(() => totalSize(cells.value, columns.value))
const virtual = computed(() => visibleIndexes(cells.value, columns.value, viewport.value, scrollTop.value, props.overscan * columns.value).map(index => cells.value[index]!))
const columnWidth = computed(() => Math.max(0, (contentWidth.value - props.gap * (columns.value - 1)) / columns.value))

function onMeasure(cell: { key: InfiniteMasonryKey; start: number }, size: number) {
  const known = sizes.get(cell.key)
  if (known === size) return
  const previous = known ?? cells.value.find(item => item.key === cell.key)?.size ?? size
  sizes.set(cell.key, size)
  sizeVersion.value++
  // An item above the viewport that turns out taller or shorter would shove what the reader is looking at.
  const delta = size - previous
  if (delta && cell.start < scrollTop.value && scrollEl.value) {
    const node = scrollEl.value
    queueMicrotask(() => { node.scrollTop += delta })
  }
}

function onScroll(event: Event) {
  scrollTop.value = (event.currentTarget as HTMLElement).scrollTop
}

/* ---- loading ------------------------------------------------------------ */

let loadPending = false

const lastVisibleIndex = computed(() => {
  const viewportEnd = scrollTop.value + viewport.value
  return virtual.value.reduce((last, cell) => cell.start < viewportEnd ? Math.max(last, cell.index) : last, -1)
})

function maybeLoad() {
  if (hasError.value || props.loading || !props.hasMore || loadPending || lastVisibleIndex.value < Math.max(0, props.items.length - props.prefetch)) return
  loadPending = true
  void Promise.resolve(props.onLoadMore()).finally(() => { loadPending = false })
}

watch(() => props.loading, loading => { if (!loading) loadPending = false }, { flush: 'post' })
watch([hasError, () => props.hasMore, () => props.items.length, lastVisibleIndex, () => props.loading, () => props.prefetch], maybeLoad, { flush: 'post' })
onMounted(maybeLoad)

// The very first items do not animate; later ones reveal once per key.
const initialCount = props.items.length
const revealedKeys = new Set<string>()
const reveals = (index: number) => props.animateItems && !reduce.value && index >= initialCount

const showEmpty = computed(() => props.items.length === 0 && !props.hasMore && !props.loading && !hasError.value)
const showEnd = computed(() => !props.hasMore && props.items.length > 0 && Boolean(props.endState || slots.endState))
</script>

<template>
  <section v-if="showEmpty" class="be-masonry is-empty" :aria-label="ariaLabel ?? text.label">
    <slot name="emptyState">
      <slot name="empty">
        <template v-if="emptyState">{{ emptyState }}</template>
        <div v-else class="masonry-empty">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" /></svg>
          <p class="masonry-empty-title">{{ text.emptyTitle }}</p>
          <p class="masonry-empty-description">{{ text.emptyDescription }}</p>
        </div>
      </slot>
    </slot>
  </section>
  <section v-else ref="scroll" class="be-masonry" :aria-label="ariaLabel ?? text.label" :aria-busy="loading" @scroll.passive="onScroll">
    <div ref="content" class="be-masonry-content" :class="contentClassName" :style="{ height: `${contentHeight}px` }">
      <InfiniteMasonryItem v-for="cell in virtual" :key="String(cell.key)" :data-index="cell.index"
        :class="cell.index < items.length ? itemClassName : undefined"
        :style="{ width: `${columnWidth}px`, transform: `translate3d(${cell.lane * (columnWidth + gap)}px, ${cell.start}px, 0)` }"
        @measure="size => onMeasure(cell, size)">
        <template v-if="cell.index >= items.length">
          <div v-if="hasError" class="masonry-error">
            <div class="masonry-error-heading">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 8v4m0 4h.01" /></svg>
              <p>{{ text.loadError }}</p>
            </div>
            <div class="masonry-error-detail"><slot name="error">{{ error }}</slot></div>
            <button v-if="onRetry" type="button" class="masonry-retry" @click="onRetry()">{{ text.retry }}</button>
          </div>
          <slot v-else name="renderLoadingItem" :index="cell.index - items.length">
            <slot name="loading" :index="cell.index - items.length">
              <div class="masonry-skeleton" aria-hidden="true" :style="{ minHeight: `${144 + ((cell.index - items.length) % 3) * 36}px` }">
                <div class="masonry-skeleton-line is-title" />
                <div class="masonry-skeleton-line" />
                <div class="masonry-skeleton-line is-short" />
              </div>
            </slot>
          </slot>
        </template>
        <InfiniteMasonryReveal v-else :item-key="String(cell.key)" :lane="cell.lane" :revealed-keys="revealedKeys" :animate="reveals(cell.index)">
          <slot name="renderItem" :item="items[cell.index]!" :index="cell.index">
            <slot :item="items[cell.index]!" :index="cell.index" />
          </slot>
        </InfiniteMasonryReveal>
      </InfiniteMasonryItem>
    </div>

    <div v-if="showEnd" class="masonry-end"><slot name="endState">{{ endState }}</slot></div>
    <span class="masonry-sr" aria-live="polite">{{ loading ? text.loadingMore : null }}</span>
  </section>
</template>

<style scoped>
.be-masonry {
  box-sizing: border-box;
  width: 100%;
  padding: .75rem;
  overflow-y: auto;
  overscroll-behavior: none;
  contain: layout paint;
  overflow-anchor: none;
  scrollbar-gutter: stable;
  border: 1px solid var(--beui-border);
  border-radius: 1.5rem;
  background: var(--beui-background);
}
.be-masonry.is-empty { padding: 0; overflow: hidden; contain: none; scrollbar-gutter: auto; }

.be-masonry-content { position: relative; width: 100%; }

.masonry-end { padding: 1rem 0; text-align: center; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }

.masonry-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 16rem; padding: 0 1.5rem; text-align: center; }
.masonry-empty svg { width: 2rem; height: 2rem; fill: none; stroke: var(--beui-muted-foreground); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.masonry-empty-title { margin: .75rem 0 0; font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); }
.masonry-empty-description { margin: .25rem 0 0; max-width: 20rem; font-size: .75rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }

.masonry-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  box-sizing: border-box;
  min-height: 9rem;
  padding: 1rem;
  border: 1px solid color-mix(in oklab, var(--beui-destructive) 20%, transparent);
  border-radius: 1rem;
  background: color-mix(in oklab, var(--beui-destructive) 5%, transparent);
}
.masonry-error-heading { display: flex; align-items: center; gap: .5rem; color: var(--beui-destructive); }
.masonry-error-heading p { margin: 0; font-size: .875rem; line-height: 1.25rem; font-weight: 500; }
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
  line-height: 1rem;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  transition: background-color .15s cubic-bezier(.4, 0, .2, 1);
}
.masonry-retry:hover { background: var(--beui-muted); }
.masonry-retry:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }

.masonry-skeleton { box-sizing: border-box; padding: .75rem; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-card); animation: masonry-pulse 2s cubic-bezier(.4, 0, .6, 1) infinite; }
.masonry-skeleton-line { height: .5rem; margin-top: .5rem; border-radius: 999px; background: var(--beui-muted); }
.masonry-skeleton-line:nth-child(2) { margin-top: .75rem; width: 100%; }
.masonry-skeleton-line.is-title { width: 66.666667%; height: .75rem; margin-top: 0; }
.masonry-skeleton-line.is-short { width: 80%; }
@keyframes masonry-pulse { 50% { opacity: .5; } }

.masonry-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }

@media (prefers-reduced-motion: reduce) {
  .masonry-skeleton { animation: none; }
}
</style>
