<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const messageScrollerMessages = {
  label: 'Conversation',
  navigationLabel: 'Message navigation',
  preview: 'Message',
  goToUser: 'Go to user message {index} of {total}',
  goToAssistant: 'Go to assistant message {index} of {total}',
  goToMessage: 'Go to conversation message {index} of {total}',
}
export type MessageScrollerMessages = typeof messageScrollerMessages
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import PreviewRail, { type PreviewRailItem } from '../layout/PreviewRail.vue'

const props = withDefaults(defineProps<{
  /** Keep streamed output pinned while the reader remains near the end. */
  followOutput?: boolean
  /** Distance from the end that still counts as following the output. */
  followThreshold?: number
  /** Smoothly follow growing content. */
  smooth?: boolean
  /** Accessible label for the scrollable transcript. */
  label?: string
  /** Marks the transcript as waiting for more streamed content. */
  busy?: boolean
  /** Adds a compact rail for navigating between rendered Message rows. */
  navigation?: 'rail'
  /** Accessible label for the optional message navigation rail. */
  navigationLabel?: string
  viewportClassName?: string
  contentClassName?: string
  railClassName?: string
  className?: string
  /** Mirrors the React `viewportRef`: a callback or a ref-like object. */
  viewportRef?: ((node: HTMLElement | null) => void) | { value: HTMLElement | null } | null
  /** Extra attributes for the scrollable section. Handlers are composed, not replaced. */
  viewportProps?: {
    onScroll?: (event: Event) => void
    onWheel?: (event: WheelEvent) => void
    onTouchStart?: (event: TouchEvent) => void
    onKeyDown?: (event: KeyboardEvent) => void
    [key: string]: unknown
  }
  /** Extra attributes for the log container. */
  contentProps?: Record<string, unknown>
  /** Override any built-in string. */
  labels?: Partial<MessageScrollerMessages>
}>(), { followOutput: true, followThreshold: 56, smooth: true })

const emit = defineEmits<{ followChange: [following: boolean] }>()
defineSlots<{ default?(): unknown }>()

const PREVIEW_TITLE_LENGTH = 56
const PREVIEW_DESCRIPTION_LENGTH = 88
const HANDLER_KEYS = ['onScroll', 'onWheel', 'onTouchStart', 'onKeyDown'] as const

const reduce = useReducedMotion()
const text = computed(() => ({ ...messageScrollerMessages, ...props.labels }))

const viewportEl = shallowRef<HTMLElement | null>(null)
const contentEl = useTemplateRef<HTMLElement>('contentEl')
const railItems = shallowRef<PreviewRailItem[]>([])
const activeRailId = shallowRef('')
const railOverflowing = shallowRef(false)

let following = props.followOutput
let programmatic = false
let scrollTimer: ReturnType<typeof setTimeout> | undefined
let followFrame = 0
let railFrame = 0
const railIds = new WeakMap<HTMLElement, string>()
let railIdCounter = 0
let railTargets = new Map<string, HTMLElement>()
let contentObserver: ResizeObserver | undefined
let railMutation: MutationObserver | undefined
let railResize: ResizeObserver | undefined

const viewportRest = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props.viewportProps ?? {})) {
    if (!(HANDLER_KEYS as readonly string[]).includes(key)) rest[key] = value
  }
  return rest
})

const ariaLabel = computed(() => props.label ?? text.value.label)

const railNavClass = computed(() => [
  'be-ms-rail',
  railOverflowing.value ? 'be-ms-rail-on' : 'be-ms-rail-off',
  props.railClassName,
].filter(Boolean).join(' '))

function setViewport(node: unknown) {
  const element = node instanceof HTMLElement ? node : null
  viewportEl.value = element
  const external = props.viewportRef
  if (typeof external === 'function') external(element)
  else if (external && typeof external === 'object') external.value = element
}

function truncateMessageText(value: string, limit: number) {
  if (value.length <= limit) return value
  const excerpt = value.slice(0, limit)
  const boundary = excerpt.lastIndexOf(' ')
  return `${excerpt.slice(0, boundary > limit * 0.65 ? boundary : limit).trim()}…`
}

