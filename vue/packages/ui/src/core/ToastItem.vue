<script setup lang="ts">
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion-v'
import { computed, onBeforeUnmount, useTemplateRef } from 'vue'
import { easeOut, toastSpring } from './motion'
import { toastFocusChanged, type AnimatedToast, type ToastStatus } from './toasts'

const { toast, index, dismissLabel, dismiss } = defineProps<{
  toast: AnimatedToast; index: number; dismissLabel: string; dismiss?: (id: string) => void
}>()
defineSlots<{ default?(props: { toast: AnimatedToast }): unknown; icon?(props: { toast: AnimatedToast; status: ToastStatus }): unknown }>()
const reduce = useReducedMotion()
const item = useTemplateRef<{ $el: HTMLElement }>('item')
const status = computed(() => toast.status ?? 'neutral')
const canDismiss = computed(() => Boolean(dismiss) && toast.dismissible !== false)
const contentFrom = computed(() => reduce.value ? { opacity: 0 } : { opacity: 0, y: 8, filter: 'blur(6px)' })
const contentTo = computed(() => reduce.value ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' })
const swapTransition = { duration: .28, ease: easeOut }
const icons: Record<ToastStatus, string> = {
  neutral: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 20a2 2 0 0 0 4 0',
  success: 'm4 12 5 5L20 6', loading: 'M20 12a8 8 0 1 1-8-8',
  info: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 11v6m0-10v.5',
  error: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 7v6m0 3v.5',
}
function dragEnd(_event: PointerEvent, info: PanInfo) {
  if (canDismiss.value && (Math.abs(info.offset.x) > 72 || Math.abs(info.velocity.x) > 520)) dismiss?.(toast.id)
}
function blur(event: FocusEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) toastFocusChanged(toast, false)
}
onBeforeUnmount(() => {
  if (item.value?.$el) item.value.$el.inert = true
  toastFocusChanged(toast, false)
})
</script>

<template>
  <motion.li ref="item" class="be-toast" :data-status="status" :style="{ zIndex: 20 - index }" :layout="!reduce"
    :initial="reduce ? { opacity: 0 } : { opacity: 0, y: 22, scale: .96, filter: 'blur(10px)' }"
    :animate="reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }"
    :exit="reduce ? { opacity: 0 } : { opacity: 0, x: 32, scale: .96, filter: 'blur(8px)', transition: { duration: .18, ease: easeOut } }"
    :transition="reduce ? { duration: .15 } : toastSpring" :drag="canDismiss && !reduce ? 'x' : false" :drag-constraints="{ left: 0, right: 0 }" :drag-elastic=".18"
    @drag-end="dragEnd" @focusin="toastFocusChanged(toast, true)" @focusout="blur">
    <div class="be-toast-surface">
      <slot :toast="toast">
        <div class="be-toast-row" :data-detail="Boolean(toast.description || toast.action)">
          <div class="be-toast-icon" aria-hidden="true">
            <AnimatePresence :initial="false" mode="popLayout">
              <motion.span :key="status" class="be-icon-inner" :initial="contentFrom" :animate="contentTo" :exit="{ opacity: 0 }" :transition="swapTransition">
                <slot name="icon" :toast="toast" :status="status"><svg viewBox="0 0 24 24" class="be-glyph" :data-spin="status === 'loading'"><path :d="icons[status]" /></svg></slot>
              </motion.span>
            </AnimatePresence>
          </div>
          <div class="be-toast-body">
            <AnimatePresence :initial="false" mode="popLayout">
              <motion.div :key="`${status}-${toast.title}`" :initial="contentFrom" :animate="contentTo" :exit="{ opacity: 0 }" :transition="swapTransition">
                <p class="be-title">{{ toast.title }}</p><p v-if="toast.description" class="be-description">{{ toast.description }}</p>
              </motion.div>
            </AnimatePresence>
            <button v-if="toast.action" class="be-action" type="button" @click="toast.action.onClick(toast)">{{ toast.action.label }}</button>
          </div>
          <button v-if="canDismiss" class="be-close" type="button" :aria-label="dismissLabel" @click="dismiss?.(toast.id)"><svg class="be-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
        </div>
      </slot>
    </div>
  </motion.li>
</template>

<style scoped>
.be-toast { position: relative; pointer-events: auto; touch-action: pan-y; list-style: none; margin: 0; }
.be-toast[inert] { pointer-events: none; }
.be-toast-surface { overflow: hidden; padding: .75rem; border-radius: 1rem; border: 1px solid var(--beui-border); background: color-mix(in srgb, var(--beui-card) 95%, transparent); color: var(--beui-foreground); box-shadow: 0 20px 30px -12px rgb(0 0 0 / .22); backdrop-filter: blur(16px); }
.be-toast-row { display: flex; align-items: center; gap: .75rem; } .be-toast-row[data-detail=true] { align-items: flex-start; }
.be-toast-icon, .be-close { display: inline-grid; place-items: center; width: 1.75rem; height: 1.75rem; flex: none; border-radius: 50%; }
.be-toast-icon { position: relative; background: var(--beui-muted); color: var(--beui-muted-foreground); }
.be-toast-row[data-detail=true] .be-toast-icon { margin-top: .125rem; }
.be-toast:is([data-status=info],[data-status=loading]) .be-toast-icon { color: var(--beui-primary); }
.be-toast[data-status=success] .be-toast-icon { color: #00835a; background: rgb(16 185 129 / .13); }
.be-toast[data-status=error] .be-toast-icon { color: var(--beui-destructive); background: color-mix(in srgb, var(--beui-destructive) 12%, transparent); }
.be-icon-inner { display: inline-flex; } .be-glyph { width: 14px; height: 14px; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
.be-toast-body { position: relative; flex: 1; min-width: 0; } .be-title,.be-description { margin: 0; text-align: start; }
.be-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .875rem; line-height: 1.25rem; font-weight: 500; }
.be-description { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; margin-top: .125rem; color: var(--beui-muted-foreground); font-size: .75rem; line-height: 1rem; }
.be-action, .be-close { border: 0; cursor: pointer; font: inherit; color: var(--beui-muted-foreground); }
.be-close { background: transparent; } .be-action { border-radius: 999px; background: var(--beui-muted); margin-top: .5rem; padding: .25rem .75rem; font-size: .75rem; color: var(--beui-foreground); }
.be-close:hover, .be-action:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.be-action:focus-visible, .be-close:focus-visible { outline: 2px solid var(--beui-ring); }
@media (prefers-reduced-motion: no-preference) { .be-glyph[data-spin=true] { animation: be-spin 1s linear infinite; } }
@keyframes be-spin { to { transform: rotate(360deg); } }
</style>
