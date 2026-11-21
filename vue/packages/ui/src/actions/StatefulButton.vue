<script lang="ts">
export type ButtonState = 'idle' | 'loading' | 'success' | 'error'

/** English defaults. Override per instance with `labels`. */
export const statefulButtonMessages = {
  loading: 'Loading',
  success: 'Done',
  error: 'Try again',
}
export type StatefulButtonMessages = typeof statefulButtonMessages
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { Comment, computed, Fragment, nextTick, onMounted, shallowRef, Text, useSlots, useTemplateRef, watch, type VNode } from 'vue'
import ButtonBase from '../ButtonBase.vue'
import { easeOut, swapSpring } from '../core/motion'

const props = defineProps<{
  state?: ButtonState
  disabled?: boolean
  loadingText?: string
  successText?: string
  errorText?: string
  /** Override any built-in string. */
  labels?: Partial<StatefulButtonMessages>
}>()

const CASCADE_STAGGER = 0.025
const ROLL_BLUR = 'blur(6px)'

const slots = useSlots()
const reduce = useReducedMotion()
const state = computed(() => props.state ?? 'idle')
const busy = computed(() => state.value === 'loading')
const strings = computed(() => ({ ...statefulButtonMessages, ...props.labels }))

function textOf(nodes: VNode[] | undefined): string | null {
  let out = ''
  for (const node of nodes ?? []) {
    if (node.type === Comment) continue
    if (node.type === Text || typeof node.children === 'string') {
      out += String(node.children)
    } else if (node.type === Fragment && Array.isArray(node.children)) {
      const inner = textOf(node.children as VNode[])
      if (inner === null) return null
      out += inner
    } else return null
  }
  return out
}

// A plain-string label cascades letter by letter; rich content swaps as one block.
const idleLabel = computed(() => {
  const content = slots.default?.()
  return textOf(content)?.replace(/\s+/g, ' ').trim() ?? null
})
const stateLabel = computed<string | null>(() => {
  if (state.value === 'loading') return props.loadingText ?? strings.value.loading
  if (state.value === 'success') return props.successText ?? strings.value.success
  if (state.value === 'error') return props.errorText ?? strings.value.error
  return idleLabel.value
})
const textKey = computed(() => (stateLabel.value !== null ? `${state.value}-${stateLabel.value}` : state.value))
const cascade = computed(() => stateLabel.value !== null && !reduce.value)
const letters = computed(() => (stateLabel.value ?? '').split(''))

const iconIn = { opacity: 0, width: 0, scale: 0.7, filter: ROLL_BLUR }
const iconRest = { opacity: 1, width: '1.5rem', scale: 1, filter: 'blur(0px)', transition: swapSpring }
const iconOut = { opacity: 0, width: 0, scale: 0.7, filter: ROLL_BLUR, transition: { duration: 0.16, ease: easeOut } }
const iconMotion = computed(() => reduce.value
  ? { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.15 } }, exit: { opacity: 0, transition: { duration: 0.15 } } }
  : { initial: iconIn, animate: iconRest, exit: iconOut })

function letterMotion(index: number) {
  const delay = index * CASCADE_STAGGER
  return {
    initial: { opacity: 0, y: '105%', filter: ROLL_BLUR },
    animate: { opacity: 1, y: '0%', filter: 'blur(0px)', transition: { ...swapSpring, delay } },
    exit: { opacity: 0, y: '-105%', filter: ROLL_BLUR, transition: { duration: 0.16, ease: easeOut, delay: delay * 0.5 } },
  }
}
const blockMotion = computed(() => reduce.value
  ? { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.15 } }, exit: { opacity: 0, transition: { duration: 0.15 } } }
  : {
      initial: { opacity: 0, y: 14, filter: ROLL_BLUR },
      animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: swapSpring },
      exit: { opacity: 0, y: -14, filter: ROLL_BLUR, transition: swapSpring },
    })

