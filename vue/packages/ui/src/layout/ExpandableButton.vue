<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed, shallowRef, type VNode } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  /** Text revealed beside the icon when expanded. The `label` slot wins when both are set. */
  label?: string
  /** Controlled expanded state. Use `v-model:expanded`. */
  expanded?: boolean
  defaultExpanded?: boolean
  disabled?: boolean
  className?: string
}>(), { defaultExpanded: false, expanded: undefined })
const emit = defineEmits<{
  'update:expanded': [expanded: boolean]
  expandedChange: [expanded: boolean]
}>()
defineSlots<{
  /** Always-visible icon. */
  icon?: () => VNode[]
  /** Label revealed when expanded. */
  label?: () => VNode[]
}>()

const reduce = useReducedMotion()
const internal = shallowRef(props.defaultExpanded)
const isExpanded = computed(() => props.expanded ?? internal.value)

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
const transition = computed(() => (reduce.value ? { duration: 0 } : CONTINUITY_SPRING))
const labelVariants = computed(() => (reduce.value ? CONTINUITY_LABEL_REDUCED : CONTINUITY_LABEL))

// A caller's own `click` listener reaches the button through `$attrs`, ahead of
// this handler, so it can `preventDefault()` to veto the toggle like the original.
function toggle(event: MouseEvent) {
  if (event.defaultPrevented) return
  setExpanded(!isExpanded.value)
}
</script>

<template>
  <motion.span layout class="be-expandable" :transition="transition">
    <motion.button
      v-bind="$attrs"
      layout
      type="button"
      :aria-label="($attrs['aria-label'] as string | undefined) ?? props.label"
      :aria-expanded="isExpanded"
      :disabled="props.disabled"
      class="be-expandable-button"
      :class="props.className"
      :style="{ borderRadius: '9999px' }"
      :while-press="reduce || props.disabled ? undefined : { scale: 0.97 }"
      :transition="transition"
      @click="toggle"
    >
      <motion.span layout="position" class="be-expandable-icon" aria-hidden="true" :transition="transition"><slot name="icon" /></motion.span>
      <AnimatePresence mode="popLayout" :initial="false">
        <motion.span
          v-if="isExpanded"
          key="label"
          layout
          :variants="labelVariants"
          :initial="reduce ? { opacity: 0 } : 'hidden'"
          :animate="reduce ? { opacity: 1 } : 'visible'"
          :exit="reduce ? { opacity: 0 } : 'exit'"
          :transition="transition"
          class="be-expandable-label"
          aria-hidden="true"
        ><slot name="label">{{ props.label }}</slot></motion.span>
      </AnimatePresence>
    </motion.button>
  </motion.span>
</template>

<style scoped>
.be-expandable { display: inline-flex; }
.be-expandable-button { position: relative; display: inline-flex; box-sizing: border-box; height: 2.75rem; min-width: 2.75rem; align-items: center; padding: .25rem; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 9999px; background: transparent; color: var(--beui-foreground); font: inherit; font-size: .875rem; line-height: 1.25rem; font-weight: 500; outline: none; cursor: pointer; transition: color .15s cubic-bezier(.4, 0, .2, 1), background-color .15s cubic-bezier(.4, 0, .2, 1), border-color .15s cubic-bezier(.4, 0, .2, 1); }
.be-expandable-button:focus-visible { box-shadow: inset 0 0 0 2px var(--beui-ring); }
.be-expandable-button:disabled { opacity: .5; pointer-events: none; cursor: default; }
.be-expandable-icon { display: grid; height: 2.25rem; width: 2.25rem; flex: none; place-items: center; }
.be-expandable-icon :deep(svg) { display: block; width: 1rem; height: 1rem; }
.be-expandable-label { position: relative; display: inline-flex; width: max-content; align-items: center; padding-right: .75rem; white-space: nowrap; }
</style>
