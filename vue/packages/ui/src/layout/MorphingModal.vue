<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const morphingModalMessages = { close: 'Close modal' }
export type MorphingModalMessages = typeof morphingModalMessages
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, nextTick, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { easeOut, panelSpring } from '../core/motion'
import PresenceGate from './PresenceGate.vue'
import { elementOf, focusablesIn, useBodyLock, useFocusTrap } from './overlay-kit'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  /** "bottom" anchors to the viewport bottom (mobile-like). "center" centers vertically. */
  placement?: 'bottom' | 'center'
  /** Accessible name for the dialog. Without it, the dialog is named by the first heading in the current view. */
  label?: string
  /** Alias of `label`, named after the React prop. */
  ariaLabel?: string
  labels?: Partial<MorphingModalMessages>
}>(), { placement: 'bottom' })
/** Which view is currently shown. `null` closes the modal. */
const viewId = defineModel<string | null>('viewId', { default: null })
const emit = defineEmits<{ close: [] }>()
const accessibleName = computed(() => props.ariaLabel ?? props.label)
const t = computed(() => ({ ...morphingModalMessages, ...props.labels }))
const open = computed(() => viewId.value !== null)
const reduce = useReducedMotion()
const panel = useTemplateRef<unknown>('panel')
const uid = useId()
const headingId = shallowRef<string>()
// The last real view: while the modal fades out the view id is already null,
// but the leaving panel keeps showing the view it had.
const shown = shallowRef(viewId.value ?? '')
watch(viewId, next => { if (next !== null) shown.value = next })

function close() {
  viewId.value = null
  emit('close')
}
// Focus moves into the panel on open, Tab stays inside it, Escape closes, and
// focus returns to the opener on close.
useFocusTrap(() => open.value, () => elementOf(panel.value), { onEscape: close })
useBodyLock(() => open.value)

// The current view, not the one still fading out under it.
function currentView() {
  const views = Array.from(elementOf(panel.value)?.querySelectorAll<HTMLElement>('[data-view]') ?? [])
  return views.find(element => element.dataset.view === viewId.value)
}
// Name the dialog by the current view's first heading unless a label is set.
async function nameDialog() {
  await nextTick()
  if (!viewId.value || accessibleName.value) return
  const heading = currentView()?.querySelector<HTMLElement>('h1, h2, h3, h4, h5, h6')
  if (heading && !heading.id) heading.id = `${uid}-${viewId.value}-title`
  headingId.value = heading?.id
}
// The focused control leaves with the old view, so a view change hands focus to
// the first control of the new one.
watch(viewId, async (next, previous) => {
  void nameDialog()
  if (!next || !previous || previous === next) return
  await nextTick()
  const element = elementOf(panel.value)
  const active = document.activeElement
  if (!element || (active && active !== document.body && !element.contains(active))) return
  ;(focusablesIn(currentView() ?? null)[0] ?? element).focus({ preventScroll: true })
}, { flush: 'post' })
watch(() => open.value, isOpen => { if (isOpen) void nameDialog() }, { flush: 'post' })
onMounted(() => { if (open.value) void nameDialog() })

const enterY = computed(() => (reduce.value ? 0 : props.placement === 'bottom' ? 40 : 20))
const enterScale = computed(() => (reduce.value ? 1 : 0.97))
</script>

<template>
  <!-- Mounted only while open, and while open the chrome is two fixed siblings:
       the backdrop carries the scrim colour, and the layer that positions the
       panel sits inset off every edge. Both hang off `PresenceGate`. -->
  <AnimatePresence :initial="false">
    <PresenceGate v-if="open" key="backdrop" v-slot="{ gate }">
      <motion.button type="button" class="be-mm-backdrop" :aria-label="t.close" tabindex="-1"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.2, ease: easeOut }"
        :inert="gate.inert" :style="gate.style" @click="close" />
    </PresenceGate>
    <PresenceGate v-if="open" key="panel-layer" v-slot="{ isPresent }">
      <!-- The layer itself never takes pointer events, so it carries `inert` alone. -->
      <div class="be-mm-layer" :class="placement === 'bottom' ? 'be-mm-bottom' : 'be-mm-center'" :inert="!isPresent">
        <motion.div ref="panel" class="be-mm-panel" :class="$attrs.class" role="dialog" aria-modal="true" :aria-label="accessibleName"
          :aria-labelledby="accessibleName ? undefined : headingId" tabindex="-1" layout :layout-dependency="shown"
          :initial="{ opacity: 0, y: enterY, scale: enterScale }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: enterY, scale: reduce ? 1 : 0.98, transition: { duration: 0.18, ease: easeOut } }"
          :transition="panelSpring" :inert="!isPresent" :style="{ pointerEvents: isPresent ? 'auto' : 'none' }">
          <!-- `layout-dependency` makes the panel and body re-render, and so snapshot their
               layout, when the view changes. Upstream gets that from React re-rendering the
               panel; in Vue only the AnimatePresence that reads `shown` would update, so in a
               production build the panel never measured and the height jumped. -->
          <motion.div layout="position" :layout-dependency="shown" class="be-mm-body" :transition="panelSpring">
            <AnimatePresence mode="popLayout" :initial="false">
              <!-- The keyed motion element is the direct child, so popLayout can lift the outgoing
                   view out of flow. Its slot content is the last render of that view, frozen
                   while it leaves; `inert` keeps the trap and assistive technology on the incoming one. -->
              <motion.div :key="shown" :data-view="shown"
                :initial="reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: 'blur(4px)' }"
                :animate="reduce
                  ? { opacity: 1, transition: { duration: 0.18, ease: easeOut } }
                  : { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.24, ease: easeOut } }"
                :exit="reduce
                  ? { opacity: 0, transition: { duration: 0.14, ease: easeOut } }
                  : { opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.16, ease: easeOut } }">
                <PresenceGate v-slot="{ isPresent: viewPresent }">
                  <div :inert="!viewPresent"><slot :view="shown" :close="close" /></div>
                </PresenceGate>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </PresenceGate>
  </AnimatePresence>
</template>

<style scoped>
.be-mm-backdrop { pointer-events: auto; position: fixed; inset: 0; z-index: 80; padding: 0; border: 0; background: color-mix(in srgb, var(--beui-background) 5%, transparent); -webkit-backdrop-filter: blur(14px) saturate(140%); backdrop-filter: blur(14px) saturate(140%); cursor: default; }
.be-mm-layer { pointer-events: none; position: fixed; inset: 1rem; z-index: 80; display: flex; justify-content: center; }
.be-mm-bottom { align-items: flex-end; padding-bottom: 1rem; }
.be-mm-center { align-items: center; }
.be-mm-panel { pointer-events: auto; position: relative; box-sizing: border-box; width: 100%; max-width: 24rem; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 1.5rem; background: var(--beui-background); color: var(--beui-foreground); box-shadow: 0 25px 50px -12px rgb(0 0 0 / .25); outline: none; will-change: transform; }
.be-mm-body { padding: 1.25rem; }
</style>
