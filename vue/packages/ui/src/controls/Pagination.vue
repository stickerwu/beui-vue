<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const paginationMessages = {
  label: 'Pagination',
  previous: 'Previous page',
  next: 'Next page',
  back: 'Back {count} pages',
  forward: 'Forward {count} pages',
  page: 'Page {page}',
}
export type PaginationMessages = typeof paginationMessages

export type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end'

/**
 * The pages to show: `boundaries` pages at each end, `siblings` either side of
 * the current page, and an ellipsis for every gap of two or more pages. The
 * result keeps one length while the current page moves, so the row never
 * changes width as you page through.
 */
export function paginationRange(page: number, totalPages: number, siblings = 1, boundaries = 1): PaginationItem[] {
  const range = (start: number, end: number) => Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index)
  // Boundaries, siblings, the current page and two ellipses.
  const slots = boundaries * 2 + siblings * 2 + 3
  if (totalPages <= slots) return range(1, totalPages)

  const left = Math.max(page - siblings, boundaries)
  const right = Math.min(page + siblings, totalPages - boundaries)
  const showStart = left > boundaries + 2
  const showEnd = right < totalPages - (boundaries + 1)

  if (!showStart && showEnd) return [...range(1, siblings * 2 + boundaries + 2), 'ellipsis-end', ...range(totalPages - boundaries + 1, totalPages)]
  if (showStart && !showEnd) return [...range(1, boundaries), 'ellipsis-start', ...range(totalPages - (boundaries + 1 + siblings * 2), totalPages)]
  return [...range(1, boundaries), 'ellipsis-start', ...range(left, right), 'ellipsis-end', ...range(totalPages - boundaries + 1, totalPages)]
}
</script>

<script setup lang="ts">
import { AnimatePresence, LayoutGroup, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, shallowRef, useId, useSlots, type FunctionalComponent } from 'vue'
import { easeOut, layoutSpring } from '../core/motion'
import PresenceGate from '../layout/PresenceGate.vue'

const props = withDefaults(defineProps<{
  totalPages: number
  /** The current page, 1-based. Bind it with `v-model:page` (or `v-model`) to control the pagination. */
  page?: number
  /** Initial page when `v-model` is not used. */
  defaultPage?: number
  /** Pages shown either side of the current one. */
  siblings?: number
  /** Pages always shown at each end. */
  boundaries?: number
  /** Pages an ellipsis jumps when pressed. */
  jump?: number
  disabled?: boolean
  /** Accessible name of the navigation landmark (overrides `labels.label`). */
  label?: string
  /**
   * Render pages as links. Each control still emits `change`, so a client
   * router can update state while the href keeps the page shareable.
   */
  getHref?: (page: number) => string
  /** Override any built-in string. `{count}` fills `back`/`forward`, `{page}` fills `page`. */
  labels?: Partial<PaginationMessages>
}>(), { defaultPage: 1, siblings: 1, boundaries: 1, jump: 5 })
const emit = defineEmits<{ change: [page: number]; 'update:page': [page: number] }>()
defineSlots<{
  /**
   * Render each page link yourself, for your router's link. Receives the link `props` (href, class, aria
   * attributes, click handler) to bind onto it, and `Children`, a component for the link's contents: render it inside with `<component :is="Children" />`.
   * Only used together with `getHref`.
   */
  renderLink?: (props: { props: Record<string, unknown>; Children: FunctionalComponent }) => unknown
}>()
const slots = useSlots()
// Hands one page link to the `renderLink` slot. Its attributes are the link props and its own
// default slot is the link's contents.
const RenderedLink: FunctionalComponent = (_props, { attrs, slots: own }) => slots.renderLink?.({ props: attrs, Children: () => own.default?.() })
RenderedLink.inheritAttrs = false
const model = defineModel<number>()

