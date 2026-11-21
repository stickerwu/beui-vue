<script lang="ts">
export type OverflowActionsSize = 'sm' | 'md'

export type OverflowActionItem = {
  id: string
  label: string
  icon?: string
  onClick?: () => void
  disabled?: boolean
  ariaLabel?: string
}

export type OverflowActionsClassNames = {
  root?: string
  track?: string
  action?: string
  primaryAction?: string
  overflowAction?: string
  toggle?: string
  icon?: string
  label?: string
}
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, useId, watch } from 'vue'
import { easeOut } from '../core/motion'
import { useMountedMedia } from '../core/mounted-media'
import { useOpenState } from '../primitives/state'
import { overflowActionsMessages } from './messages'
import OverflowActionButton from './OverflowActionButton.vue'

const props = withDefaults(defineProps<{
  primaryActions: readonly OverflowActionItem[]
  overflowActions: readonly OverflowActionItem[]
  expanded?: boolean
  defaultExpanded?: boolean
  collapseOnAction?: boolean
  /** Default `md`. */
  size?: OverflowActionsSize
  openLabel?: string
  closeLabel?: string
  /** Override any built-in string. */
  labels?: Partial<typeof overflowActionsMessages>
  className?: string
  classNames?: OverflowActionsClassNames
}>(), { expanded: undefined, defaultExpanded: false, collapseOnAction: false, size: 'md' })

const emit = defineEmits<{
  'update:expanded': [value: boolean]
  expandedChange: [value: boolean]
  action: [item: OverflowActionItem]
}>()

defineSlots<{
  /** Replaces an action's icon. */
  icon?(props: { item: OverflowActionItem }): unknown
}>()

// This needs a softer layout spring than the app defaults so the overflow group
// stays visually attached to the toggle while entering and leaving.
const SHELL_TRANSITION = { type: 'spring', stiffness: 220, damping: 17, mass: 0.85 } as const

const ICON_VARIANTS = {
  hidden: { opacity: 0, filter: 'blur(3px)' },
  visible: { opacity: 1, filter: 'blur(0px)', transition: { duration: 0.18, ease: easeOut } },
  exit: { opacity: 0, filter: 'blur(3px)', transition: { duration: 0.18, ease: easeOut } },
}

