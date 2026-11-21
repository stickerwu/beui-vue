<script lang="ts">
import type { ComputedRef, InjectionKey } from 'vue'

export type MessageBubbleVariant = 'solid' | 'soft' | 'tint' | 'outline' | 'ghost' | 'danger'
export type MessageBubbleAlign = 'start' | 'end'

/** English defaults. Override per instance with `labels`. */
export const messageBubbleMessages = {
  showMore: 'Show more',
  showLess: 'Show less',
}
export type MessageBubbleMessages = typeof messageBubbleMessages

/** What a `MessageBubble` hands to its content, collapsible and group parts. */
export const bubbleKey: InjectionKey<{
  align: ComputedRef<MessageBubbleAlign>
  animateIn: ComputedRef<boolean>
  variant: ComputedRef<MessageBubbleVariant>
  labels: ComputedRef<Partial<MessageBubbleMessages> | undefined>
}> = Symbol('MessageBubble')

/** Lets the collapsible re-measure the animated surface after it resizes. */
export const bubbleLayoutKey: InjectionKey<() => void> = Symbol('MessageBubbleLayout')
</script>

<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, inject, provide } from 'vue'
import { layoutSpring } from '../core/motion'
import { sideKey } from './shared'

const props = withDefaults(defineProps<{
  variant?: MessageBubbleVariant
  /** Defaults to the surrounding Message alignment when omitted. */
  align?: MessageBubbleAlign
  /** Plays the bubble entrance once when this component mounts. */
  animateIn?: boolean
  labels?: Partial<MessageBubbleMessages>
  /** Enables shared-layout tracking of the bubble row. */
  layout?: boolean | 'position' | 'size' | 'preserve-aspect'
  className?: string
}>(), { variant: 'soft', animateIn: false, layout: false })

const reduce = useReducedMotion()
const side = inject(sideKey, undefined)
const resolved = computed<MessageBubbleAlign>(() => props.align ?? side?.value ?? 'start')

provide(bubbleKey, {
  align: resolved,
  animateIn: computed(() => props.animateIn),
  variant: computed(() => props.variant),
  labels: computed(() => props.labels),
})
</script>

<template>
  <motion.div
    data-slot="message-bubble"
    :data-align="resolved"
    :data-variant="variant"
    :layout="layout || undefined"
    :exit="reduce ? { opacity: 0 } : { opacity: 0, y: -3, scale: .99 }"
    :transition="reduce ? { duration: .12 } : layoutSpring"
    class="be-bubble"
    :class="className"
  >
    <slot />
  </motion.div>
</template>

<style>
.be-bubble { position: relative; display: flex; width: 100%; flex-direction: column; align-items: flex-start; }
.be-bubble[data-align=end] { align-items: flex-end; }
</style>
