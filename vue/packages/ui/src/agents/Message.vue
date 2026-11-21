<script lang="ts">
/** English defaults for `Message`. Override per instance with `labels`. */
export const messageMessages = {
  user: 'user message',
  assistant: 'assistant message',
  typing: 'Responding',
}
export type MessageMessages = typeof messageMessages
</script>

<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, provide } from 'vue'
import { sideKey, type Labels } from './shared'

const props = withDefaults(defineProps<{
  from: 'user' | 'assistant'
  /** Plays a trailing-edge pop-up once when this message row mounts. */
  animateIn?: boolean
  /** Override any built-in string. */
  labels?: Labels
  className?: string
}>(), { animateIn: false })

const reduce = useReducedMotion()
const text = computed(() => ({ ...messageMessages, ...props.labels }))
provide(sideKey, computed(() => (props.from === 'user' ? 'end' : 'start')))

// A sent row should rise from the live edge without changing measured layout.
const MESSAGE_POP_UP = { type: 'spring', stiffness: 480, damping: 32, mass: 0.62 } as const

const pop = computed(() => props.animateIn && !reduce.value)
const initial = computed(() => (pop.value ? { opacity: 0, transform: 'translateY(8px) scale(0.95)' } : false))
const animate = computed(() => (pop.value ? { opacity: 1, transform: 'translateY(0px) scale(1)' } : { opacity: 1 }))
</script>

<template>
  <motion.article
    data-slot="message"
    :data-from="from"
    :aria-label="text[from]"
    :initial="initial"
    :animate="animate"
    :exit="reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-3px) scale(0.99)' }"
    :transition="reduce ? { duration: .12 } : MESSAGE_POP_UP"
    class="be-message"
    :class="className"
    :style="{ transformOrigin: from === 'user' ? '100% 100%' : '0% 100%' }"
  >
    <slot />
  </motion.article>
</template>

<style>
.be-message { display: flex; align-items: flex-start; gap: .5rem; width: 100%; color: var(--beui-foreground); }
.be-message[data-from=user] { flex-direction: row-reverse; }
.be-message-group, .be-message-bubble-group { display: flex; flex-direction: column; width: 100%; gap: .375rem; }
.be-message-group[data-spacing=default] { gap: 1rem; }
.be-message-bubble-group[data-spacing=default] { gap: .75rem; }
.be-message-avatar {
  display: grid; flex: none; place-items: center; width: 1.75rem; height: 1.75rem;
  overflow: hidden; border-radius: 50%; background: var(--beui-muted);
  color: var(--beui-muted-foreground); font-size: .75rem; font-weight: 500;
}
.be-message-avatar[aria-hidden=true] { visibility: hidden; }
.be-message-avatar img { width: 100%; height: 100%; object-fit: cover; }
.be-message-avatar svg { width: .875rem; height: .875rem; }
.be-message-content { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: .375rem; }
.be-message-content[data-align=end] { align-items: flex-end; }
.be-message-header {
  display: flex; align-items: center; gap: .375rem; padding-inline: .25rem;
  color: var(--beui-muted-foreground); font-size: 11px; line-height: 1;
}
.be-message-footer {
  display: flex; align-items: center; gap: .25rem; min-height: 1.25rem; padding-inline: .25rem;
  color: var(--beui-muted-foreground); font-size: 11px;
}
.be-message-header[data-align=end], .be-message-footer[data-align=end] { justify-content: flex-end; }
.be-message-marker {
  display: flex; align-items: center; gap: .375rem; width: fit-content; max-width: 88%;
  margin-inline: auto; padding: .25rem .625rem; border-radius: 999px;
  background: color-mix(in srgb, var(--beui-muted) 70%, transparent);
  color: var(--beui-muted-foreground); font-size: .75rem; text-align: center;
}
.be-message-typing { display: inline-flex; align-items: center; gap: .25rem; height: 1.25rem; }
.be-message-typing span[aria-hidden=true] {
  display: block; width: .25rem; height: .25rem; border-radius: 50%;
  background: currentColor; animation: be-typing 1.05s cubic-bezier(.16, 1, .3, 1) infinite both;
}
.be-message-typing .be-sr-only {
  position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap;
}
@keyframes be-typing {
  0%, 100% { opacity: .28; transform: translateY(0); }
  50% { opacity: .85; transform: translateY(-2px); }
}
@media (prefers-reduced-motion: reduce) {
  .be-message-typing span[aria-hidden=true] { animation: none; opacity: .45; }
}
</style>
