<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onMounted, onScopeDispose, shallowRef, useTemplateRef } from 'vue'
import type { Labels } from '../agents/shared'
import { mouseSpring, panelSpring, pressSpring } from '../core/motion'
import TextReveal from '../effects/TextReveal.vue'
import { notFoundMessages } from './messages'
import NotFoundScramble from './NotFoundScramble.vue'

export type NotFoundVariant = 'glitch' | 'magnetic' | 'spotlight' | 'stacked' | 'terminal'
export interface NotFoundProps { className?: string, code?: string, title?: string, description?: string, homeHref?: string, homeLabel?: string, browseHref?: string, browseLabel?: string, labels?: Labels }
const props = withDefaults(defineProps<NotFoundProps & { variant: NotFoundVariant }>(), { code: '404', homeHref: '/', browseHref: '/components/motion' })

const reduce = useReducedMotion()
// True hover only (mouse / trackpad): touch devices fire sticky phantom hover on tap.
const canHover = shallowRef(false)
let media: MediaQueryList | undefined
const syncHover = () => { canHover.value = media?.matches ?? false }
onMounted(() => {
  media = matchMedia('(hover: hover) and (pointer: fine)')
  syncHover()
  media.addEventListener('change', syncHover)
})
onScopeDispose(() => media?.removeEventListener('change', syncHover))
const interactive = computed(() => !reduce.value && canHover.value)

const text = computed(() => ({ ...notFoundMessages, ...props.labels }))
const whileTap = computed(() => reduce.value ? undefined : { scale: .96 })
const whileHover = computed(() => interactive.value ? { scale: 1.02 } : undefined)

// Spotlight: a mask that follows the cursor over the bright layer.
const spot = useTemplateRef<HTMLElement>('spot')
const mx = shallowRef(50)
const my = shallowRef(50)
function moveSpot(event: MouseEvent) {
  const element = spot.value
  if (!element || !interactive.value) return
  const rect = element.getBoundingClientRect()
  mx.value = (event.clientX - rect.left) / rect.width * 100
  my.value = (event.clientY - rect.top) / rect.height * 100
}
const mask = computed(() => `radial-gradient(220px circle at ${mx.value}% ${my.value}%, #000 25%, transparent 72%)`)
const spotStyle = computed(() => interactive.value ? { WebkitMaskImage: mask.value, maskImage: mask.value } : undefined)

// Magnetic: each glyph is pulled toward the cursor and springs back on leave.
const magnetSpring = { type: 'spring', ...mouseSpring } as const
const glyphs = computed(() => Array.from(props.code))
const pull = shallowRef<Record<number, { x: number, y: number }>>({})
function attract(event: MouseEvent, index: number) {
  if (!interactive.value) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  pull.value = { ...pull.value, [index]: { x: (event.clientX - rect.left - rect.width / 2) * .6, y: (event.clientY - rect.top - rect.height / 2) * .6 } }
}
function release(index: number) { pull.value = { ...pull.value, [index]: { x: 0, y: 0 } } }

