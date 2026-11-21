<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, h, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import StatefulButton from '../actions/StatefulButton.vue'
import ButtonBase from '../ButtonBase.vue'
import { easeOut } from '../core/motion'
import { feedbackWidgetMessages } from './messages'

export interface FeedbackData { message: string }
type Status = 'idle' | 'open' | 'sending' | 'sent' | 'error'

const props = withDefaults(defineProps<{
  /** Called on submit. May be async; the button shows a sending state until it resolves. */
  onSubmit?: (data: FeedbackData) => void | Promise<void>
  position?: 'bottom-right' | 'bottom-left'
  title?: string
  placeholder?: string
  labels?: Partial<typeof feedbackWidgetMessages>
  className?: string
}>(), { position: 'bottom-right' })
defineSlots<{ icon?(): unknown }>()

const SUCCESS_DURATION_MS = 1600
// The trigger grows into the panel with a slight overshoot on open, then uses a calmer curve on
// close so dismissing feels faster and less prominent.
const MORPH_OPEN_EASE = [0.34, 1.25, 0.64, 1] as const
const MORPH_CLOSE_EASE = [0.22, 1, 0.36, 1] as const
const MORPH_OPEN_DURATION = 0.4
const MORPH_CLOSE_DURATION = 0.28
const MORPH_FADE_DURATION = 0.22
const MORPH_SLIDE = 40
const MORPH_SCALE = 0.97
const MORPH_BLUR = 'blur(2px)'

// Celebration sprinkles that burst from the success icon.
const SPRINKLES = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2
  return { x: Math.cos(angle) * 26, y: Math.sin(angle) * 26, color: i % 2 === 0 ? 'var(--beui-success, oklch(70% 0.18 155))' : 'var(--beui-accent)' }
})

const t = computed(() => ({ ...feedbackWidgetMessages, ...props.labels }))
const title = computed(() => props.title ?? t.value.title)
const placeholder = computed(() => props.placeholder ?? t.value.placeholder)
const reduce = useReducedMotion()
const root = useTemplateRef<HTMLElement>('root')
const textarea = useTemplateRef<HTMLTextAreaElement>('textarea')
const titleId = useId()
const status = shallowRef<Status>('idle')
const message = shallowRef('')
let closeTimer: ReturnType<typeof setTimeout> | undefined
let focusTimer: ReturnType<typeof setTimeout> | undefined

const open = computed(() => status.value !== 'idle')
const busy = computed(() => status.value === 'sending')
function clearCloseTimer() { clearTimeout(closeTimer); closeTimer = undefined }
function close() { clearCloseTimer(); status.value = 'idle'; message.value = '' }

// Arm the field once the open morph has settled; focusing while the surface is still expanding
// would show the caret and focus state inside a scaled panel.
watch(status, value => {
  clearTimeout(focusTimer)
  if (value !== 'open') return
  focusTimer = setTimeout(() => textarea.value?.focus(), reduce.value ? 0 : MORPH_OPEN_DURATION * 1000)
})

// Dismiss on escape or outside click while open (but not mid-send).
function onKey(event: KeyboardEvent) { if (open.value && event.key === 'Escape' && !busy.value) close() }
function onPointer(event: PointerEvent) { if (open.value && !busy.value && root.value && !root.value.contains(event.target as Node)) close() }
onMounted(() => { window.addEventListener('keydown', onKey); window.addEventListener('pointerdown', onPointer) })
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onPointer); clearCloseTimer(); clearTimeout(focusTimer) })

async function submit() {
  if (busy.value || message.value.trim().length === 0) return
  status.value = 'sending'
  try {
    await props.onSubmit?.({ message: message.value })
    status.value = 'sent'
    clearCloseTimer()
    closeTimer = setTimeout(close, SUCCESS_DURATION_MS)
  } catch {
    // Preserve the message so a rejected submission can be retried.
    status.value = 'error'
  }
}
function openPanel() { clearCloseTimer(); status.value = 'open'; void nextTick() }

