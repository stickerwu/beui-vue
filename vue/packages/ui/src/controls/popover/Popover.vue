<script setup lang="ts">
import { animate, useMotionValue } from 'motion-v'
import { useReducedMotion } from '../../core/reduced-motion'
import { computed, onBeforeUnmount, onMounted, onUpdated, provide, shallowRef, useId, useSlots, useTemplateRef, watch, watchEffect, type StyleValue, type VNode } from 'vue'
import ButtonBase from '../../ButtonBase.vue'
import { buildGeo, clipForProgress, supportsShapeClip, triggerCutout, type Align, type Side } from './pop-geometry'
import { POPOVER_PARTS_KEY, createHoverGesture, createTapGesture, elementOf, firstElement, useDismiss, usePortalPosition, type PopoverPart } from './pop-helpers'
import PopoverContent from './PopoverContent.vue'

/**
 * A popover whose panel oozes out of the trigger as one liquid body: a blurred,
 * alpha-sharpened copy of the trigger pill and a morphing blob share a clip, so
 * the neck stretches between them and the content reveals with it. Click or
 * hover triggered. Ported from `components/motion/popover.tsx`.
 */
const props = withDefaults(defineProps<{
  /** How the popover is summoned. */
  trigger?: 'click' | 'hover'
  /** Which side of the trigger the panel oozes out of. */
  side?: Side
  /** Alignment along the trigger's edge. */
  align?: Align
  /** Gap between trigger and panel, in px: the length of the gooey neck. */
  sideOffset?: number
  /** Corner radius of the open panel, in px. */
  panelRadius?: number
  /** Blur radius feeding the goo filter; higher melts more. */
  gooStrength?: number
  /** Accessible name of the panel (and the built-in trigger's text when no `#trigger` slot is given). */
  label?: string
  /** Use the `#trigger` slot's own element as the trigger instead of a built-in button. */
  asChild?: boolean
  /** Variant of the built-in trigger button. */
  triggerVariant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  contentClass?: string
  contentStyle?: StyleValue
  defaultOpen?: boolean
}>(), { trigger: 'click', side: 'bottom', align: 'center', sideOffset: 14, panelRadius: 16, gooStrength: 8, triggerVariant: 'secondary', defaultOpen: false })

const open = defineModel<boolean | undefined>('open')
defineSlots<{
  /** The trigger. With `asChild` its own element is the trigger; otherwise it is the label of the built-in button. */
  trigger?(): unknown
  /** Panel content, or `PopoverTrigger` and `PopoverContent` when composed from parts. `close` shuts the popover. */
  default?(props: { close: () => void }): unknown
}>()
const slots = useSlots()

// Composed from parts: the default slot holds `PopoverTrigger` (rendered in place, as the trigger)
// and `PopoverContent` (which hands the panel's content and classes over).
const part = shallowRef<PopoverPart | null>(null)
provide(POPOVER_PARTS_KEY, {
  register: next => { part.value = next },
  unregister: next => { if (part.value === next) part.value = null },
})
function findContent(nodes: unknown): boolean {
  return Array.isArray(nodes) && nodes.some((node: VNode) => node.type === PopoverContent || (typeof node.type === 'symbol' && findContent(node.children)))
}
const composed = computed(() => findContent(slots.default?.({ close: () => {} })))
const PanelRender = () => composed.value ? part.value?.slots.default?.({ close }) : slots.default?.({ close })

// Open state: controlled through `v-model:open`, otherwise internal.
const internalOpen = shallowRef(props.defaultOpen)
const isOpen = computed(() => open.value ?? internalOpen.value)
function setOpen(next: boolean) {
  if (open.value === undefined) internalOpen.value = next
  open.value = next
}

// This morph needs less bounce than layout motion: too much overshoot makes the
// liquid neck balloon past the final panel edges.
const GOO_OPEN_SPRING = { type: 'spring', visualDuration: 0.3, bounce: 0.15 } as const
const GOO_CLOSE_SPRING = { type: 'spring', visualDuration: 0.21, bounce: 0.15 } as const
const HOVER_CLOSE_DELAY = 120
const ALIGN_ORIGIN = { start: 'left', center: 'center', end: 'right' } as const

const reducedMotion = useReducedMotion()
const reduce = computed(() => Boolean(reducedMotion.value))
const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
const gooId = `be-goo-${uid}`
const contentId = `be-popover-${uid}`