const stackRest = { rotate: 0, x: 0, y: 0 }
const TYPE_SPRING = { stiffness: 320, damping: 30, mass: .6 }
</script>
<template>
  <section class="be-nf" :class="className" :data-variant="variant">
    <!-- Glitch -->
    <div v-if="variant === 'glitch'" class="be-nf-glitch">
      <span aria-hidden="true" class="be-nf-ghost be-nf-ghost-red"><NotFoundScramble :text="code" /></span>
      <span aria-hidden="true" class="be-nf-ghost be-nf-ghost-cyan"><NotFoundScramble :text="code" /></span>
      <h1 class="be-nf-glitch-code"><NotFoundScramble :text="code" /></h1>
    </div>

    <!-- Magnetic -->
    <h1 v-else-if="variant === 'magnetic'" :aria-label="code" class="be-nf-magnetic">
      <motion.div
        v-for="(char, index) in glyphs" :key="index"
        class="be-nf-mag" :class="{ 'be-nf-mag-next': index > 0 }"
        :animate="{ x: pull[index]?.x ?? 0, y: pull[index]?.y ?? 0 }"
        :transition="magnetSpring"
        @mousemove="attract($event, index)" @mouseleave="release(index)"
      ><span aria-hidden="true" class="be-nf-glyph">{{ char }}</span></motion.div>
    </h1>

    <!-- Spotlight -->
    <div v-else-if="variant === 'spotlight'" ref="spot" class="be-nf-spot" @mousemove="moveSpot">
      <span aria-hidden="true" class="be-nf-spot-base">{{ code }}</span>
      <h1 :aria-label="code" class="be-nf-spot-lit" :class="{ 'be-nf-spot-dim': !interactive }" :style="spotStyle"><span aria-hidden="true">{{ code }}</span></h1>
    </div>

    <!-- Stacked -->
    <motion.div v-else-if="variant === 'stacked'" initial="rest" animate="rest" :while-hover="interactive ? 'hover' : undefined" class="be-nf-stack">
      <motion.div aria-hidden="true" :variants="{ rest: stackRest, hover: { rotate: -9, x: -28, y: 8 } }" :transition="panelSpring" class="be-nf-card" />
      <motion.div aria-hidden="true" :variants="{ rest: stackRest, hover: { rotate: 9, x: 28, y: 8 } }" :transition="panelSpring" class="be-nf-card" />
      <motion.div :variants="{ rest: { y: 0 }, hover: { y: -6 } }" :transition="panelSpring" class="be-nf-card be-nf-card-front">
        <h1 class="be-nf-stack-code">{{ code }}</h1>
        <span class="be-nf-stack-caption">{{ text.stackedCaption }}</span>
      </motion.div>
    </motion.div>

    <!-- Terminal -->
    <div v-else class="be-nf-terminal">
      <div class="be-nf-terminal-bar">
        <span class="be-nf-dot" style="background:#ff5f57" /><span class="be-nf-dot" style="background:#febc2e" /><span class="be-nf-dot" style="background:#28c840" />
        <span class="be-nf-terminal-title">~/beui</span>
      </div>
      <div class="be-nf-terminal-body">
        <TextReveal as="p" split="char" :stagger=".018" :blur="6" :y-offset="0" :spring="TYPE_SPRING" class="be-nf-term-line" text="$ cd /page" />
        <TextReveal as="p" split="char" :stagger=".012" :delay=".45" :blur="6" :y-offset="0" :spring="TYPE_SPRING" class="be-nf-term-line be-nf-term-error" :text="text.terminalError" />
        <p class="be-nf-term-line be-nf-term-prompt">
          <TextReveal as="span" split="char" :stagger=".018" :delay="1.1" :blur="6" :y-offset="0" :spring="TYPE_SPRING" :text="`$ status ${code}`" />
          <span class="be-nf-cursor" />
        </p>
      </div>
    </div>

    <div class="be-nf-copy">
      <p class="be-nf-title">{{ title ?? text.title }}</p>
      <p class="be-nf-description">{{ description ?? text.description }}</p>
    </div>

    <div class="be-nf-actions">
      <motion.a :href="homeHref" :while-tap="whileTap" :while-hover="whileHover" :transition="pressSpring" class="be-nf-button be-nf-primary">{{ homeLabel ?? text.homeLabel }}</motion.a>
      <motion.a :href="browseHref" :while-tap="whileTap" :while-hover="whileHover" :transition="pressSpring" class="be-nf-button be-nf-secondary">{{ browseLabel ?? text.browseLabel }}</motion.a>
    </div>
  </section>
</template>
<style scoped>
.be-nf {
  --nf-ease: cubic-bezier(.16, 1, .3, 1);
  --nf-mono: var(--beui-font-mono, var(--font-mono, ui-monospace, monospace));
  box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2rem; width: 100%; min-height: 420px; padding-inline: 1rem; text-align: center;
  color: var(--beui-foreground); font-size: 1rem; line-height: 1.5;
}
.be-nf h1 { margin: 0; padding: 0; border: 0; }
.be-nf p { margin: 0; }
.be-nf-copy { display: flex; flex-direction: column; align-items: center; gap: .5rem; }
.be-nf-title { font-size: 1.125rem; line-height: 1.75rem; font-weight: 600; color: var(--beui-foreground); }
.be-nf-description { max-width: 24rem; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.be-nf-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .75rem; }
.be-nf-button {
  display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; height: 2.75rem; padding-inline: 1.5rem;
  border-radius: 9999px; font-size: .875rem; line-height: 1.25rem; font-weight: 500; text-decoration: none; user-select: none;
  transition: background-color .15s var(--nf-ease);
}
.be-nf-primary { background: var(--beui-primary); color: var(--beui-primary-foreground); }
.be-nf-secondary { border: 1px solid var(--beui-border); background: var(--beui-card); color: var(--beui-foreground); }
.be-nf-button:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
@media (hover: hover) {
  .be-nf-primary:hover { background: color-mix(in srgb, var(--beui-primary) 90%, transparent); }
  .be-nf-secondary:hover { background: color-mix(in srgb, var(--beui-muted, var(--beui-card)) 60%, transparent); }
}