function getMessageText(message: HTMLElement) {
  const surface = message.querySelector<HTMLElement>('[data-slot="message-bubble-content"]')
    ?? message.querySelector<HTMLElement>('[data-slot="message-content"]')
    ?? message
  return (surface.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function getMessagePreview(message: HTMLElement, emptyLabel: string, assistantResponse?: HTMLElement) {
  const value = getMessageText(message)
  if (!value) return { label: emptyLabel, description: undefined as string | undefined }

  if (value.length <= PREVIEW_TITLE_LENGTH) {
    const responseText = assistantResponse ? getMessageText(assistantResponse) : ''
    return {
      label: value,
      description: responseText ? truncateMessageText(responseText, PREVIEW_DESCRIPTION_LENGTH) : undefined,
    }
  }

  const titleExcerpt = value.slice(0, PREVIEW_TITLE_LENGTH)
  const titleBoundary = titleExcerpt.lastIndexOf(' ')
  const titleEnd = titleBoundary > PREVIEW_TITLE_LENGTH * 0.65 ? titleBoundary : PREVIEW_TITLE_LENGTH
  const label = `${value.slice(0, titleEnd).trim()}…`
  const responseText = assistantResponse ? getMessageText(assistantResponse) : value.slice(titleEnd).trim()
  return {
    label,
    description: responseText ? truncateMessageText(responseText, PREVIEW_DESCRIPTION_LENGTH) : undefined,
  }
}

function setFollowing(next: boolean) {
  if (following === next) return
  following = next
  emit('followChange', next)
}

function updateActiveRailItem() {
  if (props.navigation !== 'rail') return
  const viewport = viewportEl.value
  const targets = [...railTargets.entries()]
  if (!viewport || targets.length === 0) return

  const viewportRect = viewport.getBoundingClientRect()
  if (viewport.scrollTop <= props.followThreshold) {
    const firstId = targets[0]?.[0] ?? ''
    if (activeRailId.value !== firstId) activeRailId.value = firstId
    return
  }

  const distanceFromEnd = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
  if (distanceFromEnd <= props.followThreshold) {
    const lastId = targets[targets.length - 1]?.[0] ?? ''
    if (activeRailId.value !== lastId) activeRailId.value = lastId
    return
  }

  const viewportCenter = viewportRect.top + viewportRect.height / 2
  let nearestId = targets[0]?.[0] ?? ''
  let nearestDistance = Number.POSITIVE_INFINITY

  for (const [id, element] of targets) {
    const rect = element.getBoundingClientRect()
    const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestId = id
    }
  }

  if (activeRailId.value !== nearestId) activeRailId.value = nearestId
}

function syncRailItems() {
  if (props.navigation !== 'rail') return
  const content = contentEl.value
  const viewport = viewportEl.value
  if (!content || !viewport) return

  const messages = Array.from(content.querySelectorAll<HTMLElement>('[data-slot="message"]'))
  const targets = new Map<string, HTMLElement>()
  const nextItems = messages.map((message, index) => {
    let id = railIds.get(message)
    if (!id) {
      railIdCounter += 1
      id = `message-rail-${railIdCounter}`
      railIds.set(message, id)
    }
    targets.set(id, message)
    const sender = message.dataset.from ?? 'conversation'
    const assistantResponse = sender === 'user'
      ? messages.slice(index + 1).find(candidate => candidate.dataset.from === 'assistant')
      : undefined
    const preview = getMessagePreview(message, text.value.preview, assistantResponse)
    const key = sender === 'user' ? 'goToUser' : sender === 'assistant' ? 'goToAssistant' : 'goToMessage'

    return {
      id,
      label: preview.label,
      description: preview.description,
      ariaLabel: text.value[key]
        .replace('{index}', String(index + 1))
        .replace('{total}', String(messages.length)),
    }
  })

  railTargets = targets
  const current = railItems.value
  const unchanged = current.length === nextItems.length && current.every((item, index) =>
    item.id === nextItems[index]?.id
    && item.label === nextItems[index]?.label
    && item.description === nextItems[index]?.description
    && item.ariaLabel === nextItems[index]?.ariaLabel)
  if (!unchanged) railItems.value = nextItems
  railOverflowing.value = viewport.scrollHeight > viewport.clientHeight + 1 && messages.length > 1
}

function scheduleRailSync() {
  if (props.navigation !== 'rail') return
  if (railFrame) cancelAnimationFrame(railFrame)
  railFrame = requestAnimationFrame(() => {
    railFrame = 0
    syncRailItems()
    updateActiveRailItem()
  })
}

function scrollToEnd(behavior: ScrollBehavior) {
  const viewport = viewportEl.value
  if (!viewport) return

  programmatic = true
  if (typeof viewport.scrollTo === 'function') viewport.scrollTo({ top: viewport.scrollHeight, behavior })
  else viewport.scrollTop = viewport.scrollHeight
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => { programmatic = false }, behavior === 'smooth' ? 320 : 0)
}

