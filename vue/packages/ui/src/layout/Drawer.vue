<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const drawerMessages = { close: 'Close' }
export type DrawerMessages = typeof drawerMessages
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onMounted, shallowRef, useAttrs, useTemplateRef } from 'vue'
import { easeOut, panelSpring } from '../core/motion'
import PresenceGate from './PresenceGate.vue'
import { elementOf, useBodyLock, useFocusTrap } from './overlay-kit'

defineOptions({ inheritAttrs: false })
const { side = 'right', ariaLabel, dismissable = true, backdropClassName, labels } = defineProps<{
  side?: 'left' | 'right'
  ariaLabel?: string
  /** Close when the backdrop is clicked or Escape is pressed. Default true. */
  dismissable?: boolean
  /** Class for the backdrop. */
  backdropClassName?: string
  labels?: Partial<DrawerMessages>
}>()
// `label` and `backdrop-class` were this port's earlier names for `ariaLabel` and `backdropClassName`;
// they still work as plain attributes.
const attrs = useAttrs()
const dialogLabel = computed(() => ariaLabel ?? (attrs.label as string | undefined))
const backdropClasses = computed(() => backdropClassName ?? (attrs['backdrop-class'] as string | undefined) ?? (attrs.backdropClass as string | undefined))
const open = defineModel<boolean>('open', { default: false })
const t = computed(() => ({ ...drawerMessages, ...labels }))
const reduce = useReducedMotion()
const panel = useTemplateRef<unknown>('panel')
// The panel portals to <body>, which the server cannot do.
const mounted = shallowRef(false)
onMounted(() => { mounted.value = true })

function close() { open.value = false }
// Focus moves into the panel on open, Tab stays inside it, and focus returns
// to the opener on close.
useFocusTrap(() => open.value, () => elementOf(panel.value), { onEscape: () => { if (dismissable) close() } })
useBodyLock(() => open.value)

const offscreen = computed(() => (side === 'right' ? '100%' : '-100%'))
const fade = { duration: 0.2, ease: easeOut } as const
</script>

<template>
  <Teleport v-if="mounted" to="body">
    <!-- Two fixed siblings, no wrapper: the backdrop spans the viewport edges but
         paints the scrim, and the panel is inset off one side and paints its own
         surface. Both hang off `PresenceGate`, so interaction releases in the same
         commit that starts the exit. -->
    <AnimatePresence>
      <PresenceGate v-if="open" key="backdrop" v-slot="{ gate }">
        <motion.button type="button" class="be-drawer-backdrop" :class="backdropClasses" :aria-label="t.close" tabindex="-1"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.25, ease: easeOut }"
          :inert="gate.inert" :style="gate.style" @click="dismissable && close()" />
      </PresenceGate>
      <PresenceGate v-if="open" key="panel" v-slot="{ gate }">
        <motion.div ref="panel" class="be-drawer" :class="[side === 'right' ? 'be-drawer-right' : 'be-drawer-left', $attrs.class]" tabindex="-1" role="dialog" aria-modal="true" :aria-label="dialogLabel"
          :initial="reduce ? { opacity: 0 } : { x: offscreen }" :animate="reduce ? { opacity: 1 } : { x: 0 }" :exit="reduce ? { opacity: 0 } : { x: offscreen }"
          :transition="reduce ? fade : panelSpring" :inert="gate.inert" :style="gate.style">
          <slot :close="close" />
        </motion.div>
      </PresenceGate>
    </AnimatePresence>
  </Teleport>
</template>

<style scoped>
.be-drawer-backdrop { position: fixed; inset: 0; z-index: 50; width: 100%; height: 100%; padding: 0; border: 0; cursor: default; background: rgb(0 0 0 / .4); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
.be-drawer { position: fixed; top: 0; bottom: 0; z-index: 50; box-sizing: border-box; display: flex; flex-direction: column; width: 20rem; max-width: 85vw; background: var(--beui-background); color: var(--beui-foreground); box-shadow: 0 25px 50px -12px rgb(0 0 0 / .25); outline: none; }
.be-drawer-right { right: 0; border-left: 1px solid var(--beui-border); }
.be-drawer-left { left: 0; border-right: 1px solid var(--beui-border); }
</style>
