<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, reactive, shallowRef, useId, watch } from 'vue'
import { easeOut } from '../core/motion'

interface Item { id: string; title: string; description?: string; disabled?: boolean; icon?: string }

const { items, collapsible = true, classNames } = defineProps<{
  items: readonly Item[]
  /** Allow closing the open row by activating it again. */
  collapsible?: boolean
  classNames?: { root?: string; item?: string; trigger?: string; icon?: string; title?: string; chevron?: string; content?: string; description?: string }
}>()
const active = defineModel<string | null>({ default: null })
defineSlots<{ default?: (props: { item: Item }) => unknown, icon?: (props: { item: Item }) => unknown }>()
const reduce = useReducedMotion()
const uid = useId()

// Local springs keep the accordion's connected groups moving together while
// avoiding scale projection on text-heavy row contents.
// Gap spring: must not overshoot y — positive y overshoot drifts items below
// their mt-3 resting point and briefly overlaps the next item.
const ROW_TRANSITION = { type: 'spring', duration: 0.55, bounce: 0.38 } as const
const CONTENT_OPEN_TRANSITION = { type: 'spring', duration: 0.58, bounce: 0.32 } as const
// The card, its panel and the rows below all share this one curve on close,
// so they bounce together. When the rows sprang on a different curve than the
// card, the next row overshot into the collapsed card, which read as a stutter.
const CLOSE_TRANSITION = { type: 'spring', duration: 0.55, bounce: 0.38 } as const
const DESCRIPTION_TRANSITION = { duration: 0.18, ease: easeOut } as const
const CHEVRON_TRANSITION = { type: 'spring', duration: 0.42, bounce: 0.28 } as const
const instant = { duration: 0 } as const

// The item that closed in the latest change, tracked before the render so the
// rows that move because of it pick the close curve in the same commit.
const closedId = shallowRef<string | null>(null)
watch(active, (next, previous) => {
  if (previous !== next) closedId.value = previous
}, { flush: 'sync' })

const activeIndex = computed(() => items.findIndex(item => item.id === active.value))
const closedIndex = computed(() => items.findIndex(item => item.id === closedId.value))

// Panel heights, measured from the content the rows render and kept live so a
// reflowing description keeps the open panel the right size.
const heights = reactive<Record<string, number>>({})
const observers = new Map<string, ResizeObserver>()
function bindContent(id: string, element: Element | { $el?: unknown } | null) {
  observers.get(id)?.disconnect()
  observers.delete(id)
  // A ref on a motion component resolves to its instance, not its node.
  const node = element && '$el' in element ? element.$el : element
  if (!(node instanceof HTMLElement)) return
  const measure = () => { heights[id] = node.offsetHeight }
  measure()
  const observer = new ResizeObserver(measure)
  observer.observe(node)
  observers.set(id, observer)
}

function toggle(id: string) {
  if (active.value === id) {
    if (collapsible) active.value = null
    return
  }
  active.value = id
}

function geometry(index: number) {
  const open = active.value === items[index]!.id
  const previousIsOpen = activeIndex.value === index - 1
  const nextIsOpen = activeIndex.value === index + 1
  return {
    open,
    startsGroup: open || index === 0 || previousIsOpen,
    endsGroup: open || index === items.length - 1 || nextIsOpen,
    separatedFromPrevious: index > 0 && (open || previousIsOpen),
    // Rows at or below a closing item move with it, on its curve.
    closing: closedIndex.value !== -1 && index >= closedIndex.value,
  }
}

function panelHeight(item: Item, open: boolean) {
  if (!item.description) return 0
  if (!open) return 1
  // Closed at 1px, not 0: a layout animation scales from the old size to the
  // new one, and a 0px target has no finite scale, so the panel would snap
  // shut instead of animating.
  return heights[item.id] || 'auto'
}

// Accordion keyboard support beyond plain tab order: move between headers.
function keys(event: KeyboardEvent, index: number) {
  const disabled = items.map((item, position) => (item.disabled ? position : -1)).filter(position => position >= 0)
  const order = items.map((_, position) => position).filter(position => !disabled.includes(position))
  if (!order.length) return
  const current = order.indexOf(index)
  if (current < 0) return
  const target =
    event.key === 'ArrowDown' ? order[(current + 1) % order.length]
      : event.key === 'ArrowUp' ? order[(current - 1 + order.length) % order.length]
        : event.key === 'Home' ? order[0]
          : event.key === 'End' ? order[order.length - 1]
            : undefined
  if (target === undefined) return
  event.preventDefault()
  const buttons = (event.currentTarget as HTMLElement).closest('[data-bouncy-accordion]')?.querySelectorAll<HTMLButtonElement>('[data-bouncy-trigger]')
  buttons?.[target]?.focus()
}
</script>

