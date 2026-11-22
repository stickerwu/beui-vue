<script lang="ts">
export type BounceSidebarItem = {
  id: string
  label: string
  href?: string
  icon?: string
  disabled?: boolean
  target?: '_blank' | '_self' | '_parent' | '_top'
  rel?: string
}
</script>

<script setup lang="ts">
import { arc, useAnimate } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'

const props = withDefaults(defineProps<{
  items: readonly BounceSidebarItem[]
  /** Initial selection when `v-model` is not used. */
  defaultValue?: string
  /** Accessible name of the navigation landmark. */
  ariaLabel?: string
  /** Same as `ariaLabel`. */
  label?: string
  className?: string
  listClassName?: string
  itemClassName?: string
  indicatorClassName?: string
  labels?: Partial<{ label: string }>
}>(), {})

const value = defineModel<string>()
const emit = defineEmits<{ valueChange: [value: string] }>()

defineSlots<{
  /** Icon before the label; replaces the item's `icon` text. */
  icon?(props: { item: BounceSidebarItem; index: number }): unknown
  /** Label of a row; replaces the item's `label`. */
  label?(props: { item: BounceSidebarItem; index: number }): unknown
}>()

const DOT_SIZE = 6
// A compact, lightly underdamped spring gives the dot a quick landing without
// turning the sidebar into a playful toy. The sideways arc carries the bounce.
const BOUNCE_SPRING = { type: 'spring', stiffness: 280, damping: 18, mass: 0.3 } as const
// The dot hops sideways, away from the labels. arc() bends proportionally to the
// distance travelled, so cap it: adjacent rows get a ~5px hop and a long jump
// peaks near 20px instead of swinging out of the sidebar.
const ARC_MAX_STRENGTH = 0.26
const ARC_MAX_BULGE = 40
const DOT_LEFT = 12

const reduce = useReducedMotion()
const list = useTemplateRef<HTMLUListElement>('list')
const dotElement = useTemplateRef<HTMLElement>('dot')
const [, animateDot] = useAnimate()

const internal = shallowRef(props.defaultValue ?? props.items[0]?.id ?? '')
const selectedValue = computed(() => {
  const requested = value.value ?? internal.value
  return props.items.some(item => item.id === requested) ? requested : (props.items[0]?.id ?? '')
})
const selectedIndex = computed(() => props.items.findIndex(item => item.id === selectedValue.value))

const itemNodes = new Map<string, HTMLLIElement>()
function setItemNode(id: string, element: unknown) {
  const node = element as HTMLLIElement | null
  if (node) itemNodes.set(id, node)
  else itemNodes.delete(id)
}

let hasPosition = false
let dotY = 0
let previousIndex = -1

function placeDot(destinationY: number) {
  if (!dotElement.value) return
  animateDot(dotElement.value, { x: 0, y: destinationY }, { duration: 0 })
  dotY = destinationY
  hasPosition = true
}

function snapIndicator() {
  const selectedItem = itemNodes.get(selectedValue.value)
  if (!selectedItem) return
  placeDot(selectedItem.offsetTop + (selectedItem.offsetHeight - DOT_SIZE) / 2)
}

function positionIndicator(shouldAnimate: boolean) {
  const selectedItem = itemNodes.get(selectedValue.value)
  if (!selectedItem) return
  const destinationY = selectedItem.offsetTop + (selectedItem.offsetHeight - DOT_SIZE) / 2

  if (!hasPosition || reduce.value || !shouldAnimate || !dotElement.value) {
    placeDot(destinationY)
    previousIndex = selectedIndex.value
    return
  }

  const distance = destinationY - dotY
  const travel = Math.abs(distance)
  const longJumpProgress = Math.min(1, Math.max(0, (travel - 48) / 120))
  dotY = destinationY

  animateDot(dotElement.value, { x: 0, y: destinationY }, {
    ...BOUNCE_SPRING,
    stiffness: BOUNCE_SPRING.stiffness - 60 * longJumpProgress,
    damping: BOUNCE_SPRING.damping + longJumpProgress,
    mass: BOUNCE_SPRING.mass + 0.15 * longJumpProgress,
    path: arc({
      strength: Math.min(ARC_MAX_STRENGTH, ARC_MAX_BULGE / travel),
      // Relative to the direction of travel, so both directions bulge to the
      // screen left, away from the labels.
      direction: distance > 0 ? 'ccw' : 'cw',
    }),
  })

  previousIndex = selectedIndex.value
}

