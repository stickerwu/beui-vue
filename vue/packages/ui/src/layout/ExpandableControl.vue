<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, shallowRef } from 'vue'

// Read props through the object rather than destructuring: Vue only skips
// Boolean casting for an absent `expanded` when the declaration is plain, and
// a cast `false` would make the chip think it is controlled and never open.
const props = withDefaults(defineProps<{
  /** `button` grows from an icon to an icon + label; `chip` reveals a trailing action. */
  variant?: 'button' | 'chip'
  label: string
  /** Accessible name of the chip's trailing action. */
  actionLabel?: string
  disabled?: boolean
  /** Controlled expanded state. */
  expanded?: boolean
  defaultExpanded?: boolean
  /** Collapse the chip and return focus to its label after the action runs. */
  collapseOnAction?: boolean
}>(), { variant: 'button', defaultExpanded: false, collapseOnAction: true, expanded: undefined })
const emit = defineEmits<{
  activate: [event: MouseEvent]
  remove: [event: MouseEvent]
  'update:expanded': [expanded: boolean]
  expandedChange: [expanded: boolean]
}>()
defineSlots<{ icon?: () => unknown; actionIcon?: () => unknown }>()

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

// Matches the Motion Patterns "Layout continuity" recipe so the surface
// keeps its identity while its footprint changes.
const CONTINUITY_SPRING = { type: 'spring', stiffness: 220, damping: 17, mass: 0.85 } as const
const CONTINUITY_LABEL = {
  hidden: { opacity: 0, filter: 'blur(4px)' },
  visible: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(4px)' },
} as const
const CONTINUITY_LABEL_REDUCED = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
} as const
const instant = { duration: 0 } as const

const transition = computed(() => (reduce.value ? instant : CONTINUITY_SPRING))
const labelVariants = computed(() => (reduce.value ? CONTINUITY_LABEL_REDUCED : CONTINUITY_LABEL))

function activate(event: MouseEvent) {
  emit('activate', event)
  if (event.defaultPrevented) return
  setExpanded(!isExpanded.value)
}

function runAction(event: MouseEvent) {
  emit('remove', event)
  if (!props.collapseOnAction) return
  setExpanded(false)
  trigger?.focus()
}
</script>

<template>
  <motion.span layout class="be-expandable" :transition="transition">
    <motion.button v-if="props.variant === 'button'" :ref="setTrigger" layout type="button" :aria-label="props.label" :aria-expanded="isExpanded" :disabled="props.disabled"
      class="be-expandable-button" :while-press="reduce || props.disabled ? undefined : { scale: 0.97 }"
      :transition="transition" @click="activate">
      <motion.span layout="position" class="be-expandable-icon" aria-hidden="true" :transition="transition"><slot name="icon">＋</slot></motion.span>
      <AnimatePresence mode="popLayout" :initial="false">
        <motion.span v-if="isExpanded" key="label" layout :variants="labelVariants" initial="hidden" animate="visible" exit="exit"
          :transition="transition" class="be-expandable-label" aria-hidden="true">{{ props.label }}</motion.span>
      </AnimatePresence>
    </motion.button>

    <motion.div v-else layout class="be-expandable-chip" :transition="transition">
      <motion.button :ref="setTrigger" layout="position" type="button" :aria-expanded="isExpanded" :disabled="props.disabled"
        class="be-expandable-chip-trigger" :data-expanded="isExpanded" :transition="transition" @click="setExpanded(!isExpanded)">
        {{ props.label }}
      </motion.button>
      <motion.span :variants="labelVariants" class="be-expandable-action" :data-expanded="isExpanded"
        :aria-hidden="!isExpanded" :initial="false" :animate="isExpanded ? 'visible' : 'hidden'" :transition="transition">
        <motion.button type="button" :aria-label="props.actionLabel ?? `Remove ${props.label}`" :disabled="props.disabled || !isExpanded"
          class="be-expandable-action-button" :while-press="reduce || props.disabled ? undefined : { scale: 0.97 }"
          :transition="transition" @click="runAction">
          <span aria-hidden="true"><slot name="actionIcon">×</slot></span>
        </motion.button>
      </motion.span>
    </motion.div>
  </motion.span>
</template>

<style scoped>
.be-expandable { display: inline-flex; }
.be-expandable-button { position: relative; display: inline-flex; box-sizing: border-box; height: 2.75rem; min-width: 2.75rem; align-items: center; padding: .25rem; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 9999px; background: transparent; color: var(--beui-foreground); font: inherit; font-size: .875rem; font-weight: 500; outline: none; cursor: pointer; }
.be-expandable-button:focus-visible { box-shadow: inset 0 0 0 2px var(--beui-ring); }
.be-expandable-button:disabled { opacity: .5; pointer-events: none; }
.be-expandable-icon { display: grid; height: 2.25rem; width: 2.25rem; flex: none; place-items: center; }
.be-expandable-icon :deep(svg) { width: 1rem; height: 1rem; }
.be-expandable-label { position: relative; display: inline-flex; width: max-content; align-items: center; padding-right: .75rem; white-space: nowrap; }
.be-expandable-chip { display: inline-flex; box-sizing: border-box; height: 2.5rem; align-items: center; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 9999px; background: transparent; color: var(--beui-foreground); font-size: .875rem; }
.be-expandable-chip:has(:focus-visible) { box-shadow: inset 0 0 0 2px var(--beui-ring); }
.be-expandable-chip-trigger { height: 100%; padding: 0 .75rem; border: 0; background: none; color: inherit; font: inherit; font-weight: 500; white-space: nowrap; outline: none; cursor: pointer; }
.be-expandable-chip-trigger[data-expanded=true] { padding-right: .25rem; }
.be-expandable-chip-trigger:disabled { opacity: .5; pointer-events: none; }
.be-expandable-action { position: relative; display: inline-flex; height: 2.5rem; width: 0; flex: none; align-items: center; overflow: hidden; }
.be-expandable-action[data-expanded=true] { width: 2rem; }
.be-expandable-action-button { display: flex; height: 2.5rem; width: 2rem; flex: none; align-items: center; justify-content: center; border: 0; border-radius: 9999px; background: none; color: var(--beui-muted-foreground); outline: none; cursor: pointer; }
.be-expandable-action-button:hover { color: var(--beui-foreground); }
.be-expandable-action-button:disabled { pointer-events: none; }
.be-expandable-action-button :deep(svg) { width: .875rem; height: .875rem; }
</style>