function leaveLiveEdge() { programmatic = false }

function handleScroll(event: Event) {
  const viewport = viewportEl.value
  if (viewport && !programmatic) {
    const distance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
    setFollowing(distance <= props.followThreshold)
    updateActiveRailItem()
  }
  props.viewportProps?.onScroll?.(event)
}

function handleWheel(event: WheelEvent) {
  leaveLiveEdge()
  props.viewportProps?.onWheel?.(event)
}

function handleTouchStart(event: TouchEvent) {
  leaveLiveEdge()
  props.viewportProps?.onTouchStart?.(event)
}

function handleKeyDown(event: KeyboardEvent) {
  if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) leaveLiveEdge()
  props.viewportProps?.onKeyDown?.(event)
}

// The layout-effect equivalent: follow output on mount and whenever the flag
// flips, jumping (never smoothing) so a fresh transcript lands at its live edge.
function followOutputToEnd() {
  following = props.followOutput
  if (!props.followOutput) return
  if (followFrame) cancelAnimationFrame(followFrame)
  followFrame = requestAnimationFrame(() => {
    followFrame = 0
    scrollToEnd('auto')
  })
}

function startContentObserver() {
  contentObserver?.disconnect()
  contentObserver = undefined
  const content = contentEl.value
  if (!content || typeof ResizeObserver === 'undefined') return

  contentObserver = new ResizeObserver(() => {
    scheduleRailSync()
    if (!props.followOutput || !following) return
    scrollToEnd(reduce.value || !props.smooth ? 'auto' : 'smooth')
  })
  contentObserver.observe(content)
}

function stopRailObservers() {
  railMutation?.disconnect()
  railResize?.disconnect()
  railMutation = undefined
  railResize = undefined
}

function startRailObservers() {
  stopRailObservers()
  if (props.navigation !== 'rail') {
    railTargets.clear()
    railItems.value = []
    railOverflowing.value = false
    return
  }

  const content = contentEl.value
  const viewport = viewportEl.value
  if (!content || !viewport) return

  scheduleRailSync()
  railMutation = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(scheduleRailSync)
  railMutation?.observe(content, { childList: true, characterData: true, subtree: true })

  railResize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(scheduleRailSync)
  railResize?.observe(content)
  railResize?.observe(viewport)
}

function scrollToRailItem(item: PreviewRailItem) {
  const viewport = viewportEl.value
  const target = railTargets.get(item.id)
  if (!viewport || !target) return

  const lastItem = railItems.value[railItems.value.length - 1]?.id === item.id
  activeRailId.value = item.id
  if (lastItem) {
    setFollowing(true)
    scrollToEnd(reduce.value || !props.smooth ? 'auto' : 'smooth')
    return
  }

  setFollowing(false)
  programmatic = true
  const viewportRect = viewport.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const top = viewport.scrollTop + targetRect.top - viewportRect.top - (viewport.clientHeight - targetRect.height) / 2
  const behavior = reduce.value || !props.smooth ? 'auto' : 'smooth'

  if (typeof viewport.scrollTo === 'function') viewport.scrollTo({ top, behavior })
  else viewport.scrollTop = top
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => { programmatic = false }, behavior === 'smooth' ? 320 : 0)
}

watch(() => props.followOutput, followOutputToEnd, { flush: 'post' })
// A late locale switch rewrites the rail labels; the React layout effect did the same.
watch(text, () => scheduleRailSync(), { flush: 'post' })
watch(() => props.navigation, () => startRailObservers(), { flush: 'post' })

onMounted(async () => {
  await nextTick()
  startContentObserver()
  startRailObservers()
  followOutputToEnd()
})