<template>
  <div data-bouncy-accordion class="be-accordion" :class="classNames?.root">
    <motion.div v-for="(item, index) in items" :key="item.id" layout="position" :initial="false"
      :style="{ marginTop: geometry(index).separatedFromPrevious ? 12 : 0 }"
      :transition="reduce ? instant : geometry(index).closing ? CLOSE_TRANSITION : ROW_TRANSITION">
      <motion.div
        :layout="!reduce"
        :data-state="geometry(index).open ? 'open' : 'closed'"
        :initial="false"
        :animate="{
          borderTopLeftRadius: geometry(index).startsGroup ? 28 : 0,
          borderTopRightRadius: geometry(index).startsGroup ? 28 : 0,
          borderBottomLeftRadius: geometry(index).endsGroup ? 28 : 0,
          borderBottomRightRadius: geometry(index).endsGroup ? 28 : 0,
        }"
        :transition="reduce ? instant : { ...ROW_TRANSITION, layout: geometry(index).open ? CONTENT_OPEN_TRANSITION : CLOSE_TRANSITION }"
        class="be-accordion-card" :class="[classNames?.item, item.disabled && 'be-accordion-disabled']">
        <motion.button :layout="!reduce" :transition="reduce ? instant : { layout: geometry(index).open ? CONTENT_OPEN_TRANSITION : CLOSE_TRANSITION }"
          data-bouncy-trigger :id="`${uid}-${item.id}-trigger`" type="button" :disabled="item.disabled"
          :aria-expanded="geometry(index).open" :aria-controls="`${uid}-${item.id}-content`" class="be-accordion-trigger" :class="classNames?.trigger"
          @click="toggle(item.id)" @keydown="keys($event, index)">
          <span v-if="item.icon || $slots.icon" class="be-accordion-icon" :class="classNames?.icon" aria-hidden="true"><slot name="icon" :item="item">{{ item.icon }}</slot></span>
          <span class="be-accordion-title" :class="classNames?.title">{{ item.title }}</span>
          <motion.span aria-hidden="true" class="be-accordion-chevron" :class="classNames?.chevron"
            :animate="{ rotate: geometry(index).open ? 180 : 0 }" :transition="reduce ? instant : CHEVRON_TRANSITION" :initial="false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </motion.span>
        </motion.button>
        <motion.section :layout="!reduce" :id="`${uid}-${item.id}-content`" :aria-labelledby="`${uid}-${item.id}-trigger`"
          :aria-hidden="!geometry(index).open" :inert="!geometry(index).open" :initial="false"
          :style="{ height: panelHeight(item, geometry(index).open), originY: 0 }"
          :transition="reduce ? instant : geometry(index).open ? CONTENT_OPEN_TRANSITION : CLOSE_TRANSITION"
          class="be-accordion-panel" :class="classNames?.content">
          <motion.div :ref="element => bindContent(item.id, element)"
            :layout="!reduce" :initial="false" :animate="{ opacity: geometry(index).open ? 1 : 0 }"
            :transition="reduce ? instant : { ...DESCRIPTION_TRANSITION, layout: geometry(index).open ? CONTENT_OPEN_TRANSITION : CLOSE_TRANSITION }"
            class="be-accordion-body">
            <div class="be-accordion-description" :class="classNames?.description">
              <slot :item="item">{{ item.description }}</slot>
            </div>
          </motion.div>
        </motion.section>
      </motion.div>
    </motion.div>
  </div>
</template>

<style scoped>
.be-accordion { width: 100%; }
.be-accordion-card { overflow: hidden; background: var(--beui-card); color: var(--beui-foreground); }
.be-accordion-disabled { opacity: .5; }
.be-accordion-trigger { display: flex; box-sizing: border-box; width: 100%; min-height: 54px; align-items: center; gap: 1rem; padding: .5rem 1.25rem; border: 0; background: none; color: inherit; font: inherit; text-align: start; cursor: pointer; }
.be-accordion-trigger:focus-visible { outline: none; background: color-mix(in srgb, var(--beui-card) 75%, var(--beui-foreground) 6%); }
.be-accordion-trigger:disabled { pointer-events: none; }
.be-accordion-icon { display: grid; height: 1.75rem; width: 1.75rem; flex: none; place-items: center; color: var(--beui-muted-foreground); }
.be-accordion-title { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; font-weight: 500; color: var(--beui-foreground); }
.be-accordion-chevron { display: grid; height: 1.5rem; width: 1.5rem; flex: none; place-items: center; color: var(--beui-muted-foreground); }
.be-accordion-chevron svg { width: 1rem; height: 1rem; }
.be-accordion-panel { overflow: hidden; }
.be-accordion-body { padding: 0 1.25rem 1.25rem; }
.be-accordion-description { font-size: 15px; line-height: 1.5rem; color: var(--beui-muted-foreground); }
</style>
