<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, shallowRef, type VNode } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'

const props = withDefaults(defineProps<{
  /** Chip text. The `label` slot wins when both are set. */
  label?: string
  /** Accessible name of the trailing action. */
  actionLabel: string
  /** Collapse the chip and return focus to its label after the action runs. */
  collapseOnAction?: boolean
  disabled?: boolean
  /** Controlled expanded state. Use `v-model:expanded`. */
  expanded?: boolean
  defaultExpanded?: boolean
  className?: string
  labelClassName?: string
  actionClassName?: string
}>(), { collapseOnAction: true, defaultExpanded: false, expanded: undefined })
const emit = defineEmits<{
  /** Fires when the trailing action is activated. */
  action: [event: MouseEvent]
  'update:expanded': [expanded: boolean]
  expandedChange: [expanded: boolean]
}>()
defineSlots<{
  /** Chip text. */
  label?: () => VNode[]
  /** Icon of the trailing action. */
  actionIcon?: () => VNode[]
}>()

const reduce = useReducedMotion()
const internal = shallowRef(props.defaultExpanded)
const isExpanded = computed(() => props.expanded ?? internal.value)
// A ref on a motion component is the component instance, not its node.
let trigger: HTMLButtonElement | null = null
function setTrigger(element: unknown) {
  const node = element && typeof element === 'object' && '$el' in element ? (element as { $el: unknown }).$el : element
  trigger = node instanceof HTMLButtonElement ? node : null
}

function setExpanded(next: boolean) {
  if (props.expanded === undefined) internal.value = next
  emit('update:expanded', next)
  emit('expandedChange', next)
}

function runAction(event: MouseEvent) {
  emit('action', event)
  if (!props.collapseOnAction) return
  setExpanded(false)
  trigger?.focus()
}

// Matches the Motion Patterns "Layout continuity" recipe so the surface
// keeps its identity while its footprint changes.
const CONTINUITY_SPRING = { type: 'spring', stiffness: 220, damping: 17, mass: 0.85 } as const
const CONTINUITY_LABEL = {
  hidden: { opacity: 0, filter: 'blur(4px)' },
  visible: { opacity: 1, filter: 'blur(0px)' },
} as const
const transition = computed(() => (reduce.value ? { duration: 0 } : CONTINUITY_SPRING))
</script>

<template>
  <motion.span layout class="be-expandable" :transition="transition">
    <motion.div layout class="be-expandable-chip" :class="props.className" :style="{ borderRadius: '9999px' }" :transition="transition">
      <motion.button
        :ref="setTrigger"
        layout="position"
        type="button"
        :aria-expanded="isExpanded"
        :disabled="props.disabled"
        class="be-expandable-chip-trigger"
        :class="props.labelClassName"
        :data-expanded="isExpanded"
        :transition="transition"
        @click="setExpanded(!isExpanded)"
      ><slot name="label">{{ props.label }}</slot></motion.button>
      <motion.span
        :variants="CONTINUITY_LABEL"
        class="be-expandable-action"
        :data-expanded="isExpanded"
        :aria-hidden="!isExpanded"
        :initial="false"
        :animate="reduce ? { opacity: isExpanded ? 1 : 0, filter: 'blur(0px)' } : isExpanded ? 'visible' : 'hidden'"
        :transition="transition"
      >
        <motion.button
          type="button"
          :aria-label="props.actionLabel"
          :disabled="props.disabled || !isExpanded"
          class="be-expandable-action-button"
          :class="[props.actionClassName, { 'is-disabled': props.disabled }]"
          :while-press="reduce || props.disabled ? undefined : { scale: 0.97 }"
          :transition="transition"
          @click="runAction"
        >
          <span aria-hidden="true"><slot name="actionIcon" /></span>
        </motion.button>
      </motion.span>
    </motion.div>
  </motion.span>
</template>

<style scoped>
.be-expandable { display: inline-flex; }
.be-expandable-chip { display: inline-flex; box-sizing: border-box; height: 2.5rem; align-items: center; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 9999px; background: transparent; color: var(--beui-foreground); font-size: .875rem; line-height: 1.25rem; }
.be-expandable-chip:has(:focus-visible) { box-shadow: inset 0 0 0 2px var(--beui-ring); }
.be-expandable-chip-trigger { height: 100%; padding: 0 .75rem; border: 0; background: none; color: inherit; font: inherit; font-size: .875rem; line-height: 1.25rem; font-weight: 500; white-space: nowrap; outline: none; cursor: pointer; }
.be-expandable-chip-trigger[data-expanded=true] { padding-right: .25rem; }
.be-expandable-chip-trigger:disabled { opacity: .5; pointer-events: none; cursor: default; }
.be-expandable-action { position: relative; display: inline-flex; height: 2.5rem; width: 0; flex: none; align-items: center; overflow: hidden; }
.be-expandable-action[data-expanded=true] { width: 2rem; }
.be-expandable-action-button { display: flex; height: 2.5rem; width: 2rem; flex: none; align-items: center; justify-content: center; border: 0; border-radius: 9999px; background: none; color: var(--beui-muted-foreground); font: inherit; outline: none; cursor: pointer; transition: color .15s cubic-bezier(.4, 0, .2, 1); }
.be-expandable-action-button:hover { color: var(--beui-foreground); }
.be-expandable-action-button:disabled { pointer-events: none; cursor: default; }
.be-expandable-action-button.is-disabled { opacity: .5; }
.be-expandable-action-button :deep(svg) { display: block; width: .875rem; height: .875rem; }
</style>