onBeforeUnmount(() => {
  if (scrollTimer) clearTimeout(scrollTimer)
  if (followFrame) cancelAnimationFrame(followFrame)
  if (railFrame) cancelAnimationFrame(railFrame)
  contentObserver?.disconnect()
  stopRailObservers()
})
</script>

<template>
  <div class="be-message-scroller" :class="className" data-slot="message-scroller">
    <PreviewRail
      v-if="navigation === 'rail'"
      :items="railOverflowing ? railItems : []"
      :label="navigationLabel ?? text.navigationLabel"
      :active-id="activeRailId"
      preview-side="before"
      highlight-active
      :item-size="14"
      class-name="be-ms-shell"
      :rail-class-name="railNavClass"
      preview-container-class-name="be-ms-preview"
      preview-class-name="be-ms-card"
      @select="scrollToRailItem">
      <!-- The single viewport node, rendered inside the rail's content cell. -->
      <section
        :ref="setViewport"
        :aria-label="ariaLabel"
        v-bind="viewportRest"
        class="be-ms-viewport"
        :data-rail="navigation === 'rail' ? '' : undefined"
        :class="[viewportClassName, { 'be-ms-viewport-padded': navigation === 'rail' && railOverflowing }]"
        @scroll="handleScroll"
        @wheel="handleWheel"
        @touchstart="handleTouchStart"
        @keydown="handleKeyDown">
        <div
          ref="contentEl"
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          :aria-busy="busy"
          :class="contentClassName"
          v-bind="contentProps">
          <slot />
        </div>
      </section>
    </PreviewRail>
    <section
      v-else
      :ref="setViewport"
      :aria-label="ariaLabel"
      v-bind="viewportRest"
      class="be-ms-viewport"
      :class="viewportClassName"
      @scroll="handleScroll"
      @wheel="handleWheel"
      @touchstart="handleTouchStart"
      @keydown="handleKeyDown">
      <div
        ref="contentEl"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        :aria-busy="busy"
        :class="contentClassName"
        v-bind="contentProps">
        <slot />
      </div>
    </section>
  </div>
</template>

<style scoped>
.be-message-scroller { min-height: 0; }

.be-ms-viewport {
  box-sizing: border-box;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  outline: none;
  overflow-anchor: none;
}
.be-ms-viewport:focus-visible { box-shadow: inset 0 0 0 2px var(--beui-ring); }
.be-ms-viewport[data-rail] { -ms-overflow-style: none; scrollbar-width: none; }
.be-ms-viewport[data-rail]::-webkit-scrollbar { display: none; }
.be-ms-viewport:not([data-rail]) { scrollbar-gutter: stable; }
.be-message-scroller .be-ms-viewport.be-ms-viewport-padded { padding-inline-end: 2.5rem; }

/* Rail shell: the scroller fills the PreviewRail and clips the preview card. */
.be-message-scroller :deep(.be-ms-shell) {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* The rail sits on the right edge, one 14px tick per message. */
.be-message-scroller :deep(.be-ms-rail) {
  position: absolute;
  inset-block: 0.75rem;
  inset-inline-end: 0.25rem;
  width: 1.75rem;
  padding-block: 0.25rem;
  align-content: center;
}
.be-message-scroller :deep(.be-ms-rail-off) { pointer-events: none; opacity: 0; }
.be-message-scroller :deep(.be-ms-rail-on) { pointer-events: auto; opacity: 1; }
.be-message-scroller :deep(.be-ms-rail .rail-item) { width: 1.75rem; justify-content: flex-end; }
.be-message-scroller :deep(.be-ms-rail .rail-tick) { width: 1rem; height: 1px; transform-origin: right; }

/* The preview card sits left of the rail and keeps to two short lines. */
.be-message-scroller :deep(.be-ms-preview.is-before) { inset-inline-start: 0.75rem; inset-inline-end: 2rem; }
.be-message-scroller :deep(.be-ms-card) { width: 16rem; max-width: 100%; margin-inline-end: 0.25rem; }
.be-message-scroller :deep(.be-ms-card .preview-card) {
  height: 5rem;
  padding: 0.75rem;
  overflow: hidden;
}
.be-message-scroller :deep(.be-ms-card .preview-title) {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  font-size: 0.75rem;
  line-height: 1rem;
}
.be-message-scroller :deep(.be-ms-card .preview-description) {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 0.75rem;
  line-height: 1rem;
}
</style>