const reduceMotion = useReducedMotion()
const reduce = computed(() => Boolean(reduceMotion.value))
const canHover = useMountedMedia('(hover: hover) and (pointer: fine)')
const t = computed(() => ({ ...overflowActionsMessages, ...props.labels }))
const overflowId = `be-overflow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

const { open: isExpanded, setOpen: setExpanded } = useOpenState(
  () => props.expanded,
  props.defaultExpanded,
  next => { emit('update:expanded', next); emit('expandedChange', next) },
)

const transition = computed(() => (reduce.value ? { duration: 0 } : SHELL_TRANSITION))
const toggleLabel = computed(() => (isExpanded.value ? (props.closeLabel ?? t.value.close) : (props.openLabel ?? t.value.open)))

// The overflow group leaves with `popLayout`, which takes it out of flow. Pin it
// to the viewport position it held while open so it fades where it was instead
// of sliding along with the toggle.
let overflowNode: HTMLElement | null = null
let overflowLeft = 0
function setOverflowNode(element: unknown) {
  if (!element) return
  const node = (element as { $el?: unknown }).$el ?? element
  if (node instanceof HTMLElement) overflowNode = node
}

watch(isExpanded, expanded => {
  const node = overflowNode
  if (!node) return
  if (!expanded) {
    node.style.left = `${overflowLeft - node.getBoundingClientRect().left}px`
    return
  }
  node.style.left = ''
  overflowLeft = node.getBoundingClientRect().left
}, { flush: 'post' })
onBeforeUnmount(() => { overflowNode = null })

function handleAction(item: OverflowActionItem) {
  item.onClick?.()
  emit('action', item)
  if (props.collapseOnAction) setExpanded(false)
}

const actionClass = (extra?: string) => [props.classNames?.action, extra].filter(Boolean).join(' ')
</script>

<template>
  <motion.div layout :transition="transition" class="be-overflow" :class="[classNames?.root, className]">
    <motion.div layout :transition="transition" class="be-overflow-track" :class="[`is-${size}`, classNames?.track]">
      <motion.div layout :transition="transition" class="be-overflow-group" :class="`is-${size}`">
        <OverflowActionButton v-for="item in primaryActions" :key="item.id" :item="item" :size="size" :reduce="reduce" :can-hover="canHover"
          :layout-transition="transition" :class-name="actionClass(classNames?.primaryAction)"
          :icon-class-name="classNames?.icon" :label-class-name="classNames?.label" @action="handleAction">
          <template v-if="$slots.icon" #icon="slotProps"><slot name="icon" v-bind="slotProps" /></template>
        </OverflowActionButton>
      </motion.div>

      <AnimatePresence mode="popLayout" :initial="false">
        <motion.div v-if="isExpanded" :ref="setOverflowNode" key="overflow-actions" :id="overflowId" layout :aria-hidden="!isExpanded"
          :transition="transition" class="be-overflow-group be-overflow-extra" :class="`is-${size}`">
          <OverflowActionButton v-for="item in overflowActions" :key="item.id" :item="item" :size="size" :reduce="reduce" :can-hover="canHover"
            overflow :visible="isExpanded" :layout-transition="transition" :class-name="actionClass(classNames?.overflowAction)"
            :icon-class-name="classNames?.icon" :label-class-name="classNames?.label" @action="handleAction">
            <template v-if="$slots.icon" #icon="slotProps"><slot name="icon" v-bind="slotProps" /></template>
          </OverflowActionButton>
        </motion.div>
      </AnimatePresence>

      <motion.button
        type="button"
        layout
        class="be-overflow-toggle"
        :class="[`is-${size}`, classNames?.toggle]"
        :aria-expanded="isExpanded"
        :aria-controls="isExpanded ? overflowId : undefined"
        :aria-label="toggleLabel"
        :title="toggleLabel"
        :while-press="reduce ? undefined : { scale: 0.96 }"
        :while-hover="reduce || !canHover ? undefined : { scale: 1.03 }"
        :transition="transition"
        @click="setExpanded(!isExpanded)">
        <AnimatePresence mode="popLayout" :initial="false">
          <motion.span :key="isExpanded ? 'close' : 'open'" :variants="ICON_VARIANTS" :initial="reduce ? { opacity: 0 } : 'hidden'"
            :animate="reduce ? { opacity: 1 } : 'visible'" :exit="reduce ? { opacity: 0 } : 'exit'" class="be-overflow-toggle-icon">
            <svg v-if="isExpanded" viewBox="0 0 24 24" aria-hidden="true" :class="`is-${size}`"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true" :class="`is-${size}`"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </motion.div>
  </motion.div>
</template>

<style scoped>
.be-overflow { display: inline-flex; color: var(--beui-foreground); }
.be-overflow-track { position: relative; display: inline-flex; align-items: center; overflow: hidden; box-sizing: border-box; border: 1px solid var(--beui-border); border-radius: 9999px; background: var(--beui-card); }
.be-overflow-track.is-sm { gap: .25rem; padding: .25rem; font-size: .75rem; line-height: 1rem; }
.be-overflow-track.is-md { gap: .375rem; padding: .375rem; font-size: .875rem; line-height: 1.25rem; }
.be-overflow-group { display: inline-flex; align-items: center; }
.be-overflow-group.is-sm { gap: .25rem; }
.be-overflow-group.is-md { gap: .375rem; }
.be-overflow-extra { position: relative; width: max-content; }
.be-overflow-toggle { position: relative; display: inline-grid; flex: none; place-items: center; margin: 0; padding: 0; border: 0; border-radius: 9999px; background: var(--beui-primary); color: var(--beui-primary-foreground); cursor: pointer; outline: none; }
.be-overflow-toggle:disabled { pointer-events: none; opacity: .5; }
.be-overflow-toggle:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
.be-overflow-toggle.is-sm { width: 2rem; height: 2rem; }
.be-overflow-toggle.is-md { width: 2.25rem; height: 2.25rem; }
.be-overflow-toggle-icon { display: inline-grid; place-items: center; }
.be-overflow-toggle svg { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.be-overflow-toggle svg.is-sm { width: .875rem; height: .875rem; }
.be-overflow-toggle svg.is-md { width: 1rem; height: 1rem; }
</style>