// Position is resolved after the commit that changed the selection, and again
// whenever the list reflows; the very first placement is instant.
watch(selectedIndex, () => {
  const shouldAnimate = hasPosition && previousIndex !== selectedIndex.value
  positionIndicator(shouldAnimate)
}, { flush: 'post', immediate: true })

let observer: ResizeObserver | undefined
onMounted(() => {
  positionIndicator(false)
  if (!list.value || typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(snapIndicator)
  observer.observe(list.value)
})
onBeforeUnmount(() => observer?.disconnect())

function selectItem(id: string, event?: Event) {
  const item = props.items.find(entry => entry.id === id)
  if (item?.disabled) {
    event?.preventDefault()
    return
  }
  if (value.value === undefined) internal.value = id
  value.value = id
  emit('valueChange', id)
}

const accessibleLabel = computed(() => props.ariaLabel ?? props.label ?? props.labels?.label ?? 'Sidebar navigation')
const dotStyle = { width: `${DOT_SIZE}px`, height: `${DOT_SIZE}px`, left: `${DOT_LEFT}px` } as const
</script>

<template>
  <nav :aria-label="accessibleLabel" class="bounce-sidebar" :class="className">
    <ul ref="list" class="bounce-list" :class="listClassName">
      <li v-if="selectedIndex >= 0" aria-hidden="true" role="presentation" class="bounce-indicator">
        <span ref="dot" class="bounce-dot" :class="indicatorClassName" :style="dotStyle" />
      </li>

      <li v-for="(item, index) in items" :key="item.id" :ref="element => setItemNode(item.id, element)" class="bounce-item">
        <a
          v-if="item.href"
          :href="item.href"
          :target="item.target"
          :rel="item.rel ?? (item.target === '_blank' ? 'noreferrer noopener' : undefined)"
          :aria-current="item.id === selectedValue ? 'page' : undefined"
          :aria-disabled="item.disabled || undefined"
          :data-active="item.id === selectedValue || undefined"
          :tabindex="item.disabled ? -1 : undefined"
          class="bounce-link"
          :class="[itemClassName, { 'is-active': item.id === selectedValue, 'is-disabled': item.disabled }]"
          @click="selectItem(item.id, $event)">
          <span v-if="item.icon || $slots.icon" aria-hidden="true" class="bounce-icon">
            <slot name="icon" :item="item" :index="index">{{ item.icon }}</slot>
          </span>
          <span><slot name="label" :item="item" :index="index">{{ item.label }}</slot></span>
        </a>
        <button
          v-else
          type="button"
          :disabled="item.disabled"
          :aria-current="item.id === selectedValue ? 'page' : undefined"
          :data-active="item.id === selectedValue || undefined"
          class="bounce-link"
          :class="[itemClassName, { 'is-active': item.id === selectedValue, 'is-disabled': item.disabled }]"
          @click="selectItem(item.id)">
          <span v-if="item.icon || $slots.icon" aria-hidden="true" class="bounce-icon">
            <slot name="icon" :item="item" :index="index">{{ item.icon }}</slot>
          </span>
          <span><slot name="label" :item="item" :index="index">{{ item.label }}</slot></span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.bounce-sidebar { position: relative; }
.bounce-list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: .375rem;
  padding: 0;
  padding-inline-start: 1.5rem;
  margin: 0;
  list-style: none;
}
.bounce-item { position: relative; }
.bounce-indicator { pointer-events: none; position: absolute; inset: 0; }

.bounce-dot {
  position: absolute;
  top: 0;
  display: block;
  border-radius: calc(infinity * 1px);
  background: var(--beui-primary);
}

.bounce-link {
  display: flex;
  align-items: center;
  gap: .5rem;
  width: 100%;
  min-height: 2.25rem;
  padding: 0 .5rem;
  border: 0;
  border-radius: .5rem;
  background: transparent;
  color: var(--beui-muted-foreground);
  font: inherit;
  font-size: .875rem;
  line-height: 1.25rem;
  font-weight: 500;
  text-align: left;
  text-decoration: none;
  outline: none;
  cursor: pointer;
  transition: color .15s cubic-bezier(.4, 0, .2, 1);
}
.bounce-link:hover { color: var(--beui-foreground); }
.bounce-link.is-active { color: var(--beui-foreground); }
.bounce-link.is-disabled { cursor: not-allowed; opacity: .4; }
.bounce-link:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
.bounce-icon { flex: none; display: grid; place-items: center; }
</style>
