<script setup lang="ts">
import { motion } from 'motion-v'
import type { OverflowActionItem, OverflowActionsSize } from './OverflowActions.vue'

/** One pill of the action rail. Only used by `OverflowActions`. */
defineProps<{
  item: OverflowActionItem
  size: OverflowActionsSize
  reduce: boolean
  canHover: boolean
  overflow?: boolean
  visible?: boolean
  layoutTransition: object
  className?: string
  iconClassName?: string
  labelClassName?: string
}>()

const emit = defineEmits<{ action: [item: OverflowActionItem] }>()
defineSlots<{ icon?(props: { item: OverflowActionItem }): unknown }>()

const OVERFLOW_ACTION_VARIANTS = {
  hidden: { opacity: 0, filter: 'blur(4px)' },
  visible: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(4px)' },
}
</script>

<template>
  <motion.span
    layout="position"
    :variants="overflow ? OVERFLOW_ACTION_VARIANTS : undefined"
    :initial="overflow ? (reduce ? { opacity: 0 } : 'hidden') : undefined"
    :animate="overflow ? (reduce ? { opacity: 1 } : 'visible') : undefined"
    :exit="overflow ? (reduce ? { opacity: 0 } : 'exit') : undefined"
    :while-press="reduce || item.disabled ? undefined : { scale: 0.97 }"
    :while-hover="reduce || !canHover || item.disabled ? undefined : { scale: 1.008 }"
    :transition="layoutTransition"
    class="be-overflow-cell">
    <button
      type="button"
      :disabled="item.disabled"
      :aria-label="item.ariaLabel"
      :tabindex="overflow && !visible ? -1 : undefined"
      :title="item.label"
      class="be-overflow-action"
      :class="[`is-${size}`, className]"
      @click="emit('action', item)">
      <span v-if="item.icon || $slots.icon" class="be-overflow-icon" :class="[`is-${size}`, iconClassName]">
        <slot name="icon" :item="item">{{ item.icon }}</slot>
      </span>
      <span class="be-overflow-label" :class="labelClassName">{{ item.label }}</span>
    </button>
  </motion.span>
</template>

<style scoped>
.be-overflow-cell { display: inline-flex; flex: none; }
.be-overflow-action { display: inline-flex; flex: none; align-items: center; justify-content: center; box-sizing: border-box; margin: 0; padding: 0; border: 0; border-radius: 9999px; background: var(--beui-background); color: var(--beui-foreground); font: inherit; font-weight: 500; line-height: inherit; cursor: pointer; outline: none; }
.be-overflow-action:disabled { pointer-events: none; opacity: .45; }
.be-overflow-action:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
.be-overflow-action.is-sm { height: 2rem; min-width: 2rem; gap: .375rem; padding-inline: .75rem; }
.be-overflow-action.is-md { height: 2.25rem; min-width: 2.25rem; gap: .5rem; padding-inline: .875rem; }
.be-overflow-icon { display: inline-flex; flex: none; align-items: center; justify-content: center; }
.be-overflow-icon.is-sm { width: .875rem; height: .875rem; }
.be-overflow-icon.is-md { width: 1rem; height: 1rem; }
.be-overflow-label { white-space: nowrap; }
</style>
