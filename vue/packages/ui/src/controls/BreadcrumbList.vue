<script setup lang="ts">
import { AnimatePresence } from 'motion-v'
import { computed, h, shallowRef, useSlots, useTemplateRef, watch, type VNode } from 'vue'
import { flattenSlot } from '../core/flatten-slot'
import BreadcrumbEllipsis from './BreadcrumbEllipsis.vue'
import BreadcrumbItem from './BreadcrumbItem.vue'
import BreadcrumbSeparator from './BreadcrumbSeparator.vue'

/** The ordered path. Pass keyed `BreadcrumbItem`s directly so entering and leaving routes animate. */
const props = withDefaults(defineProps<{
  /** Maximum visible slots, including the ellipsis. Minimum 3; Infinity disables collapsing. */
  maxItems?: number
  /** Accessible label for the hidden ancestor disclosure. */
  overflowLabel?: string
}>(), { maxItems: 4 })
defineSlots<{
  /** The `BreadcrumbItem`s, in path order. */
  default?: () => unknown
}>()

const slots = useSlots()
const list = useTemplateRef<HTMLOListElement>('list')

const OVERFLOW_KEY = 'breadcrumb-overflow'
const limit = computed(() => (Number.isFinite(props.maxItems) ? Math.max(3, Math.floor(props.maxItems)) : 4))
// Called from the template, so the slot is read (and tracked) while rendering.
function visible(): VNode[] {
  const items = flattenSlot(slots.default?.())
  const collapse = props.maxItems !== Infinity && items.length > limit.value
  if (!collapse) return items
  const tail = limit.value - 2
  const hidden = items.slice(1, items.length - tail)
  return [
    items[0]!,
    h(BreadcrumbItem, { key: OVERFLOW_KEY }, () => [
      h(BreadcrumbSeparator),
      h(BreadcrumbEllipsis, { label: props.overflowLabel }, () => hidden),
    ]),
    ...items.slice(-tail),
  ]
}

// AnimatePresence keeps a leaving crumb's last vnode as it was, so it never
// learns it is leaving. React's exiting items re-render through `useIsPresent`
// and become inert; do the same to the retained nodes, or a fading crumb keeps
// its aria-current and can still take a tab stop.
const keys = shallowRef<string[]>([])
function track(nodes: VNode[]) {
  const next = nodes.map((node, index) => String(node.key ?? index))
  if (next.join('\0') !== keys.value.join('\0')) keys.value = next
  return nodes
}
watch(keys, current => {
  const nodes = list.value?.children
  if (!nodes) return
  for (const node of Array.from(nodes) as HTMLElement[]) {
    const key = node.dataset.crumbKey
    if (!key || current.includes(key)) continue
    node.setAttribute('inert', '')
    node.setAttribute('aria-hidden', 'true')
    node.style.minWidth = 'var(--breadcrumb-exit-width)'
    for (const page of node.querySelectorAll('[aria-current]')) page.removeAttribute('aria-current')
  }
}, { flush: 'post' })
</script>

<template>
  <ol ref="list" class="be-crumb-list">
    <AnimatePresence :initial="false" mode="popLayout">
      <component :is="node" v-for="(node, index) in track(visible())" :key="node.key ?? undefined" :data-crumb-key="String(node.key ?? index)" />
    </AnimatePresence>
  </ol>
</template>

<style>
.be-crumb-list { position: relative; display: flex; flex-wrap: wrap; align-items: center; column-gap: .25rem; row-gap: .25rem; margin: 0; padding: 0; list-style: none; font-size: .875rem; line-height: 1.25rem; }
</style>