const root = useTemplateRef<HTMLElement>('root')
const host = useTemplateRef<HTMLElement>('host')
const button = useTemplateRef<unknown>('button')
const contentEl = useTemplateRef<HTMLElement>('contentEl')
const blob = useTemplateRef<HTMLElement>('blob')
const clipEl = useTemplateRef<HTMLElement>('clipEl')
const triggerEl = shallowRef<HTMLElement | null>(null)
const portalReady = shallowRef(false)

function resolveTrigger() {
  const next = props.asChild || composed.value ? firstElement(host.value) : elementOf(button.value)
  if (next !== triggerEl.value) triggerEl.value = next
}
onMounted(() => { portalReady.value = true; resolveTrigger() })
onUpdated(resolveTrigger)

const progress = useMotionValue(props.defaultOpen ? 1 : 0)
const closedAtRest = shallowRef(!isOpen.value && progress.get() === 0)
// Show the layer again in the render that opens.
watch(isOpen, value => { if (value) closedAtRest.value = false }, { flush: 'sync' })

let animation: { stop: () => void } | undefined
function run() {
  animation?.stop()
  animation = animate(progress, isOpen.value ? 1 : 0, {
    ...(reduce.value ? { duration: 0 } : isOpen.value ? GOO_OPEN_SPRING : GOO_CLOSE_SPRING),
    onComplete: () => { if (!isOpen.value) closedAtRest.value = true },
  })
}
watch([isOpen, reduce], run)

// Hover handling ------------------------------------------------------------
let closeTimer: number | undefined
function cancelClose() { if (closeTimer !== undefined) window.clearTimeout(closeTimer); closeTimer = undefined }
function openHover() { cancelClose(); setOpen(true) }
function scheduleClose() { cancelClose(); closeTimer = window.setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY) }
const rootHover = createHoverGesture()
const panelHover = createHoverGesture()
function rootEnter(event: PointerEvent) { if (props.trigger === 'hover' && rootHover.enter(event)) openHover() }
function rootLeave(event: PointerEvent) { if (props.trigger === 'hover' && rootHover.leave(event)) scheduleClose() }
function panelEnter(event: PointerEvent) { if (props.trigger === 'hover' && panelHover.enter(event)) openHover() }
function panelLeave(event: PointerEvent) { if (props.trigger === 'hover' && panelHover.leave(event)) scheduleClose() }

// The panel is a `role="dialog"` and goes inert the moment it closes, so focus
// cannot be left sitting inside it: Escape hands it back to the trigger.
function close() {
  setOpen(false)
  const focused = document.activeElement
  if (focused instanceof HTMLElement && contentEl.value?.contains(focused)) triggerEl.value?.focus()
}
// The panel is portalled, so both trees count as inside.
useDismiss(isOpen, close, target => Boolean(root.value?.contains(target) || contentEl.value?.contains(target)))

// Trigger wiring --------------------------------------------------------------
const tap = createTapGesture<boolean>()
watch([triggerEl, () => props.trigger], ([el], _, cleanup) => {
  if (!el) return
  const listeners: [string, EventListener][] = props.trigger === 'hover'
    ? [
        ['focus', () => openHover()],
        ['blur', () => scheduleClose()],
        ['pointerdown', ((event: PointerEvent) => tap.start(event, isOpen.value)) as EventListener],
        ['pointercancel', () => tap.drop()],
        ['keydown', () => tap.drop()],
        ['click', (event: Event) => {
          if (event.defaultPrevented) return
          const gesture = tap.take()
          if (!gesture || gesture.pointerType === 'mouse') return
          setOpen(!gesture.state)
        }],
      ]
    : [['click', (event: Event) => { if (!event.defaultPrevented) setOpen(!isOpen.value) }]]
  for (const [name, handler] of listeners) el.addEventListener(name, handler)
  cleanup(() => { for (const [name, handler] of listeners) el.removeEventListener(name, handler) })
}, { immediate: true, flush: 'post' })
watchEffect(() => {
  const el = triggerEl.value
  if (!el) return
  el.setAttribute('aria-haspopup', 'dialog')
  el.setAttribute('aria-expanded', String(isOpen.value))
  if (isOpen.value) el.setAttribute('aria-controls', contentId)
  else el.removeAttribute('aria-controls')
  el.dataset.state = isOpen.value ? 'open' : 'closed'
})

// Geometry ----------------------------------------------------------------------
const { layout } = usePortalPosition(triggerEl, contentEl, portalReady)
const geo = computed(() => buildGeo(
  layout.value?.trigger.width ?? 0, layout.value?.trigger.height ?? 0,
  layout.value?.content.width ?? 0, layout.value?.content.height ?? 0,
  props.side, props.align, props.sideOffset, props.panelRadius,
))
const cutout = computed(() => triggerCutout(geo.value))