const reduce = useReducedMotion()
const uid = useId()
const strings = computed(() => ({ ...paginationMessages, ...props.labels }))
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`))
const total = computed(() => Math.max(1, Math.floor(props.totalPages)))
const clamp = (value: number) => Math.min(total.value, Math.max(1, Math.round(value)))
const internal = shallowRef(props.defaultPage)
const current = computed(() => clamp(props.page ?? model.value ?? internal.value))
const items = computed(() => paginationRange(current.value, total.value, props.siblings, props.boundaries))
const fade = computed(() => ({ duration: reduce.value ? 0.12 : 0.16, ease: easeOut }))
const pageName = computed(() => props.label ?? strings.value.label)

function go(next: number) {
  const target = clamp(next)
  if (target === current.value) return
  if (props.page === undefined && model.value === undefined) internal.value = target
  model.value = target
  emit('update:page', target)
  emit('change', target)
}
function click(event: MouseEvent, target: number) {
  if (props.getHref) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
  }
  go(target)
}
const tag = (target: number, disabled = false) => (props.getHref && !disabled ? (slots.renderLink ? RenderedLink : 'a') : 'button')
const attrs = (target: number, disabled = false) => (props.getHref && !disabled ? { href: props.getHref(target) } : { type: 'button', disabled })
</script>

<template>
  <nav class="be-pagination" :aria-label="pageName">
    <LayoutGroup :id="uid">
      <ul class="be-pagination-list">
        <li>
          <component :is="tag(current - 1, disabled || current === 1)" v-bind="attrs(current - 1, disabled || current === 1)" class="be-pagination-control be-pagination-arrow" :aria-label="strings.previous" @click="click($event, current - 1)">
            <svg class="be-pagination-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </component>
        </li>
        <AnimatePresence mode="popLayout" :initial="false">
          <motion.li
            v-for="item in items"
            :key="item"
            :layout="reduce ? false : 'position'"
            :initial="typeof item === 'number' ? { opacity: 0, scale: reduce ? 1 : 0.8 } : { opacity: 0 }"
            :animate="typeof item === 'number' ? { opacity: 1, scale: 1 } : { opacity: 1 }"
            :exit="typeof item === 'number' ? { opacity: 0, scale: reduce ? 1 : 0.8, transition: fade } : { opacity: 0, transition: fade }"
            :transition="typeof item === 'number' ? { layout: layoutSpring, opacity: fade, scale: layoutSpring } : { layout: layoutSpring, opacity: fade }"
          >
            <!-- An exiting number keeps its layout spring after it has faded; the gate stops it catching clicks or focus. -->
            <PresenceGate v-slot="{ gate }">
              <component
                :is="tag(item === 'ellipsis-start' ? current - jump : item === 'ellipsis-end' ? current + jump : item)"
                v-bind="attrs(item === 'ellipsis-start' ? current - jump : item === 'ellipsis-end' ? current + jump : item)"
                :inert="gate.inert"
                :style="gate.style"
                class="be-pagination-control"
                :class="typeof item !== 'number' ? 'be-pagination-ellipsis' : item === current ? 'be-pagination-current' : 'be-pagination-page'"
                :aria-label="typeof item === 'number' ? fill(strings.page, { page: item }) : fill(item === 'ellipsis-start' ? strings.back : strings.forward, { count: jump })"
                :aria-current="item === current ? 'page' : undefined"
                @click="click($event, item === 'ellipsis-start' ? current - jump : item === 'ellipsis-end' ? current + jump : item)"
              >
                <template v-if="typeof item === 'number'">
                  <motion.span v-if="item === current" class="be-pagination-pill" aria-hidden="true" :layout-id="reduce ? undefined : 'pagination-current'" :transition="layoutSpring" />
                  <span class="be-pagination-number">{{ item }}</span>
                </template>
                <template v-else>
                  <!-- Hover or focus turns the dots into the jump's direction. -->
                  <span class="be-pagination-dots" aria-hidden="true">…</span>
                  <svg class="be-pagination-icon be-pagination-chevrons" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <template v-if="item === 'ellipsis-start'"><path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" /></template>
                    <template v-else><path d="m6 17 5-5-5-5" /><path d="m13 17 5-5-5-5" /></template>
                  </svg>
                </template>
              </component>
            </PresenceGate>
          </motion.li>
        </AnimatePresence>
        <li>
          <component :is="tag(current + 1, disabled || current === total)" v-bind="attrs(current + 1, disabled || current === total)" class="be-pagination-control be-pagination-arrow" :aria-label="strings.next" @click="click($event, current + 1)">
            <svg class="be-pagination-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </component>
        </li>
      </ul>
    </LayoutGroup>
  </nav>
</template>

<style>
.be-pagination { display: flex; }
.be-pagination-list { position: relative; display: flex; align-items: center; gap: 0.125rem; margin: 0; padding: 0; list-style: none; }
.be-pagination-list > li { margin: 0; padding: 0; }
.be-pagination-control {
  position: relative; display: inline-flex; box-sizing: border-box; height: 2rem; min-width: 2rem; align-items: center; justify-content: center;
  margin: 0; padding: 0 0.5rem; border: 0; border-radius: 9999px; background: transparent; color: var(--beui-muted-foreground);
  font: inherit; font-size: 0.875rem; line-height: 1.25rem; font-variant-numeric: tabular-nums; text-decoration: none; cursor: pointer; outline: none;
  transition: color 150ms ease-out, background-color 150ms ease-out, transform 150ms ease-out, box-shadow 150ms ease-out;
}
.be-pagination-control:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-pagination-control:active { transform: scale(0.94); }
@media (min-width: 640px) {
  .be-pagination-list { gap: 0.25rem; }
  .be-pagination-control { height: 2.25rem; min-width: 2.25rem; }
}
@media (hover: hover) {
  .be-pagination-control:hover { color: var(--beui-foreground); }
  .be-pagination-page:hover { background: color-mix(in srgb, var(--beui-foreground) 5%, transparent); }
}
.be-pagination-arrow:disabled { pointer-events: none; opacity: 0.4; }
.be-pagination-current { font-weight: 500; color: var(--beui-background); }
.be-pagination-pill { position: absolute; inset: 0; border-radius: 9999px; background: var(--beui-foreground); }
.be-pagination-number { position: relative; }
.be-pagination-icon { width: 1rem; height: 1rem; flex-shrink: 0; }
.be-pagination-dots { transition: opacity 150ms ease-out, transform 150ms ease-out; }
.be-pagination-chevrons { position: absolute; opacity: 0; transform: scale(0.75); transition: opacity 150ms ease-out, transform 150ms ease-out; }
.be-pagination-ellipsis:hover .be-pagination-dots, .be-pagination-ellipsis:focus-visible .be-pagination-dots { opacity: 0; transform: scale(0.75); }
.be-pagination-ellipsis:hover .be-pagination-chevrons, .be-pagination-ellipsis:focus-visible .be-pagination-chevrons { opacity: 1; transform: scale(1); }
@media (prefers-reduced-motion: reduce) {
  .be-pagination-control:active { transform: none; }
  .be-pagination-dots, .be-pagination-chevrons { transform: none !important; }
}
</style>
