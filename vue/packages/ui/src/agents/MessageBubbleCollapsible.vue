<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, inject, useId } from 'vue'
import { useOpenState } from '../primitives/state'
import { swapSpring } from '../core/motion'
import { bubbleKey, bubbleLayoutKey, messageBubbleMessages } from './MessageBubble.vue'

const props = withDefaults(defineProps<{
  open?: boolean
  defaultOpen?: boolean
  collapsedLines?: 2 | 3 | 4 | 5 | 6
  /** Replaces the default "Show more" text. */
  moreLabel?: string
  /** Replaces the default "Show less" text. */
  lessLabel?: string
  contentClassName?: string
  triggerClassName?: string
  className?: string
  /** Override any built-in string. */
  labels?: Partial<typeof messageBubbleMessages>
}>(), { open: undefined, defaultOpen: false, collapsedLines: 4 })

const emit = defineEmits<{
  'update:open': [value: boolean]
  openChange: [value: boolean]
}>()

const reduce = useReducedMotion()
const contentId = useId()
const context = inject(bubbleKey, undefined)
const labels = computed(() => ({ ...messageBubbleMessages, ...context?.labels.value, ...props.labels }))
const notifyLayout = inject(bubbleLayoutKey, () => {})
const { open: current, setOpen: set } = useOpenState(() => props.open, props.defaultOpen, next => {
  notifyLayout()
  emit('update:open', next)
  emit('openChange', next)
})
</script>

<template>
  <div data-slot="message-bubble-collapsible" :data-state="current ? 'open' : 'closed'" class="be-collapsible" :class="className">
    <div
      :id="contentId"
      class="be-collapsible-content"
      :class="[contentClassName, { 'be-collapsible-clamped': !current }]"
      :style="{ '--be-collapsible-lines': collapsedLines }"
    >
      <slot />
    </div>
    <button
      type="button"
      :aria-expanded="current"
      :aria-controls="contentId"
      class="be-collapsible-trigger"
      :class="triggerClassName"
      @click="set(!current)"
    >
      <span>{{ current ? (lessLabel ?? labels.showLess) : (moreLabel ?? labels.showMore) }}</span>
      <motion.span
        aria-hidden="true"
        class="be-collapsible-chevron"
        :animate="{ rotate: current ? 180 : 0 }"
        :transition="reduce ? { duration: 0 } : swapSpring"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </motion.span>
    </button>
  </div>
</template>

<style>
.be-collapsible { width: 100%; }
.be-collapsible-content { transition: mask-image .2s; }
.be-collapsible-clamped {
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: var(--be-collapsible-lines, 4);
  overflow: hidden;
  mask-image: linear-gradient(to bottom, #000 68%, transparent 100%);
}
.be-collapsible-trigger {
  display: inline-flex; align-items: center; gap: .25rem; height: 1.75rem; margin-top: .5rem;
  border: 0; border-radius: 999px; padding-inline: .5rem; background: transparent;
  color: var(--beui-muted-foreground); font: inherit; font-size: .75rem; line-height: 1rem; font-weight: 500;
  cursor: pointer; outline: none; transition: background-color .15s, color .15s;
}
.be-collapsible-trigger:is(:hover, :focus-visible) { background: var(--beui-muted); color: var(--beui-foreground); }
.be-collapsible-trigger:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-collapsible-chevron { display: inline-grid; place-items: center; }
.be-collapsible-chevron svg { width: .875rem; height: .875rem; }
</style>
