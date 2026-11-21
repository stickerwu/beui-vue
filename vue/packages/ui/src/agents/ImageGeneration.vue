<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, useSlots } from 'vue'
import { easeInOut, easeOut, pressSpring } from '../core/motion'
import AgentIcon from './AgentIcon.vue'
import DitherField from './DitherField.vue'
import type { Labels } from './shared'

type Status = 'queued' | 'generating' | 'refining' | 'complete' | 'error'
const props = withDefaults(defineProps<{ status?: Status, label?: string, prompt?: string, resolution?: string, aspectRatio?: number | string, size?: 'compact' | 'fluid', interactive?: boolean, statusText?: string, showStatus?: boolean, onRetry?: () => void, labels?: Labels, mediaClassName?: string, statusClassName?: string }>(), { status: 'generating', resolution: '1024 × 1024', aspectRatio: '1 / 1', size: 'compact', interactive: true, showStatus: true })

const MEDIA_STATE: Record<Status, { filter: string, opacity: number, scale: number }> = {
  queued: { filter: 'blur(4px) saturate(0.75)', opacity: 0, scale: 1.02 },
  generating: { filter: 'blur(3px) saturate(0.85)', opacity: 0, scale: 1.015 },
  refining: { filter: 'blur(1.5px) saturate(0.95)', opacity: 0.62, scale: 1.005 },
  complete: { filter: 'blur(0px) saturate(1)', opacity: 1, scale: 1 },
  error: { filter: 'blur(2px) saturate(0.5)', opacity: 0.28, scale: 1 },
}
const OVERLAY_OPACITY: Record<Status, number> = { queued: 1, generating: 1, refining: 0.48, complete: 0, error: 0 }
const defaults: Record<Status, string> = { queued: 'Waiting to generate', generating: 'Generating image', refining: 'Refining details', complete: 'Image ready', error: 'Generation failed' }
const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match)

const reduce = useReducedMotion()
const slots = useSlots()
const active = computed(() => ['queued', 'generating', 'refining'].includes(props.status))
const media = computed(() => MEDIA_STATE[props.status])
const statusText = computed(() => props.statusText ?? props.labels?.[props.status] ?? defaults[props.status])
const label = computed(() => props.label ?? (props.prompt ? fill(props.labels?.labelWithPrompt ?? '{status}: {prompt}', { status: statusText.value, prompt: props.prompt }) : statusText.value))
const quoted = computed(() => props.prompt ? fill(props.labels?.quotedPrompt ?? '“{prompt}”', { prompt: props.prompt }) : '')
const animate = computed(() => reduce.value ? { opacity: media.value.opacity } : { filter: media.value.filter, opacity: media.value.opacity, scale: media.value.scale })
</script>

<template>
  <div class="ig" data-slot="image-generation" :data-state="status" :aria-busy="active">
    <div class="ig-inner" :data-size="size">
      <div role="img" class="ig-surface" :aria-label="label" :style="{ aspectRatio }">
        <motion.div class="ig-media" :class="mediaClassName" :aria-hidden="slots.default ? undefined : true" :initial="false" :animate="animate" :transition="reduce ? { duration: 0 } : { duration: 0.4, ease: easeOut }"><slot /></motion.div>
        <AnimatePresence :initial="false">
          <motion.div v-if="active" key="dither-field" class="ig-dither" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: reduce ? 0 : 0.25, ease: easeOut }">
            <DitherField :interactive="interactive" :reduce="reduce" :opacity="OVERLAY_OPACITY[status]" />
          </motion.div>
        </AnimatePresence>
        <span v-if="resolution" class="ig-resolution">{{ resolution }}</span>
      </div>

      <div v-if="showStatus || prompt" class="ig-caption">
        <div v-if="showStatus" aria-live="polite" class="ig-status" :class="statusClassName" :data-error="status === 'error' || undefined">
          <AgentIcon v-if="status === 'complete'" name="Check" :size="14" />
          <AgentIcon v-else-if="status === 'error'" name="CircleAlert" :size="14" />
          <motion.span v-else aria-hidden="true" class="ig-mark" :animate="reduce ? undefined : { rotate: 360 }" :transition="{ duration: 2.4, ease: easeInOut, repeat: Infinity }"><span /><span /><span /><span /></motion.span>
          <AnimatePresence mode="popLayout" :initial="false">
            <motion.span :key="statusText" :initial="reduce ? false : { opacity: 0, y: 4 }" :animate="{ opacity: 1, y: 0 }" :exit="reduce ? undefined : { opacity: 0, y: -4 }" :transition="{ duration: reduce ? 0 : 0.15, ease: easeOut }">{{ statusText }}</motion.span>
          </AnimatePresence>
        </div>
        <p v-if="prompt" class="ig-prompt">{{ quoted }}</p>
      </div>

      <motion.button v-if="status === 'error' && onRetry" type="button" class="ig-retry" :while-press="reduce ? undefined : { scale: 0.96 }" :transition="pressSpring" @click="onRetry()">
        <AgentIcon name="RotateCcw" :size="16" />{{ labels?.retry ?? 'Try again' }}
      </motion.button>
    </div>
  </div>
</template>

<style scoped>
.ig { width: 100%; }
.ig-inner { width: 100%; }
.ig-inner[data-size=compact] { max-width: 13rem; margin-inline: auto; }
.ig-surface { position: relative; isolation: isolate; width: 100%; overflow: hidden; border-radius: .75rem; background: var(--beui-muted); }
.ig-media { position: absolute; inset: 0; }
.ig-media > :deep(*) { width: 100%; height: 100%; object-fit: cover; }
.ig-media :deep(img) { width: 100%; height: 100%; object-fit: cover; }
.ig-dither { position: absolute; inset: 0; }
.ig-resolution { position: absolute; z-index: 10; top: .5rem; right: .5rem; border-radius: 9999px; background: color-mix(in oklab, var(--beui-background) 75%, transparent); padding: .125rem .5rem; font-family: var(--font-mono, ui-monospace, monospace); font-size: 10px; line-height: 1rem; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
.ig-caption { margin-top: .75rem; text-align: left; }
.ig-status { display: flex; min-height: 1.25rem; align-items: center; gap: .5rem; font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); }
.ig-status[data-error] { color: var(--beui-destructive); }
.ig-status :deep(svg) { flex: none; }
.ig-mark { display: grid; width: .875rem; height: .875rem; flex: none; grid-template-columns: repeat(2, minmax(0, 1fr)); place-items: center; gap: .125rem; }
.ig-mark > span { width: .25rem; height: .25rem; border-radius: 1px; background: currentColor; }
.ig-mark > span:nth-child(2), .ig-mark > span:nth-child(3) { opacity: .55; }
.ig-prompt { margin: .125rem 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.ig-retry { display: inline-flex; min-height: 2.5rem; align-items: center; gap: .5rem; margin-top: .75rem; padding: 0 .75rem; border: 0; border-radius: 9999px; background: none; font: inherit; font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); cursor: pointer; outline: none; transition: background-color .15s; }
.ig-retry:hover { background: var(--beui-muted); }
.ig-retry:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
</style>
