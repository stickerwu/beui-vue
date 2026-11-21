<script setup lang="ts">
import { AnimatePresence, motion, type PanInfo } from 'motion-v'
import { useReducedMotion } from './reduced-motion'
import { computed, h, onBeforeUnmount, useSlots, type FunctionalComponent, type VNodeChild } from 'vue'
import { easeOut, toastSpring } from './motion'
import { toastFocusChanged, type AnimatedToast, type ToastClassNames, type ToastStatus } from './toasts'

const props = defineProps<{
  toast: AnimatedToast
  index: number
  dismissLabel: string
  dismiss?: (id: string) => void
  classNames?: ToastClassNames
  icons?: Partial<Record<ToastStatus, VNodeChild>>
}>()
defineSlots<{ default?(props: { toast: AnimatedToast }): unknown; icon?(props: { toast: AnimatedToast; status: ToastStatus }): unknown }>()

const Content: FunctionalComponent<{ value: VNodeChild }> = ({ value }) => value
Content.props = ['value']

// Lucide's own path data: the React original renders the icon components at
// 14px, so the shapes and stroke weight are kept exactly rather than redrawn.
const ICON_NODES: Record<ToastStatus, readonly (readonly [string, Record<string, string>])[]> = {
  neutral: [
    ['path', { d: 'M10.268 21a2 2 0 0 0 3.464 0' }],
    ['path', { d: 'M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326' }],
  ],
  info: [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['path', { d: 'M12 16v-4' }],
    ['path', { d: 'M12 8h.01' }],
  ],
  loading: [['path', { d: 'M21 12a9 9 0 1 1-6.219-8.56' }]],
  success: [['path', { d: 'M20 6 9 17l-5-5' }]],
  error: [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['line', { x1: '12', x2: '12', y1: '8', y2: '12' }],
    ['line', { x1: '12', x2: '12.01', y1: '16', y2: '16' }],
  ],
}

const StatusIcon: FunctionalComponent<{ status: ToastStatus }> = ({ status }) => h(
  'svg',
  {
    viewBox: '0 0 24 24',
    class: 'be-glyph',
    'aria-hidden': 'true',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  },
  ICON_NODES[status].map(([tag, attrs]) => h(tag, attrs)),
)
StatusIcon.props = ['status']

const reduce = useReducedMotion()
const slots = useSlots()

const status = computed(() => props.toast.status ?? 'neutral')
const canDismiss = computed(() => Boolean(props.dismiss) && props.toast.dismissible !== false)
// Truthiness, not presence: an empty description or a falsy action renders
// nothing, so the row keeps its compact centred layout.
const hasDetails = computed(() => Boolean(props.toast.description || props.toast.action))
const customIcon = computed(() => props.icons?.[status.value] ?? props.toast.icon)
const hasIconSlot = computed(() => Boolean(slots.icon))

// The title is part of the swap key in the original (`String(children)`), so a
// title change re-runs the content transition while a status-only update
// swaps the content too, and a description edit alone does not.
const titleKey = computed(() => {
  const title = props.toast.title
  return typeof title === 'string' || typeof title === 'number' ? String(title) : ''
})
const contentKey = computed(() => `${props.toast.id}-${status.value}-${titleKey.value}`)

// Content swaps in place — icon glyph and the title block both trade on the
// same 0.28s curve, entering from below and leaving upward.
const CONTENT_TRANSITION = { duration: 0.28, ease: easeOut }
const CONTENT_IN = { opacity: 0, y: 8, filter: 'blur(6px)' }
const CONTENT_OUT = { opacity: 0, y: -8, filter: 'blur(6px)' }
// The glyph swap scales as well: it grows from 0.8 and shrinks to 0.9, so a
// status change reads as one element trading with another.
const ICON_IN = { opacity: 0, y: 8, scale: 0.8, filter: 'blur(6px)' }
const ICON_OUT = { opacity: 0, y: -8, scale: 0.9, filter: 'blur(6px)' }
const REST = { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }

const enter = computed(() => (reduce.value
  ? { opacity: 0 }
  : { opacity: 0, y: 22, scale: 0.96, filter: 'blur(10px)' }))
const rest = computed(() => (reduce.value
  ? { opacity: 1 }
  : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }))
const leave = computed(() => (reduce.value
  ? { opacity: 0 }
  : { opacity: 0, x: 32, scale: 0.96, filter: 'blur(8px)', transition: { duration: 0.18, ease: easeOut } }))

function dragEnd(_event: PointerEvent, info: PanInfo) {
  if (!canDismiss.value) return
  // Either a long enough pull or a fast enough flick dismisses; anything less
  // springs back to the stack.
  if (Math.abs(info.offset.x) > 72 || Math.abs(info.velocity.x) > 520) props.dismiss?.(props.toast.id)
}

// A keyboard user who reaches a toast's action should not be raced by its
// countdown, so focus pauses the timer and leaving resumes what was left.
function onFocusIn() {
  toastFocusChanged(props.toast, true)
}
function onFocusOut(event: FocusEvent) {
  const next = event.relatedTarget
  if (next instanceof Node && (event.currentTarget as HTMLElement | null)?.contains(next)) return
  toastFocusChanged(props.toast, false)
}
onBeforeUnmount(() => toastFocusChanged(props.toast, false))
</script>

