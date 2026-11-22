<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { easeOut } from '../core/motion'
import { useCenterMorphModal } from './center-morph-context'
import { elementOf } from './overlay-kit'
import PresenceGate from './PresenceGate.vue'

defineOptions({ inheritAttrs: false })
const { ariaLabel, ariaDescribedBy, dismissible = true, showCloseButton = true, closeButtonLabel, backdropClassName, backdropClass } = defineProps<{
  /** Accessible name announced by screen readers. Defaults to the root's `label`. */
  ariaLabel?: string
  /** Optional id of descriptive content inside the modal. */
  ariaDescribedBy?: string
  /** Close on Escape or backdrop press. Default true. */
  dismissible?: boolean
  /** Render the close control inside the panel's top-right corner. Default true. */
  showCloseButton?: boolean
  closeButtonLabel?: string
  /** Extra classes for the backdrop. */
  backdropClassName?: string
  /** Earlier name of `backdropClassName`. */
  backdropClass?: string
}>()

const context = useCenterMorphModal('CenterMorphModalContent')
const reduce = useReducedMotion()
const mounted = shallowRef(false)
const panel = useTemplateRef<unknown>('panel')
onMounted(() => { mounted.value = true })

const FOCUSABLE = ['a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'].join(',')
function focusableElements(root: HTMLElement | null) {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(element => element.tabIndex >= 0)
}

// Complex clip-path strings can snap when a spring resolves its final distance.
// Keep the radius constant so the whole duration reads as surface unfolding,
// rather than finishing early and spending its last frames rounding corners.
const FOLDED = 'inset(48% 48% 48% 48% round 30px)'
const OPEN = 'inset(0% 0% 0% 0% round 30px)'
const UNFOLD = { duration: 0.43, ease: [0.2, 0, 0.2, 1] } as const

onMounted(() => {
  watch([() => context.open.value, () => dismissible], ([isOpen], _, onCleanup) => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = requestAnimationFrame(() => {
      const element = elementOf(panel.value)
      ;(focusableElements(element)[0] ?? element)?.focus()
    })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) {
        event.preventDefault()
        context.setOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const element = elementOf(panel.value)
      const focusable = focusableElements(element)
      if (focusable.length === 0) {
        event.preventDefault()
        element?.focus()
        return
      }
      const first = focusable[0] as HTMLElement
      const last = focusable[focusable.length - 1] as HTMLElement
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    onCleanup(() => {
      cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      document.getElementById(context.triggerId)?.focus()
    })
  }, { immediate: true, flush: 'post' })
})

const name = computed(() => ariaLabel ?? context.label.value)
const closeName = computed(() => closeButtonLabel ?? context.labels.value.close)
</script>

<template>
  <Teleport v-if="mounted" to="body">
    <AnimatePresence>
      <PresenceGate v-if="context.open.value" key="backdrop" v-slot="{ gate }">
        <motion.button type="button" class="be-cmm-backdrop" :class="backdropClassName ?? backdropClass" :aria-label="context.labels.value.dismiss" tabindex="-1" :disabled="!dismissible"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: reduce ? 0.1 : 0.28, ease: easeOut }"
          :inert="gate.inert" :style="gate.style" @click="context.setOpen(false)" />
      </PresenceGate>
      <PresenceGate v-if="context.open.value" key="layer" v-slot="{ isPresent, gate }">
        <!-- `inset-4` rather than `inset-0 p-4`: same content box, but the layer
             stays off the viewport edges. It never takes pointer events, so it
             carries `inert` alone. -->
        <div class="be-cmm-layer" :inert="!isPresent">
          <!-- Drop-shadow reads the clipped child's alpha, so depth follows the
               unfolding silhouette without introducing another panel layer. -->
          <div class="be-cmm-inner">
            <motion.div ref="panel" :id="context.contentId" class="be-cmm-panel" :class="$attrs.class" role="dialog" aria-modal="true" :aria-label="name" :aria-describedby="ariaDescribedBy" tabindex="-1"
              :initial="reduce ? { opacity: 0, clipPath: OPEN } : { opacity: 1, clipPath: FOLDED }"
              :animate="{ opacity: 1, clipPath: OPEN }"
              :exit="reduce ? { opacity: 0, clipPath: OPEN } : { opacity: 1, clipPath: FOLDED }"
              :transition="reduce ? { duration: 0.14, ease: easeOut } : UNFOLD" :inert="gate.inert" :style="gate.style">
              <slot :close="() => context.setOpen(false)" />
              <motion.button v-if="showCloseButton" type="button" class="be-cmm-close" :aria-label="closeName" @click="context.setOpen(false)"
                :initial="reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }" :animate="{ opacity: 1, scale: 1 }"
                :exit="{ opacity: 0, scale: reduce ? 1 : 0.88, transition: { duration: 0.1, ease: easeOut } }"
                :transition="{ delay: reduce ? 0 : 0.16, duration: reduce ? 0.12 : 0.2, ease: easeOut }">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </motion.button>
            </motion.div>
          </div>
        </div>
      </PresenceGate>
    </AnimatePresence>
  </Teleport>
</template>

<style scoped>
.be-cmm-backdrop { pointer-events: auto; position: fixed; inset: 0; z-index: 100; width: 100%; height: 100%; padding: 0; border: 0; cursor: default; background: color-mix(in srgb, var(--beui-background) 10%, transparent); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
.be-cmm-layer { pointer-events: none; position: fixed; inset: 1rem; z-index: 100; display: flex; align-items: center; justify-content: center; overflow-y: auto; filter: drop-shadow(0 25px 25px rgb(0 0 0 / .15)); }
.be-cmm-inner { display: flex; width: 100%; flex-direction: column; align-items: center; padding: 2rem 0; }
.be-cmm-panel { pointer-events: auto; position: relative; box-sizing: border-box; width: 100%; max-width: 26rem; transform-origin: center; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 30px; background: var(--beui-background); color: var(--beui-foreground); outline: none; will-change: clip-path; }
.be-cmm-close { position: absolute; top: 1rem; right: 1rem; display: inline-flex; width: 2rem; height: 2rem; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: 999px; background: color-mix(in srgb, var(--beui-foreground) 5%, transparent); color: var(--beui-muted-foreground); cursor: pointer; transition: background-color .15s, color .15s; }
.be-cmm-close:hover { background: color-mix(in srgb, var(--beui-foreground) 8%, transparent); color: var(--beui-foreground); }
.be-cmm-close:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 0; }
.be-cmm-close svg { width: 1rem; height: 1rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
</style>