const left = computed(() => props.position === 'bottom-left')
const contentOffset = computed(() => left.value ? -MORPH_SLIDE : MORPH_SLIDE)
const openEase = { duration: 0, ease: MORPH_OPEN_EASE }
const surfaceTransition = computed(() => reduce.value
  ? { duration: 0 }
  : {
      layout: { duration: open.value ? MORPH_OPEN_DURATION : MORPH_CLOSE_DURATION, ease: open.value ? MORPH_OPEN_EASE : MORPH_CLOSE_EASE },
      borderRadius: { duration: open.value ? MORPH_OPEN_DURATION : MORPH_CLOSE_DURATION, ease: open.value ? MORPH_OPEN_EASE : MORPH_CLOSE_EASE },
    })
void openEase
const contentTransition = computed(() => reduce.value
  ? { duration: 0 }
  : {
      opacity: { duration: MORPH_FADE_DURATION, ease: MORPH_CLOSE_EASE },
      x: { duration: MORPH_OPEN_DURATION, ease: MORPH_CLOSE_EASE },
      scale: { duration: MORPH_OPEN_DURATION, ease: MORPH_CLOSE_EASE },
      filter: { duration: MORPH_FADE_DURATION, ease: MORPH_CLOSE_EASE },
      rotate: { duration: MORPH_OPEN_DURATION, ease: MORPH_CLOSE_EASE },
    })
const panelHidden = computed(() => reduce.value ? { opacity: 0 } : { opacity: 0, x: contentOffset.value, scale: MORPH_SCALE, filter: MORPH_BLUR })
const triggerHidden = computed(() => reduce.value ? { opacity: 0 } : { opacity: 0, x: -contentOffset.value, filter: MORPH_BLUR })
const viewInitial = computed(() => reduce.value ? { opacity: 0 } : { opacity: 0, y: 8, filter: 'blur(4px)' })
const viewAnimate = computed(() => reduce.value
  ? { opacity: 1, transition: { duration: 0.18, ease: easeOut } }
  : { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.24, ease: easeOut } })
const viewExit = computed(() => reduce.value
  ? { opacity: 0, transition: { duration: 0.14, ease: easeOut } }
  : { opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.16, ease: easeOut } })
const view = computed(() => status.value === 'sent' ? 'sent' : status.value === 'error' ? 'error' : 'form')

// Lucide glyphs (the original imports `lucide-react`).
const PATHS: Record<string, string> = {
  chat: '<path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
}
const Glyph = (glyph: { name: string }) => h('svg', {
  xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  'aria-hidden': 'true', class: 'be-fb-glyph', innerHTML: PATHS[glyph.name],
})
</script>