// The slot width follows the invisible measuring copy, so the button grows and
// shrinks around the label with the same spring as the text swap.
const measure = useTemplateRef<HTMLElement>('measure')
const width = shallowRef<number>()
function syncWidth() {
  const next = measure.value?.offsetWidth
  if (next && next !== width.value) width.value = next
}
onMounted(syncWidth)
watch([textKey, cascade], () => nextTick(syncWidth), { flush: 'post' })
</script>

<template>
  <ButtonBase :disabled="disabled || busy" :aria-busy="busy" :hover="false">
    <span class="be-stateful-row" aria-live="polite">
      <AnimatePresence :initial="false">
        <motion.span v-if="state === 'loading'" key="loading-icon" class="be-stateful-icon" v-bind="iconMotion">
          <svg class="be-stateful-svg be-stateful-spin" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
        </motion.span>
        <motion.span v-else-if="state === 'success'" key="success-icon" class="be-stateful-icon" v-bind="iconMotion">
          <svg class="be-stateful-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
        </motion.span>
        <motion.span v-else-if="state === 'error'" key="error-icon" class="be-stateful-icon" v-bind="iconMotion">
          <svg class="be-stateful-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </motion.span>
      </AnimatePresence>

      <motion.span class="be-stateful-text" :initial="false" :animate="{ width }" :transition="reduce ? { duration: 0 } : swapSpring">
        <span ref="measure" class="be-stateful-measure" aria-hidden="true">
          <template v-if="cascade"><span v-for="(char, index) in letters" :key="index" class="be-stateful-letter">{{ char }}</span></template>
          <template v-else-if="state === 'idle' && stateLabel === null"><slot /></template>
          <template v-else>{{ stateLabel }}</template>
        </span>
        <template v-if="cascade">
          <span class="be-stateful-sr">{{ stateLabel }}</span>
          <AnimatePresence :initial="false">
            <motion.span :key="`cascade-${textKey}`" aria-hidden="true" class="be-stateful-layer" initial="initial" animate="animate" exit="exit">
              <motion.span
                v-for="(char, index) in letters"
                :key="index"
                v-bind="letterMotion(index)"
                class="be-stateful-letter be-stateful-letter-live"
              >{{ char }}</motion.span>
            </motion.span>
          </AnimatePresence>
        </template>
        <AnimatePresence v-else :initial="false">
          <motion.span :key="`text-${textKey}`" class="be-stateful-layer be-stateful-block" v-bind="blockMotion">
            <slot v-if="state === 'idle' && stateLabel === null" />
            <template v-else>{{ stateLabel }}</template>
          </motion.span>
        </AnimatePresence>
      </motion.span>

      <AnimatePresence :initial="false">
        <motion.span v-if="state === 'idle' && $slots.icon" key="idle-icon" class="be-stateful-icon" v-bind="iconMotion">
          <slot name="icon" />
        </motion.span>
      </AnimatePresence>
    </span>
  </ButtonBase>
</template>

<style scoped>
.be-stateful-row { position: relative; display: inline-flex; align-items: center; justify-content: center; overflow: hidden; }
.be-stateful-icon { display: inline-grid; flex-shrink: 0; place-items: center; overflow: hidden; }
.be-stateful-svg { width: 1rem; height: 1rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.be-stateful-spin { animation: be-stateful-spin 1s linear infinite; }
.be-stateful-text { position: relative; display: inline-block; overflow: hidden; white-space: nowrap; vertical-align: bottom; }
.be-stateful-measure { visibility: hidden; display: inline-block; white-space: nowrap; }
.be-stateful-layer { position: absolute; top: 0; left: 0; display: inline-block; white-space: pre; }
.be-stateful-block { will-change: opacity, filter, transform; }
.be-stateful-letter { display: inline-block; white-space: pre; }
.be-stateful-letter-live { will-change: opacity, filter, transform; }
.be-stateful-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@keyframes be-stateful-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .be-stateful-spin { animation: none; } }
</style>