// Morph the same clip on the goo body and the content, so the whole popover
// oozes as one and the text reveals with it.
let shape = false
function render(progressValue: number) {
  const g = geo.value
  if (!layout.value || g.layerW === 0) return
  const clip = clipForProgress(g, progressValue, shape)
  if (blob.value) blob.value.style.clipPath = clip
  if (clipEl.value) clipEl.value.style.clipPath = clip
}
watch([geo, blob, clipEl], () => { shape = supportsShapeClip(); render(progress.get()) }, { flush: 'post' })
const stopChange = progress.on('change', render)
onBeforeUnmount(() => { stopChange(); animation?.stop(); cancelClose() })

const portalStyle = computed(() => ({
  visibility: layout.value && !closedAtRest.value ? 'visible' : 'hidden',
  transform: `translate3d(${layout.value?.trigger.left ?? 0}px, ${layout.value?.trigger.top ?? 0}px, 0)`,
}) as const)
const boxStyle = computed(() => ({ left: `${geo.value.left}px`, top: `${geo.value.top}px`, width: `${geo.value.layerW}px`, height: `${geo.value.layerH}px` }))

defineExpose({ close, open: () => setOpen(true) })
</script>

<template>
  <span ref="root" class="be-popover" @pointerenter="rootEnter" @pointerleave="rootLeave">
    <span v-if="asChild || composed" ref="host" class="be-pop-host"><slot name="trigger" /><slot v-if="composed" :close="close" /></span>
    <ButtonBase v-else ref="button" :variant="triggerVariant"><slot name="trigger">{{ label }}</slot></ButtonBase>
    <Teleport v-if="portalReady" to="body">
      <div data-popover-portal="" class="be-pop-portal" :style="portalStyle">
        <!-- Goo filter: blur, sharpen the alpha back into solid shapes, then lay the crisp original on top so blobs merge with liquid edges. -->
        <svg aria-hidden="true" width="0" height="0" class="be-pop-svg">
          <defs>
            <filter :id="gooId" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" :stdDeviation="gooStrength" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>
        <!-- Goo body: static trigger pill + morphing blob. -->
        <div aria-hidden="true" class="be-pop-goo" :style="{ ...boxStyle, filter: reduce ? undefined : `url(#${gooId})`, clipPath: cutout }">
          <div class="be-pop-surface" :style="{ left: `${geo.trigger.x}px`, top: `${geo.trigger.y}px`, width: `${geo.trigger.w}px`, height: `${geo.trigger.h}px`, borderRadius: `${geo.trigger.r}px` }" />
          <div ref="blob" class="be-pop-surface be-pop-blob" />
        </div>
        <!-- Content is clipped by the same morph. The portal wrapper stays pointer-transparent; only the fully open panel accepts interaction. -->
        <div class="be-pop-layer" :style="boxStyle">
          <div ref="clipEl" class="be-pop-clip" :inert="!isOpen" :style="{ pointerEvents: isOpen ? 'auto' : 'none' }">
            <div ref="contentEl" :id="contentId" role="dialog" :aria-label="label" class="be-pop-dialog" :class="[contentClass, part?.attrs.class]"
              :style="[{ left: `${geo.panel.x}px`, top: `${geo.panel.y}px`, transformOrigin: `${ALIGN_ORIGIN[align]} ${side === 'bottom' ? 'top' : 'bottom'}` }, contentStyle, part?.attrs.style as StyleValue]"
              @pointerenter="panelEnter" @pointerleave="panelLeave">
              <PanelRender />
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </span>
</template>

<style scoped>
.be-popover { position: relative; display: inline-flex; isolation: isolate; }
.be-pop-host { display: contents; }
.be-pop-portal { pointer-events: none; position: fixed; left: 0; top: 0; z-index: 9999; isolation: isolate; width: 0; height: 0; }
.be-pop-svg { position: absolute; }
.be-pop-goo { pointer-events: none; position: absolute; z-index: -1; }
.be-pop-surface { position: absolute; background: var(--beui-card); }
.be-pop-blob { inset: 0; }
.be-pop-layer { pointer-events: none; position: absolute; z-index: 10; }
.be-pop-clip { position: absolute; inset: 0; }
.be-pop-dialog { position: absolute; box-sizing: border-box; color: var(--beui-foreground); outline: none; }
</style>

<style>
/* Zero specificity, so a `class` on `PopoverContent` (like `w-72` upstream) can resize the panel. */
:where(.be-pop-dialog) { width: max-content; max-width: min(92vw, 20rem); padding: 1rem; }
</style>