<template>
  <div ref="root" class="be-fb" :class="[left ? 'is-left' : 'is-right', className]">
    <!-- One persistent shell grows out of the corner trigger. The shell and its contents use separate
         timing so the surface leads the reveal. -->
    <motion.div
      layout :animate="{ borderRadius: open ? 20 : 40 }" :transition="surfaceTransition" class="be-fb-shell" :class="[open ? 'is-open' : 'is-closed', left ? 'is-left' : 'is-right']"
      :style="{ transformOrigin: left ? 'bottom left' : 'bottom right' }"
    >
      <AnimatePresence :initial="false" mode="popLayout">
        <motion.div
          v-if="open" key="panel" :initial="panelHidden" :animate="{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }" :exit="panelHidden" :transition="contentTransition"
        >
          <motion.div layout="position">
            <AnimatePresence mode="popLayout" :initial="false">
              <motion.div v-if="view === 'sent'" key="sent" :initial="viewInitial" :animate="viewAnimate" :exit="viewExit">
                <div class="be-fb-card is-sent">
                  <div class="be-fb-burst">
                    <template v-if="!reduce">
                      <motion.span
                        v-for="(sprinkle, index) in SPRINKLES" :key="`${sprinkle.x}-${sprinkle.y}`" class="be-fb-sprinkle" :style="{ backgroundColor: sprinkle.color }"
                        :initial="{ opacity: 0, scale: 0.4, x: 0, y: 0 }" :animate="{ opacity: [0, 1, 0], scale: [0, 1, 0.4], x: sprinkle.x, y: sprinkle.y }"
                        :transition="{ duration: 0.6, delay: 0.18 + index * 0.02, ease: 'easeOut' }"
                      />
                    </template>
                    <motion.div class="be-fb-badge" :initial="reduce ? { scale: 1 } : { scale: 0 }" :animate="{ scale: 1 }" :transition="{ type: 'spring', stiffness: 500, damping: 22, delay: 0.04 }">
                      <motion.svg viewBox="0 0 24 24" fill="none" class="be-fb-check">
                        <motion.path
                          d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" :stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                          :initial="reduce ? { pathLength: 1 } : { pathLength: 0 }" :animate="{ pathLength: 1 }" :transition="{ duration: 0.35, ease: 'easeOut', delay: 0.15 }"
                        />
                      </motion.svg>
                    </motion.div>
                  </div>
                  <h3 class="be-fb-title is-sent-title">{{ t.sentTitle }}</h3>
                  <p class="be-fb-copy">{{ t.sentDescription }}</p>
                </div>
              </motion.div>

              <motion.div v-else-if="view === 'error'" key="error" :initial="viewInitial" :animate="viewAnimate" :exit="viewExit">
                <div role="alert" class="be-fb-card is-error">
                  <div class="be-fb-alert"><Glyph name="alert" /></div>
                  <h3 class="be-fb-title is-error-title">{{ t.errorTitle }}</h3>
                  <p class="be-fb-copy is-error-copy">{{ t.errorDescription }}</p>
                  <ButtonBase size="sm" class="be-fb-retry" @click="submit">{{ t.retry }}</ButtonBase>
                </div>
              </motion.div>

              <motion.div v-else key="form" :initial="viewInitial" :animate="viewAnimate" :exit="viewExit">
                <div class="be-fb-card is-form">
                  <div class="be-fb-head">
                    <h3 :id="titleId" class="be-fb-title">{{ title }}</h3>
                    <button type="button" class="be-fb-close" :aria-label="t.close" @click="close"><Glyph name="x" /></button>
                  </div>
                  <textarea ref="textarea" v-model="message" class="be-fb-textarea" :aria-labelledby="titleId" :placeholder="placeholder" :disabled="busy" rows="3" />
                </div>

                <div class="be-fb-actions">
                  <ButtonBase variant="secondary" class="be-fb-cancel" :disabled="busy" @click="close">{{ t.cancel }}</ButtonBase>
                  <StatefulButton :state="busy ? 'loading' : 'idle'" :loading-text="t.sending" class="be-fb-submit" :disabled="busy || message.trim().length === 0" @click="submit">{{ t.submit }}</StatefulButton>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>

        <motion.button
          v-else key="trigger" type="button" class="be-fb-trigger" :class="left ? 'is-left' : 'is-right'" :aria-label="title" aria-haspopup="dialog"
          :initial="triggerHidden" :animate="{ opacity: 1, x: 0, filter: 'blur(0px)' }" :exit="triggerHidden" :transition="contentTransition" :while-tap="reduce ? undefined : { scale: 0.92 }" @click="openPanel"
        >
          <motion.span
            class="be-fb-trigger-icon" :initial="reduce ? false : { rotate: 45, scale: MORPH_SCALE }" :animate="{ rotate: 0, scale: 1 }" :exit="{ rotate: 45, scale: MORPH_SCALE }" :transition="contentTransition"
          ><slot name="icon"><Glyph name="chat" /></slot></motion.span>
        </motion.button>
      </AnimatePresence>
    </motion.div>
  </div>
</template>

<style scoped>
.be-fb { pointer-events: none; position: absolute; bottom: 1rem; z-index: 30; color: var(--beui-foreground); font-size: 1rem; line-height: 1.5; text-align: start; }
.be-fb.is-right { right: 1rem; }
.be-fb.is-left { left: 1rem; }
.be-fb-glyph { display: block; width: 100%; height: 100%; }
.be-fb-shell { pointer-events: auto; position: absolute; bottom: 0; box-sizing: border-box; overflow: hidden; border: 1px solid var(--beui-border); background: var(--beui-background); color: var(--beui-foreground); box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1); }
.be-fb-shell.is-right { right: 0; }
.be-fb-shell.is-left { left: 0; }
.be-fb-shell.is-open { width: min(86vw, 320px); padding: .5rem; }
.be-fb-shell.is-closed { width: 3rem; height: 3rem; padding: 0; }
.be-fb-trigger { position: absolute; bottom: 0; display: flex; align-items: center; justify-content: center; box-sizing: border-box; width: 3rem; height: 3rem; margin: 0; padding: 0; border: 0; background: transparent; color: var(--beui-foreground); cursor: pointer; }
.be-fb-trigger.is-right { right: 0; }
.be-fb-trigger.is-left { left: 0; }
.be-fb-trigger:focus-visible, .be-fb-close:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.be-fb-trigger-icon { display: grid; flex: none; place-items: center; width: 1.25rem; height: 1.25rem; }

