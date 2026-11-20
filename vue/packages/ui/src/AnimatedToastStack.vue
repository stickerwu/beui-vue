<script setup lang="ts">
import { AnimatePresence } from 'motion-v'
import { computed, onMounted, shallowRef } from 'vue'
import ToastItem from './core/ToastItem.vue'
import type { AnimatedToast, ToastPosition, ToastStatus } from './core/toasts'

defineOptions({ inheritAttrs: false })
const { toasts, onDismiss, position = 'bottom-right', placement, fixed = false, portal = undefined, portalRoot, maxVisible = 4, labels } = defineProps<{
  toasts: readonly AnimatedToast[]
  onDismiss?: (id: string) => void
  position?: ToastPosition
  placement?: 'static' | 'fixed' | 'absolute'
  fixed?: boolean
  portal?: boolean
  portalRoot?: string | Element
  maxVisible?: number
  labels?: { dismiss?: string; list?: string }
}>()
const slots = defineSlots<{ toast?(props: { toast: AnimatedToast }): unknown; icon?(props: { toast: AnimatedToast; status: ToastStatus }): unknown }>()
const mounted = shallowRef(false)
const location = computed(() => placement ?? (fixed ? 'fixed' : 'static'))
const usePortal = computed(() => portal ?? location.value === 'fixed')
const visible = computed(() => maxVisible >= 1 ? toasts.slice(-Math.floor(maxVisible)) : [])
onMounted(() => { mounted.value = true })
</script>

<template>
  <Teleport v-if="!usePortal || mounted" :to="portalRoot ?? 'body'" :disabled="!usePortal">
    <ol v-bind="$attrs" class="be-toasts" :data-placement="location" :data-position="position" :aria-label="labels?.list ?? 'Notifications'" aria-live="polite" aria-atomic="false" aria-relevant="additions text">
      <AnimatePresence :initial="false" mode="popLayout">
        <ToastItem v-for="(item, index) in visible" :key="item.id" :toast="item" :index="index" :dismiss="onDismiss" :dismiss-label="labels?.dismiss ?? 'Dismiss toast'">
          <template v-if="slots.toast" #default="scope"><slot name="toast" v-bind="scope" /></template>
          <template v-if="slots.icon" #icon="scope"><slot name="icon" v-bind="scope" /></template>
        </ToastItem>
      </AnimatePresence>
    </ol>
  </Teleport>
</template>

<style scoped>
.be-toasts { display: flex; flex-direction: column; gap: .5rem; pointer-events: none; box-sizing: border-box; width: min(24rem, calc(100vw - 2rem)); max-width: 100%; padding: 0; margin: 0; list-style: none; }
.be-toasts[data-position^=bottom] { flex-direction: column-reverse; }
.be-toasts[data-placement=fixed] { position: fixed; z-index: 90; }
.be-toasts[data-placement=absolute] { position: absolute; z-index: 20; }
.be-toasts:not([data-placement=static])[data-position^=top] { top: max(1rem, env(safe-area-inset-top)); }
.be-toasts:not([data-placement=static])[data-position^=bottom] { bottom: max(1.5rem, env(safe-area-inset-bottom)); }
.be-toasts:not([data-placement=static])[data-position$=left] { left: max(1rem, env(safe-area-inset-left)); }
.be-toasts:not([data-placement=static])[data-position$=center] { left: 50%; transform: translateX(-50%); }
.be-toasts:not([data-placement=static])[data-position$=right] { right: max(1rem, env(safe-area-inset-right)); }
</style>
