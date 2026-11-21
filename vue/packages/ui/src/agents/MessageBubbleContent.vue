<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, inject, provide, shallowRef, useId } from 'vue'
import { layoutSpring, easeOut } from '../core/motion'
import { bubbleKey, bubbleLayoutKey, type MessageBubbleVariant } from './MessageBubble.vue'

const props = withDefaults(defineProps<{
  /** Replaces the content element while preserving bubble styling. */
  render?: string | object
  className?: string
}>(), { render: 'div' })

const reduce = useReducedMotion()
const context = inject(bubbleKey, undefined)
const variant = computed<MessageBubbleVariant>(() => context?.variant.value ?? 'soft')
const align = computed(() => context?.align.value ?? 'start')
const animateIn = computed(() => context?.animateIn.value ?? false)
const id = useId()

// The surface grows with the text, so announce a fresh layout measurement when
// the content mounts (the collapsible shows only a clamped slice at first).
const layoutVersion = shallowRef(0)
provide(bubbleLayoutKey, () => { layoutVersion.value += 1 })
const interactive = computed(() => props.render === 'button' || props.render === 'a')

const BUBBLE_CONTENT_REVEAL = { duration: .12, ease: easeOut, delay: .04 } as const
// Sent bubbles should pop into place quickly with one restrained overshoot.
const BUBBLE_POP = { type: 'spring', stiffness: 520, damping: 27, mass: .52 } as const
</script>

<template>
  <component
    :is="render"
    :id="id"
    data-slot="message-bubble-content"
    class="be-bubble-content"
    :class="[className, `be-bubble-content-${variant}`, { 'be-bubble-content-interactive': interactive }]"
  >
    <motion.span
      v-if="variant !== 'ghost'"
      aria-hidden="true"
      class="be-bubble-surface"
      :class="[`be-bubble-surface-${align}`, `be-bubble-surface-${variant}`]"
      :layout="reduce ? false : 'size'"
      :layout-dependency="layoutVersion"
      :initial="animateIn && !reduce ? { opacity: 0, scale: .92 } : false"
      :animate="{ opacity: 1, scale: 1 }"
      :transition="reduce ? { duration: 0 } : { opacity: { duration: .12, ease: easeOut }, scale: BUBBLE_POP, layout: layoutSpring }"
    />
    <motion.div
      class="be-bubble-inner"
      :initial="animateIn ? { opacity: 0 } : false"
      :animate="{ opacity: 1 }"
      :transition="reduce ? { duration: .12, ease: easeOut } : BUBBLE_CONTENT_REVEAL"
    >
      <slot />
    </motion.div>
  </component>
</template>

<style>
.be-bubble-content {
  position: relative; z-index: 0; box-sizing: border-box; min-width: 2.25rem; max-width: 82%;
  border-radius: 1rem; padding: .625rem .875rem; color: var(--beui-foreground);
  font-size: .875rem; line-height: 1.5rem; outline: none; overflow-wrap: anywhere;
}
/* Markdown-ish content inside a bubble. */
.be-bubble-content a { font-weight: 500; text-decoration: underline; text-underline-offset: 4px; }
.be-bubble-content code {
  border-radius: .25rem; background: color-mix(in srgb, var(--beui-background) 60%, transparent);
  padding: .125rem .25rem; font-family: var(--beui-font-mono, ui-monospace, monospace); font-size: .9em;
}
.be-bubble-content :is(ol, ul) { margin-block: .5rem; padding-inline-start: 1.25rem; }
.be-bubble-content ol { list-style: decimal; }
.be-bubble-content ul { list-style: disc; }
.be-bubble-content pre {
  margin-block: .5rem; overflow-x: auto; border-radius: .75rem;
  background: color-mix(in srgb, var(--beui-background) 60%, transparent); padding: .75rem;
}
.be-bubble-content p { margin: 0; color: inherit; font-size: inherit; line-height: inherit; }
.be-bubble-content p + p { margin-top: .5rem; }

.be-bubble-content-solid { color: var(--beui-background); }
.be-bubble-content-ghost { width: 100%; max-width: none; border-radius: 0; padding: 0; }
.be-bubble-content-danger { color: var(--beui-destructive); }
.be-bubble-content-interactive {
  cursor: pointer; text-align: left;
  transition: background-color .15s, color .15s, transform .15s;
}
.be-bubble-content-interactive:hover { filter: brightness(.98); }
.be-bubble-content-interactive:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-bubble-content-interactive:active { transform: scale(.99); }

/* The surface is a separate layer so it can resize and pop independently of
   the text, which keeps the bubble tail smooth while content streams in. */
.be-bubble-surface {
  pointer-events: none; position: absolute; inset: 0; z-index: -1;
  border-radius: inherit; background: var(--beui-muted);
}
.be-bubble-surface-end { transform-origin: bottom right; }
.be-bubble-surface-start { transform-origin: bottom left; }
.be-bubble-surface-solid { background: var(--beui-foreground); }
.be-bubble-surface-outline { border: 1px solid color-mix(in srgb, var(--beui-border) 70%, transparent); background: var(--beui-background); }
.be-bubble-surface-danger { background: color-mix(in srgb, var(--beui-destructive) 10%, transparent); }
.be-bubble-inner { position: relative; }
</style>