/* Explicit resets: host heading and paragraph rules must not reshape the panel. */
.be-fb-card { box-sizing: border-box; border-radius: 20px; background: color-mix(in srgb, var(--beui-border) 60%, transparent); }
.be-fb-card.is-form { min-height: 150px; padding: .875rem 1rem; }
.be-fb-card.is-sent { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .375rem; padding: 1.5rem 1rem; text-align: center; }
.be-fb-card.is-error { padding: 1.25rem 1rem; text-align: center; }
.be-fb-head { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; }
.be-fb-title { margin: 0; padding: 0; border: 0; font-size: .875rem; line-height: 1.25rem; font-weight: 600; letter-spacing: normal; color: var(--beui-foreground); }
.be-fb-title.is-error-title { margin-top: .75rem; }
.be-fb-copy { margin: 0; font-size: .75rem; line-height: 1.625; color: var(--beui-muted-foreground); }
.be-fb-copy.is-error-copy { margin-top: .25rem; }
.be-fb-close { display: flex; flex: none; align-items: center; justify-content: center; width: 1.25rem; height: 1.25rem; padding: 0; border: 0; border-radius: 9999px; background: color-mix(in srgb, var(--beui-foreground) 7%, transparent); color: var(--beui-muted-foreground); cursor: pointer; transition: color .15s; }
.be-fb-close :deep(svg) { width: .75rem; height: .75rem; }
@media (hover: hover) { .be-fb-close:hover { color: var(--beui-foreground); } }
.be-fb-textarea { display: block; box-sizing: border-box; width: 100%; margin: .5rem 0 0; padding: 0; border: 0; resize: none; background: transparent; color: var(--beui-foreground); font: inherit; font-size: 1rem; line-height: 1.5rem; outline: none; }
.be-fb-textarea::placeholder { color: color-mix(in srgb, var(--beui-muted-foreground) 60%, transparent); }
@media (min-width: 768px) { .be-fb-textarea { font-size: .875rem; line-height: 1.25rem; } }
.be-fb-actions { display: flex; align-items: center; gap: .5rem; padding: .5rem .25rem .25rem; }
.be-fb-actions .be-fb-cancel.be-fb-cancel, .be-fb-actions .be-fb-submit.be-fb-submit { flex: 1; }
.be-fb-actions .be-fb-cancel.be-fb-cancel { background: var(--beui-border); color: var(--beui-muted-foreground); }
.be-fb-actions .be-fb-submit.be-fb-submit { background: var(--beui-foreground); color: var(--beui-background); }
@media (hover: hover) {
  .be-fb-actions .be-fb-cancel.be-fb-cancel:hover { color: var(--beui-foreground); }
  .be-fb-actions .be-fb-submit.be-fb-submit:hover { background: color-mix(in srgb, var(--beui-foreground) 90%, transparent); }
}
.be-fb-alert { display: flex; align-items: center; justify-content: center; width: 3rem; height: 3rem; margin-inline: auto; border-radius: 9999px; background: color-mix(in srgb, var(--beui-destructive) 10%, transparent); color: var(--beui-destructive); }
.be-fb-alert :deep(svg) { width: 1.25rem; height: 1.25rem; }
.be-fb-retry { margin-top: 1rem; }
.be-fb-burst { position: relative; display: flex; align-items: center; justify-content: center; width: 3rem; height: 3rem; margin-bottom: .25rem; }
.be-fb-sprinkle { position: absolute; width: .375rem; height: .375rem; border-radius: 9999px; }
.be-fb-badge { display: flex; align-items: center; justify-content: center; width: 3rem; height: 3rem; border-radius: 9999px; background: var(--beui-success, oklch(70% 0.18 155)); }
.be-fb-check { width: 1.25rem; height: 1.25rem; color: #fff; }
</style>