/* Glitch */
.be-nf-glitch, .be-nf-glitch-code { font-family: var(--nf-mono); font-weight: 700; line-height: 1; letter-spacing: -.05em; font-size: clamp(5rem, 18vw, 11rem); }
.be-nf-glitch { position: relative; user-select: none; color: var(--beui-foreground); }
.be-nf-glitch-code { position: relative; }
.be-nf-ghost { position: absolute; inset: 0; pointer-events: none; opacity: 0; mix-blend-mode: screen; transition: transform .15s var(--nf-ease), opacity .15s var(--nf-ease); }
.be-nf-ghost-red { color: #ff0040; }
.be-nf-ghost-cyan { color: #00e5ff; }
.be-nf-glitch:hover .be-nf-ghost { opacity: .7; }
.be-nf-glitch:hover .be-nf-ghost-red { transform: translateX(3px); }
.be-nf-glitch:hover .be-nf-ghost-cyan { transform: translateX(-3px); }
@media (prefers-reduced-motion: reduce) { .be-nf-ghost { display: none; } }

/* Magnetic */
.be-nf-magnetic { display: flex; align-items: center; justify-content: center; user-select: none; font-weight: 700; line-height: 1; letter-spacing: -.05em; color: var(--beui-foreground); font-size: clamp(5rem, 18vw, 12rem); }
.be-nf-mag { display: inline-block; }
.be-nf-mag-next { margin-left: -.5rem; }
.be-nf-glyph { display: inline-block; padding-inline: .25rem; font-variant-numeric: tabular-nums; }

/* Spotlight */
.be-nf-spot { position: relative; isolation: isolate; display: flex; align-items: center; justify-content: center; box-sizing: border-box; aspect-ratio: 16 / 9; width: 100%; max-width: 36rem; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 1.5rem; background: #0a0a0a; }
.be-nf-spot-base, .be-nf-spot-lit { user-select: none; font-weight: 700; line-height: 1; letter-spacing: -.05em; font-size: clamp(5rem, 16vw, 10rem); }
.be-nf-spot-base { color: rgb(255 255 255 / .1); }
.be-nf-spot-lit { position: absolute; color: #fff; }
.be-nf-spot-dim { color: rgb(255 255 255 / .9); }

/* Stacked */
.be-nf-stack { position: relative; width: 16rem; height: 11rem; }
.be-nf-card { position: absolute; inset: 0; box-sizing: border-box; border: 1px solid var(--beui-border); border-radius: 1.5rem; background: var(--beui-card); box-shadow: 0 1px 3px 0 rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1); }
.be-nf-card-front { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .25rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1); }
.be-nf-stack-code { user-select: none; font-weight: 700; line-height: 1; letter-spacing: -.05em; color: var(--beui-foreground); font-size: clamp(3.5rem, 9vw, 5rem); }
.be-nf-stack-caption { font-size: .75rem; line-height: 1rem; font-weight: 500; text-transform: uppercase; letter-spacing: .025em; color: var(--beui-muted-foreground); }

/* Terminal */
.be-nf-terminal { box-sizing: border-box; width: 100%; max-width: 28rem; overflow: hidden; border: 1px solid var(--beui-border); border-radius: .75rem; background: #0a0a0a; text-align: left; box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1); }
.be-nf-terminal-bar { display: flex; align-items: center; gap: .375rem; padding: .75rem 1rem; border-bottom: 1px solid rgb(255 255 255 / .1); }
.be-nf-dot { width: .75rem; height: .75rem; border-radius: 9999px; }
.be-nf-terminal-title { margin-left: .5rem; font-size: .75rem; line-height: 1rem; color: rgb(255 255 255 / .4); }
.be-nf-terminal-body { display: flex; flex-direction: column; gap: .375rem; padding: 1rem; font-family: var(--nf-mono); font-size: .875rem; line-height: 1.625; }
.be-nf-term-line { color: rgb(255 255 255 / .8); }
.be-nf-term-error { color: #ff5f57; }
.be-nf-term-prompt { display: flex; align-items: center; }
.be-nf-cursor { display: inline-block; margin-left: .25rem; width: .55ch; height: 1.1em; transform: translateY(.12em); background: rgb(255 255 255 / .8); animation: be-nf-pulse 2s cubic-bezier(.4, 0, .6, 1) infinite; }
@keyframes be-nf-pulse { 50% { opacity: .5; } }
@media (prefers-reduced-motion: reduce) { .be-nf-cursor { animation: none; } }
</style>