<template>
  <motion.li
    class="be-toast"
    :class="classNames?.item"
    :style="{ zIndex: 20 - index }"
    :layout="!reduce"
    :initial="enter"
    :animate="rest"
    :exit="leave"
    :transition="toastSpring"
    :drag="canDismiss && !reduce ? 'x' : false"
    :drag-constraints="{ left: 0, right: 0 }"
    :drag-elastic="0.18"
    @drag-end="dragEnd"
    @focusin="onFocusIn"
    @focusout="onFocusOut">
    <div class="be-toast-surface" :class="classNames?.surface">
      <slot :toast="toast">
        <div class="be-toast-row" :data-detail="hasDetails || undefined">
          <motion.span class="be-toast-icon" :class="classNames?.iconWrap" :layout="!reduce" :data-status="status">
            <AnimatePresence :initial="false" mode="popLayout">
              <motion.span
                :key="status"
                class="be-icon-inner"
                :initial="reduce ? { opacity: 0 } : ICON_IN"
                :animate="reduce ? { opacity: 1 } : REST"
                :exit="reduce ? { opacity: 0 } : ICON_OUT"
                :transition="CONTENT_TRANSITION">
                <span v-if="status === 'loading'" class="be-spin">
                  <Content v-if="customIcon !== undefined" :value="customIcon" />
                  <slot v-else-if="hasIconSlot" name="icon" :toast="toast" :status="status" />
                  <StatusIcon v-else :status="status" />
                </span>
                <template v-else>
                  <Content v-if="customIcon !== undefined" :value="customIcon" />
                  <slot v-else-if="hasIconSlot" name="icon" :toast="toast" :status="status" />
                  <StatusIcon v-else :status="status" />
                </template>
              </motion.span>
            </AnimatePresence>
          </motion.span>

          <div class="be-toast-body" :class="classNames?.content">
            <AnimatePresence :initial="false" mode="popLayout">
              <motion.div
                :key="contentKey"
                :initial="reduce ? { opacity: 0 } : CONTENT_IN"
                :animate="reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }"
                :exit="reduce ? { opacity: 0 } : CONTENT_OUT"
                :transition="CONTENT_TRANSITION">
                <p class="be-title" :class="classNames?.title"><Content :value="toast.title" /></p>
                <p v-if="toast.description" class="be-description" :class="classNames?.description">
                  <Content :value="toast.description" />
                </p>
              </motion.div>
            </AnimatePresence>

            <button
              v-if="toast.action"
              type="button"
              class="be-action"
              :class="classNames?.action"
              @click="toast.action?.onClick(toast)">
              <Content :value="toast.action.label" />
            </button>
          </div>

          <button
            v-if="canDismiss"
            type="button"
            class="be-close"
            :class="classNames?.close"
            :aria-label="dismissLabel"
            @click="dismiss?.(toast.id)">
            <svg viewBox="0 0 24 24" class="be-glyph" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </slot>
    </div>
  </motion.li>
</template>

<style scoped>
.be-toast { position: relative; pointer-events: auto; will-change: transform; list-style: none; margin: 0; touch-action: pan-y; }
.be-toast-surface {
  position: relative; overflow: hidden; box-sizing: border-box;
  padding: .75rem; border: 1px solid var(--beui-border); border-radius: 1rem;
  background: color-mix(in srgb, var(--beui-card) 95%, transparent);
  color: var(--beui-foreground);
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / .25);
  -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px);
}
.be-toast-row { display: flex; align-items: center; gap: .75rem; }
.be-toast-row[data-detail] { align-items: flex-start; }
.be-toast-icon {
  position: relative; display: inline-flex; flex: none; align-items: center; justify-content: center;
  width: 1.75rem; height: 1.75rem; border-radius: 999px;
  color: var(--beui-muted-foreground);
  background: color-mix(in srgb, var(--beui-muted) 60%, transparent);
}
.be-toast-row[data-detail] .be-toast-icon { margin-top: .125rem; }
.be-toast-icon[data-status=info], .be-toast-icon[data-status=loading] { color: var(--beui-primary); background: var(--beui-muted); }
.be-toast-icon[data-status=success] { color: #059669; background: color-mix(in srgb, #10b981 10%, transparent); }
:global(.dark .be-toast-icon[data-status=success]) { color: #34d399; }
.be-toast-icon[data-status=error] { color: var(--beui-destructive); background: color-mix(in srgb, var(--beui-destructive) 10%, transparent); }
.be-icon-inner { display: inline-flex; }
.be-spin { display: inline-flex; }
.be-glyph { width: .875rem; height: .875rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.be-toast-body { position: relative; flex: 1 1 0%; min-width: 0; }
.be-title, .be-description { margin: 0; text-align: start; }
.be-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); }
.be-description {
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden;
  margin-top: .125rem; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground);
}
.be-action {
  display: inline-flex; align-items: center; height: 1.75rem; margin-top: .5rem; padding: 0 .75rem;
  border: 0; border-radius: 999px; cursor: pointer;
  background: color-mix(in srgb, var(--beui-muted) 80%, transparent);
  color: var(--beui-foreground); font: inherit; font-size: .75rem; font-weight: 500;
  transition: background-color .15s;
}
.be-action:hover { background: var(--beui-muted); }
.be-close {
  display: inline-flex; flex: none; align-items: center; justify-content: center;
  width: 1.75rem; height: 1.75rem; padding: 0; border: 0; border-radius: 999px;
  background: transparent; color: var(--beui-muted-foreground); cursor: pointer;
  transition: background-color .15s, color .15s;
}
.be-close:hover { background: color-mix(in srgb, var(--beui-muted) 80%, transparent); color: var(--beui-foreground); }
.be-toast :is(button):focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) { .be-spin { animation: be-spin 1s linear infinite; } }
@keyframes be-spin { to { transform: rotate(360deg); } }
</style>
