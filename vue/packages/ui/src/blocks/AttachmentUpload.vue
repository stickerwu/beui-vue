<script setup lang="ts">
import { AnimatePresence, LayoutGroup, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { useValue } from '../agents/shared'
import FloatingPanel from '../controls/FloatingPanel.vue'
import { easeOut, layoutSpring, pressSpring } from '../core/motion'
import { attachmentUploadMessages, formatMessage, type AttachmentUploadMessages } from './messages'
import {
  UploadGlyph,
  type AttachmentRejectReason,
  type AttachmentUploadClassNames,
  type AttachmentUploadItem,
  type AttachmentUploadKind,
} from './uploads'

export interface AttachmentUploadProps {
  value?: AttachmentUploadItem[]
  defaultValue?: AttachmentUploadItem[]
  /** Alias of `value`, kept from the original port. */
  modelValue?: AttachmentUploadItem[]
  /** Id of the attachment whose audio is playing, from `audioToggle`. */
  playingId?: string
  accept?: string
  multiple?: boolean
  maxFiles?: number
  maxFileSize?: number
  disabled?: boolean
  title?: string
  description?: string
  attachmentsLabel?: string
  /** Localizes byte formatting and the `{size}` in the description. */
  locale?: string
  labels?: Partial<AttachmentUploadMessages>
  className?: string
  classNames?: AttachmentUploadClassNames
}

/**
 * Port of `components/motion/attachment-upload.tsx` — the mixed attachment
 * workspace. Drag physics, the staggered arrival springs, the 900ms upload
 * sweep, the 420ms removal hold and the shared-layout image preview follow the
 * original; only the size/icon helpers moved to `uploads.ts`.
 */

const props = withDefaults(defineProps<AttachmentUploadProps>(), {
  defaultValue: () => [],
  multiple: true,
  maxFiles: 12,
  maxFileSize: 500 * 1024 * 1024,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [items: AttachmentUploadItem[]]
  valueChange: [items: AttachmentUploadItem[]]
  filesAdded: [items: AttachmentUploadItem[], files: File[]]
  filesRejected: [files: File[], reason: AttachmentRejectReason]
  remove: [item: AttachmentUploadItem]
  retry: [item: AttachmentUploadItem]
  audioToggle: [item: AttachmentUploadItem]
}>()

// Mirrors `ITEM_TRANSITION` and the lifecycle constants in the original.
const ITEM_TRANSITION = { duration: 0.2, ease: easeOut } as const
const UPLOAD_PROGRESS_MS = 900
const UPLOAD_COMPLETE_HOLD_MS = 1000
const REMOVE_PENDING_MS = 420

const WAVEFORM_BARS = [
  18, 31, 24, 39, 30, 43, 27, 18, 9, 29, 38, 24, 34, 18, 26, 37, 21, 14, 7, 11, 22, 35, 18, 26, 41, 29, 17, 33,
]

const reduce = useReducedMotion()
// The portal renders only on the client, after mount: the server has no body to
// teleport into, so the first client render must match the server's empty slot.
const mounted = shallowRef(false)
onMounted(() => { mounted.value = true })
const t = computed(() => ({ ...attachmentUploadMessages, ...props.labels }))
const locale = computed(() => props.locale)
const inputId = useId()
const input = useTemplateRef<HTMLInputElement>('input')
// `motion.button` renders a component, so its template ref is the instance and
// `$el` is the DOM node focus has to reach.
const previewClose = useTemplateRef<{ $el?: HTMLButtonElement }>('previewClose')
const instance = getCurrentInstance()

const dragDepth = shallowRef(0)
const dragging = shallowRef(false)
const previewItem = shallowRef<AttachmentUploadItem | null>(null)
// False the moment the preview starts leaving; the retained exit DOM is patched
// below so a fading dialog cannot still take a pointer or a tab stop.
const previewPresent = shallowRef(false)
const uploadingIds = shallowRef(new Set<string>())
const uploadCompleteIds = shallowRef(new Set<string>())
const removingIds = shallowRef(new Set<string>())

const { value: items, set: setItems } = useValue<AttachmentUploadItem[]>(
  () => props.modelValue ?? props.value,
  props.defaultValue,
  next => {
    emit('update:modelValue', next)
    emit('valueChange', next)
  },
)

const maxReached = computed(() => items.value.length >= props.maxFiles)
const uploadOrder = computed(() => Array.from(uploadingIds.value))
const previewSource = computed(() => (previewItem.value ? imageSource(previewItem.value) : undefined))
const previewLayoutId = computed(() => (previewItem.value ? `attachment-image-${previewItem.value.id}` : undefined))
const gateStyle = computed(() => (previewPresent.value ? { pointerEvents: 'auto' as const } : { pointerEvents: 'none' as const }))
// React checks `onRetry !== undefined` to decide whether a failed row offers a
// retry. Emit listeners are not props, so read the vnode's listener directly.
const retryable = computed(() => typeof instance?.vnode.props?.onRetry === 'function')

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

const UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const

/** `locale` localizes digits and unit names; without it the English `KB`/`MB` form stays. */
function formatUnit(value: number, unit: number, digits: number, withLocale?: string) {
  if (!withLocale) return `${value.toFixed(digits)} ${['B', 'KB', 'MB', 'GB'][unit]}`
  return new Intl.NumberFormat(withLocale, {
    style: 'unit',
    unit: UNITS[unit],
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

function formatBytes(bytes: number | undefined, withLocale?: string) {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) return null
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1)
  const value = bytes / 1024 ** exponent
  return formatUnit(value, exponent, value >= 10 || exponent === 0 ? 0 : 1, withLocale)
}

function formatDuration(seconds: number | undefined) {
  const safeSeconds = Math.max(0, Math.round(seconds ?? 0))
  const minutes = Math.floor(safeSeconds / 60)
  return `${minutes}:${String(safeSeconds % 60).padStart(2, '0')}`
}

function formatMaxSize(bytes: number, withLocale?: string) {
  const megabytes = bytes / (1024 * 1024)
  return formatUnit(megabytes, 2, Number.isInteger(megabytes) ? 0 : 1, withLocale)
}

function inferKind(file: File): AttachmentUploadKind {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'file'
}

function kindIcon(kind: AttachmentUploadKind) {
  if (kind === 'link') return 'link' as const
  if (kind === 'image') return 'fileImage' as const
  if (kind === 'audio') return 'mic' as const
  return 'paperclip' as const
}

function imageSource(item: AttachmentUploadItem) {
  if (item.kind !== 'image') return undefined
  return item.previewUrl ?? item.href
}

/* -------------------------------------------------------------------------- */
/* Lifecycle                                                                  */
/* -------------------------------------------------------------------------- */

const ownedUrls = new Set<string>()
const timers = new Set<ReturnType<typeof setTimeout>>()

function scheduleLifecycle(callback: () => void, delay: number) {
  const timer = setTimeout(() => {
    timers.delete(timer)
    callback()
  }, delay)
  timers.add(timer)
}

onBeforeUnmount(() => {
  for (const url of ownedUrls) URL.revokeObjectURL(url)
  ownedUrls.clear()
  for (const timer of timers) clearTimeout(timer)
  timers.clear()
})

function addFiles(incoming: File[]) {
  if (props.disabled || incoming.length === 0) return

  const availableSlots = Math.max(0, props.maxFiles - items.value.length)
  if (availableSlots === 0) {
    emit('filesRejected', incoming, 'max-files')
    return
  }

  const selectedFiles = incoming.slice(0, props.multiple ? availableSlots : Math.min(1, availableSlots))
  const oversized = selectedFiles.filter(file => file.size > props.maxFileSize)
  const accepted = selectedFiles.filter(file => file.size <= props.maxFileSize)

  if (oversized.length > 0) emit('filesRejected', oversized, 'too-large')
  if (incoming.length > selectedFiles.length) emit('filesRejected', incoming.slice(selectedFiles.length), 'max-files')

  const added: AttachmentUploadItem[] = accepted.map((file, index) => {
    const kind = inferKind(file)
    const objectUrl = URL.createObjectURL(file)
    ownedUrls.add(objectUrl)

    return {
      id: `${Date.now()}-${index}-${file.name}`,
      name: file.name,
      kind,
      size: file.size,
      previewUrl: kind === 'image' ? objectUrl : undefined,
      href: objectUrl,
      currentTime: kind === 'audio' ? 0 : undefined,
      duration: kind === 'audio' ? 0 : undefined,
      file,
    }
  })

  if (added.length === 0) return
  setItems([...items.value, ...added])
  const addedIds = added.map(item => item.id)
  uploadingIds.value = new Set([...uploadingIds.value, ...addedIds])
  scheduleLifecycle(
    () => {
      const uploading = new Set(uploadingIds.value)
      for (const id of addedIds) uploading.delete(id)
      uploadingIds.value = uploading
      uploadCompleteIds.value = new Set([...uploadCompleteIds.value, ...addedIds])
      scheduleLifecycle(() => {
        const complete = new Set(uploadCompleteIds.value)
        for (const id of addedIds) complete.delete(id)
        uploadCompleteIds.value = complete
      }, UPLOAD_COMPLETE_HOLD_MS)
    },
    reduce.value ? 140 : UPLOAD_PROGRESS_MS,
  )
  emit('filesAdded', added, accepted)
}

function finalizeRemove(item: AttachmentUploadItem) {
  const ownedUrl = [item.previewUrl, item.href].find((url): url is string => url !== undefined && ownedUrls.has(url))
  if (ownedUrl) {
    URL.revokeObjectURL(ownedUrl)
    ownedUrls.delete(ownedUrl)
  }
  if (previewItem.value?.id === item.id) closePreview()
  const uploading = new Set(uploadingIds.value)
  uploading.delete(item.id)
  uploadingIds.value = uploading
  const complete = new Set(uploadCompleteIds.value)
  complete.delete(item.id)
  uploadCompleteIds.value = complete
  setItems(items.value.filter(entry => entry.id !== item.id))
  emit('remove', item)
}

function requestRemove(item: AttachmentUploadItem) {
  if (removingIds.value.has(item.id)) return
  removingIds.value = new Set(removingIds.value).add(item.id)
  scheduleLifecycle(
    () => {
      finalizeRemove(item)
      const removing = new Set(removingIds.value)
      removing.delete(item.id)
      removingIds.value = removing
    },
    reduce.value ? 140 : REMOVE_PENDING_MS,
  )
}

function retryItem(item: AttachmentUploadItem) {
  emit('retry', item)
}

function onInputChange(event: Event) {
  const target = event.currentTarget as HTMLInputElement
  addFiles(Array.from(target.files ?? []))
  target.value = ''
}

/* -------------------------------------------------------------------------- */
/* Drag                                                                       */
/* -------------------------------------------------------------------------- */

function resetDrag() {
  dragDepth.value = 0
  dragging.value = false
}

function onDragEnter(event: DragEvent) {
  if (props.disabled || maxReached.value) return
  event.preventDefault()
  dragDepth.value += 1
  dragging.value = true
}

function onDragOver(event: DragEvent) {
  if (props.disabled || maxReached.value) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  dragging.value = true
}

function onDragLeave(event: DragEvent) {
  if (props.disabled || maxReached.value) return
  event.preventDefault()
  dragDepth.value = Math.max(0, dragDepth.value - 1)
  if (dragDepth.value === 0) dragging.value = false
}

function onDrop(event: DragEvent) {
  if (props.disabled || maxReached.value) return
  event.preventDefault()
  resetDrag()
  addFiles(Array.from(event.dataTransfer?.files ?? []))
}

/* -------------------------------------------------------------------------- */
/* Row state                                                                  */
/* -------------------------------------------------------------------------- */

type RowActionState = 'idle' | 'uploading' | 'complete' | 'failed' | 'removing'

/** The upload sweep shows while the row is uploading or just completed. */
function showUploadProgress(item: AttachmentUploadItem) {
  return uploadingIds.value.has(item.id) || item.status === 'uploading'
    || uploadCompleteIds.value.has(item.id) || item.status === 'complete'
}

function actionState(item: AttachmentUploadItem): RowActionState {
  if (removingIds.value.has(item.id)) return 'removing'
  if (uploadingIds.value.has(item.id) || item.status === 'uploading') return 'uploading'
  if (uploadCompleteIds.value.has(item.id) || item.status === 'complete') return 'complete'
  if (item.status === 'failed') return 'failed'
  return 'idle'
}

function arrivalIndex(item: AttachmentUploadItem) {
  return uploadOrder.value.indexOf(item.id)
}

function arrivalDelay(index: number) {
  return Math.min(Math.max(index, 0), 5) * 0.055
}

function rowTransition(index: number) {
  if (reduce.value || index < 0) return ITEM_TRANSITION
  const delay = arrivalDelay(index)
  return { ...layoutSpring, delay, opacity: { duration: 0.16, ease: easeOut, delay } }
}

function rowInitial(index: number) {
  if (reduce.value) return { opacity: 0 }
  return index >= 0 ? { opacity: 0, y: -16, scale: 0.985 } : { opacity: 0, y: 6 }
}

function rowExit() {
  return reduce.value ? undefined : { opacity: 0, y: -4 }
}

function rowTarget() {
  return { opacity: 1, y: 0, scale: 1 }
}

/** The label the action cell advertises in its state. */
function actionLabel(item: AttachmentUploadItem) {
  const state = actionState(item)
  if (state === 'complete') return t.value.uploadComplete
  if (state === 'removing') return t.value.removingAttachment
  if (state === 'failed') return retryable.value ? t.value.retryUpload : t.value.uploadFailed
  return t.value.removeAttachment
}

function actionClick(item: AttachmentUploadItem) {
  if (actionState(item) === 'failed') {
    if (retryable.value) retryItem(item)
    return
  }
  requestRemove(item)
}

function progressRatio(item: AttachmentUploadItem) {
  return item.duration && item.duration > 0
    ? Math.min(1, Math.max(0, (item.currentTime ?? 0) / item.duration))
    : 0
}

function barFilled(item: AttachmentUploadItem, index: number) {
  return index / WAVEFORM_BARS.length <= progressRatio(item)
}

/* -------------------------------------------------------------------------- */
/* Tooltips                                                                   */
/* -------------------------------------------------------------------------- */

// One label at a time, as in the original's shared tooltip registry.
type Tip = { key: string; anchor: HTMLElement; text: string; image?: string }

// The floating shell is only a positioner here: the surface below paints, and
// an inline style is the one thing that always outranks FloatingPanel's own
// `.floating` rule whatever order the scoped styles load in.
const tipShellStyle = {
  maxWidth: 'min(20rem, calc(100vw - 16px))',
  padding: '0',
  border: '0',
  background: 'none',
  boxShadow: 'none',
  overflow: 'visible',
  animation: 'none',
}

const tip = shallowRef<Tip | null>(null)
// True while the label fades out; the panel itself stays mounted until the
// 0.12s exit ends, as the original's `AnimatePresence` does.
const tipClosing = shallowRef(false)
const tipPanelId = useId()
let tipTimer: ReturnType<typeof setTimeout> | undefined
let tipExitTimer: ReturnType<typeof setTimeout> | undefined
// A mouse press dismisses a label and keeps it away until the pointer leaves.
let suppressedKey: string | null = null

function showTip(next: Omit<Tip, 'anchor'>, anchor: HTMLElement) {
  clearTimeout(tipExitTimer)
  tipClosing.value = false
  tip.value = { ...next, anchor }
}

function openTipSoon(next: Omit<Tip, 'anchor'>, anchor: HTMLElement, delay: number) {
  clearTimeout(tipTimer)
  if (tip.value?.key === next.key || suppressedKey === next.key) return
  tipTimer = setTimeout(() => showTip(next, anchor), delay)
}

function openTipNow(next: Omit<Tip, 'anchor'>, anchor: HTMLElement) {
  clearTimeout(tipTimer)
  if (suppressedKey === next.key) return
  showTip(next, anchor)
}

/** Fade the label out, then unmount it; reduced motion drops the panel at once. */
function closeTip() {
  clearTimeout(tipTimer)
  clearTimeout(tipExitTimer)
  if (!tip.value) return
  if (reduce.value) {
    tip.value = null
    return
  }
  tipClosing.value = true
  tipExitTimer = setTimeout(() => {
    tip.value = null
    tipClosing.value = false
  }, 120)
}

function leaveTip() {
  suppressedKey = null
  clearTimeout(tipTimer)
  clearTimeout(tipExitTimer)
  if (!tip.value) return
  // Hold the label for a moment so a pointer crossing the gap toward it does
  // not lose it; entering the surface cancels this.
  tipTimer = setTimeout(closeTip, 100)
}

/** Pointer reached the label itself: keep it open while it is inside. */
function holdTip() {
  clearTimeout(tipTimer)
}

function pressTip(key: string) {
  suppressedKey = key
  closeTip()
}

/** The open label's id, for controls that should be described by it. */
function describedBy(key: string) {
  return tip.value?.key === key ? tipPanelId : undefined
}

function onTipEnter(key: string, event: PointerEvent, text: string, image: string | undefined, delay: number) {
  if (event.pointerType !== 'mouse') return
  openTipSoon({ key, text, image }, event.currentTarget as HTMLElement, delay)
}

function onTipFocus(key: string, event: FocusEvent, text: string, image?: string) {
  const target = event.currentTarget as HTMLElement
  if (!target.matches(':focus-visible')) return
  openTipNow({ key, text, image }, target)
}

/* -------------------------------------------------------------------------- */
/* Image preview                                                              */
/* -------------------------------------------------------------------------- */

let previewOverflow = ''
let previewPreviousFocus: HTMLElement | null = null

function openPreview(item: AttachmentUploadItem) {
  previewItem.value = item
  previewPresent.value = true
}

function closePreview() {
  previewItem.value = null
  previewPresent.value = false
}

function onPreviewKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') closePreview()
  if (event.key === 'Tab') {
    event.preventDefault()
    previewClose.value?.$el?.focus()
  }
}

function releasePreviewFocus() {
  document.removeEventListener('keydown', onPreviewKeyDown)
  document.body.style.overflow = previewOverflow
  previewPreviousFocus?.focus()
  previewPreviousFocus = null
}

watch(
  previewItem,
  item => {
    if (item) {
      previewPreviousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      previewOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', onPreviewKeyDown)
      // The dialog mounts in this commit; focus lands on the close control.
      nextTick(() => previewClose.value?.$el?.focus())
    } else {
      releasePreviewFocus()
    }
  },
  { flush: 'post' },
)

// AnimatePresence keeps a leaving element's last vnode as it was, so the gate it
// rendered with is stale. React's exiting dialog re-renders through
// `useIsPresent` and turns inert; do the same to the retained node.
watch(
  previewPresent,
  present => {
    if (present) {
      // Re-entered mid-exit: the gate comes back with it, so clear the patch the
      // close path wrote onto the retained nodes.
      nextTick(() => {
        for (const root of document.querySelectorAll<HTMLElement>('[data-be-upload-preview]')) {
          root.removeAttribute('inert')
          for (const layer of root.querySelectorAll<HTMLElement>('[data-be-gated]')) layer.style.pointerEvents = 'auto'
        }
      })
      return
    }
    nextTick(() => {
      // Patch every retained preview root: one may still be leaving from an
      // earlier cycle while the just-closed one is queued behind it.
      for (const root of document.querySelectorAll<HTMLElement>('[data-be-upload-preview]')) {
        root.setAttribute('inert', '')
        for (const layer of root.querySelectorAll<HTMLElement>('[data-be-gated]')) layer.style.pointerEvents = 'none'
      }
    })
  },
  { flush: 'post' },
)

// A removed item can never stay in the preview.
watch(items, next => {
  if (previewItem.value && !next.some(item => item.id === previewItem.value?.id)) closePreview()
})

onBeforeUnmount(() => {
  clearTimeout(tipTimer)
  clearTimeout(tipExitTimer)
  if (previewItem.value) releasePreviewFocus()
})

</script>

<template>
  <LayoutGroup :id="inputId">
    <div class="be-attach" :class="className">
      <input
        ref="input"
        :id="inputId"
        type="file"
        :aria-label="t.input"
        :accept="accept"
        :multiple="multiple"
        :disabled="disabled || maxReached"
        tabindex="-1"
        class="be-attach-sr"
        @change="onInputChange">

      <motion.button
        type="button"
        class="be-attach-dropzone"
        :disabled="disabled || maxReached"
        :data-dragging="dragging ? 'true' : 'false'"
        :animate="reduce ? undefined : { scale: dragging ? 1.006 : 1 }"
        :while-press="reduce ? undefined : { scale: 0.995 }"
        :transition="pressSpring"
        :class="classNames?.dropzone"
        @click="input?.click()"
        @dragenter="onDragEnter"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop">
        <span aria-hidden="true" class="be-attach-dropzone-inset" />
        <motion.span
          aria-hidden="true"
          class="be-attach-dropzone-icon"
          :animate="reduce ? undefined : { y: dragging ? -4 : 0, scale: dragging ? 1.08 : 1 }"
          :transition="ITEM_TRANSITION">
          <UploadGlyph icon="upload" size="18px" />
        </motion.span>
        <span class="be-attach-dropzone-title">
          {{ maxReached ? t.limitTitle : (title ?? t.title) }}
        </span>
        <span class="be-attach-dropzone-description">
          {{ maxReached
            ? formatMessage(t.limitDescription, { count: items.length, max: maxFiles })
            : (description ?? formatMessage(t.description, { size: formatMaxSize(maxFileSize, locale) })) }}
        </span>
      </motion.button>

      <section v-if="items.length > 0" class="be-attach-section" :aria-labelledby="`${inputId}-attachments`">
        <h3 :id="`${inputId}-attachments`" class="be-attach-heading">
          {{ attachmentsLabel ?? t.attachments }}
        </h3>

        <ul class="be-attach-list" :class="classNames?.list">
          <AnimatePresence :initial="uploadOrder.length > 0">
            <motion.li
              v-for="item in items"
              :key="item.id"
              class="be-attach-row"
              :class="classNames?.row"
              :layout="reduce ? false : true"
              :initial="rowInitial(arrivalIndex(item))"
              :animate="rowTarget()"
              :exit="rowExit()"
              :transition="rowTransition(arrivalIndex(item))">
              <div class="be-attach-row-inner">
                <span v-if="item.status === 'failed'" aria-hidden="true" class="be-attach-row-failed" />

                <!-- Image thumbnail, with the shared layout that morphs into the preview. -->
                <template v-if="item.kind === 'image'">
                  <span
                    v-if="!imageSource(item)"
                    aria-hidden="true"
                    class="be-attach-thumb-empty">
                    <UploadGlyph icon="fileImage" />
                  </span>
                  <motion.button
                    v-else
                    type="button"
                    class="be-attach-thumb"
                    :aria-label="formatMessage(t.preview, { name: item.name })"
                    :while-press="reduce ? undefined : { scale: 0.94 }"
                    :transition="pressSpring"
                    :aria-describedby="describedBy(`preview-${item.id}`)"
                    @pointerenter="onTipEnter(`preview-${item.id}`, $event, t.clickToPreview, imageSource(item), 160)"
                    @pointerleave="leaveTip()"
                    @focusin="onTipFocus(`preview-${item.id}`, $event, t.clickToPreview, imageSource(item))"
                    @focusout="leaveTip()"
                    @pointerdown="pressTip(`preview-${item.id}`)"
                    @click="($event.currentTarget as HTMLElement).blur(); openPreview(item)">
                    <motion.img
                      :layout-id="reduce ? undefined : `attachment-image-${item.id}`"
                      :src="imageSource(item)"
                      alt=""
                      class="be-attach-thumb-image"
                      :transition="{ layout: layoutSpring }" />
                  </motion.button>
                </template>
                <span v-else aria-hidden="true" class="be-attach-glyph">
                  <UploadGlyph :icon="kindIcon(item.kind)" />
                </span>

                <template v-if="item.kind === 'audio'">
                  <span class="be-attach-time">{{ formatDuration(item.currentTime) }}</span>
                  <span aria-hidden="true" class="be-attach-wave">
                    <motion.span
                      v-for="(height, index) in WAVEFORM_BARS"
                      :key="index"
                      class="be-attach-bar"
                      :class="{ 'is-filled': barFilled(item, index) }"
                      :style="{ height: `${height}px` }"
                      :animate="playingId === item.id && !reduce ? { scaleY: [0.72, 1, 0.78] } : { scaleY: 1 }"
                      :transition="playingId === item.id && !reduce
                        ? { duration: 0.55, ease: easeOut, repeat: Infinity, delay: index * 0.018 }
                        : { duration: 0.2, ease: easeOut }" />
                  </span>
                  <span class="be-attach-time is-end">{{ formatDuration(item.duration) }}</span>
                  <motion.button
                    type="button"
                    class="be-attach-play"
                    :aria-label="formatMessage(playingId === item.id ? t.pause : t.play, { name: item.name })"
                    :while-press="reduce ? undefined : { scale: 0.94 }"
                    :transition="pressSpring"
                    @click="emit('audioToggle', item)">
                    <AnimatePresence mode="wait" :initial="false">
                      <motion.span
                        :key="playingId === item.id ? 'pause' : 'play'"
                        class="be-attach-play-icon"
                        :initial="reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }"
                        :animate="{ opacity: 1, scale: 1 }"
                        :exit="reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }"
                        :transition="ITEM_TRANSITION">
                        <UploadGlyph
                          :icon="playingId === item.id ? 'pause' : 'play'"
                          filled
                          :class="{ 'is-nudged': playingId !== item.id }" />
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>
                </template>

                <template v-else>
                  <span class="be-attach-ident">
                    <span class="be-attach-name">{{ item.name }}</span>
                    <span v-if="item.status === 'failed'" class="be-attach-error">
                      {{ item.error ?? t.uploadFailed }}
                    </span>
                  </span>
                  <span class="be-attach-size">
                    {{ item.kind === 'link' ? t.web : (formatBytes(item.size, locale) ?? '') }}
                  </span>
                  <a
                    v-if="item.kind === 'link' && item.href"
                    :href="item.href"
                    target="_blank"
                    rel="noreferrer noopener"
                    :aria-label="formatMessage(t.open, { name: item.name })"
                    class="be-attach-open">
                    <UploadGlyph icon="externalLink" />
                  </a>
                </template>

                <template v-if="reduce">
                  <motion.span
                    v-if="showUploadProgress(item)"
                    role="progressbar"
                    :aria-label="formatMessage(t.uploading, { name: item.name })"
                    class="be-attach-progress"
                    :initial="{ opacity: 1, scaleX: 0 }"
                    :animate="{ opacity: 1, scaleX: 1 }"
                    :transition="{ duration: 0.1, ease: easeOut }" />
                </template>
                <AnimatePresence v-else>
                  <motion.span
                    v-if="showUploadProgress(item)"
                    :key="`progress-${item.id}`"
                    role="progressbar"
                    :aria-label="formatMessage(t.uploading, { name: item.name })"
                    class="be-attach-progress"
                    :initial="{ opacity: 1, scaleX: 0 }"
                    :animate="{ opacity: 1, scaleX: 1 }"
                    exit="{ opacity: 0 }"
                    :transition="{ duration: UPLOAD_PROGRESS_MS / 1000, ease: easeOut }" />
                </AnimatePresence>
              </div>

              <!-- Action cell: one control whose look follows the row's state. -->
              <span
                class="be-attach-action"
                @pointerenter="actionState(item) !== 'uploading' && onTipEnter(`action-${item.id}`, $event, actionLabel(item), undefined, 100)"
                @pointerleave="actionState(item) !== 'uploading' && leaveTip()"
                @focusin="actionState(item) !== 'uploading' && onTipFocus(`action-${item.id}`, $event, actionLabel(item))"
                @focusout="actionState(item) !== 'uploading' && leaveTip()"
                @pointerdown="actionState(item) !== 'uploading' && pressTip(`action-${item.id}`)">
                <span v-if="actionState(item) === 'uploading'" aria-hidden="true" class="be-attach-action-slot" />

                <motion.span
                  v-else-if="actionState(item) === 'complete'"
                  role="status"
                  :aria-label="formatMessage(t.uploadCompleteFor, { name: item.name })"
                  class="be-attach-action-complete"
                  :initial="reduce ? { opacity: 0 } : { opacity: 0, scale: 0.75 }"
                  :animate="{ opacity: 1, scale: 1 }"
                  :transition="ITEM_TRANSITION">
                  <UploadGlyph icon="check" />
                </motion.span>

                <span
                  v-else-if="actionState(item) === 'removing'"
                  role="status"
                  :aria-label="formatMessage(t.removing, { name: item.name })"
                  class="be-attach-action-removing">
                  <motion.span
                    class="be-attach-spin"
                    :animate="reduce ? undefined : { rotate: 360 }"
                    :transition="{ duration: 0.7, ease: 'linear', repeat: Infinity }">
                    <UploadGlyph icon="loader" />
                  </motion.span>
                </span>

                <span
                  v-else-if="actionState(item) === 'failed' && !retryable"
                  role="status"
                  :aria-label="formatMessage(t.uploadFailedFor, { name: item.name })"
                  class="be-attach-action-failed">
                  <UploadGlyph icon="alertCircle" />
                </span>

                <motion.button
                  v-else-if="actionState(item) === 'failed'"
                  type="button"
                  class="be-attach-action-button is-retry"
                  :aria-label="formatMessage(t.retry, { name: item.name })"
                  :aria-describedby="describedBy(`action-${item.id}`)"
                  :while-press="reduce ? undefined : { scale: 0.92 }"
                  :transition="pressSpring"
                  @click="actionClick(item)">
                  <UploadGlyph icon="rotateCcw" />
                </motion.button>

                <motion.button
                  v-else
                  type="button"
                  class="be-attach-action-button"
                  :aria-label="formatMessage(t.remove, { name: item.name })"
                  :aria-describedby="describedBy(`action-${item.id}`)"
                  :while-press="reduce ? undefined : { scale: 0.92 }"
                  :transition="pressSpring"
                  @click="actionClick(item)">
                  <UploadGlyph icon="x" />
                </motion.button>
              </span>
            </motion.li>
          </AnimatePresence>
        </ul>
      </section>

      <FloatingPanel
        v-if="tip"
        :key="tip.key"
        :open="true"
        :id="tipPanelId"
        :anchor="tip.anchor"
        side="top"
        :gap="8"
        variant="tip"
        role="tooltip"
        class="be-attach-tip"
        :style="tipShellStyle"
        :class="{ 'is-card': Boolean(tip.image) }"
        @dismiss="closeTip()">
        <!-- The surface itself carries the motion: opacity + scale, 0.18s in and
             0.12s out, exactly as the original's tooltip surface. -->
        <motion.span
          class="be-attach-tip-surface"
          @pointerenter="holdTip()"
          @pointerleave="closeTip()"
          :initial="{ opacity: 0, scale: reduce ? 1 : 0.94 }"
          :animate="tipClosing ? { opacity: 0, scale: reduce ? 1 : 0.94 } : { opacity: 1, scale: 1 }"
          :transition="{ duration: tipClosing ? 0.12 : 0.18, ease: easeOut }">
          <span v-if="tip.image" class="be-attach-tip-card">
            <img :src="tip.image" alt="" class="be-attach-tip-image">
            <span class="be-attach-tip-hint">{{ tip.text }}</span>
          </span>
          <template v-else>{{ tip.text }}</template>
        </motion.span>
      </FloatingPanel>

      <Teleport v-if="mounted" to="body">
        <AnimatePresence>
          <div
            v-if="previewItem && previewSource"
            key="attachment-preview"
            class="be-attach-preview"
            data-be-upload-preview
            :inert="previewPresent ? undefined : true">
            <motion.button
              type="button"
              :aria-label="t.closePreview"
              tabindex="-1"
              data-be-gated
              class="be-attach-preview-scrim"
              :style="gateStyle"
              :initial="{ opacity: 0 }"
              :animate="{ opacity: 1 }"
              :exit="reduce ? undefined : { opacity: 0 }"
              :transition="{ duration: reduce ? 0.1 : 0.2, ease: easeOut }"
              @click="closePreview()" />

            <div class="be-attach-preview-stage">
              <motion.div
                role="dialog"
                aria-modal="true"
                :aria-label="formatMessage(t.previewOf, { name: previewItem.name })"
                data-be-gated
                class="be-attach-preview-dialog"
                :style="gateStyle"
                :initial="{ opacity: 0 }"
                :animate="{ opacity: 1 }"
                :exit="reduce ? undefined : { opacity: 0 }"
                :transition="ITEM_TRANSITION">
                <motion.img
                  :layout-id="reduce ? undefined : previewLayoutId"
                  :src="previewSource"
                  :alt="previewItem.name"
                  class="be-attach-preview-image"
                  :transition="{ layout: layoutSpring }" />
                <motion.button
                  ref="previewClose"
                  type="button"
                  :aria-label="t.closePreview"
                  class="be-attach-preview-close"
                  :initial="reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }"
                  :animate="{ opacity: 1, scale: 1 }"
                  :exit="reduce ? undefined : { opacity: 0, scale: 0.8 }"
                  :while-press="reduce ? undefined : { scale: 0.92 }"
                  :transition="pressSpring"
                  @click="closePreview()">
                  <UploadGlyph icon="x" />
                </motion.button>
              </motion.div>
            </div>
          </div>
        </AnimatePresence>
      </Teleport>
    </div>
  </LayoutGroup>
</template>

<style scoped>
.be-attach {
  box-sizing: border-box;
  width: 100%;
  color: var(--beui-foreground);
  font-family: inherit;
}

.be-attach-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* Dropzone ------------------------------------------------------------------ */

.be-attach-dropzone {
  position: relative;
  isolation: isolate;
  display: flex;
  box-sizing: border-box;
  min-height: 13rem;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin: 0;
  padding: .5rem;
  border: 0;
  border-radius: 2rem;
  background: color-mix(in srgb, var(--beui-muted) 65%, transparent);
  color: inherit;
  font: inherit;
  text-align: center;
  cursor: pointer;
  outline: none;
  transition: background-color .2s;
}
.be-attach-dropzone:hover { background: color-mix(in srgb, var(--beui-muted) 85%, transparent); }
.be-attach-dropzone:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.be-attach-dropzone[data-dragging="true"] { background: var(--beui-muted); }
.be-attach-dropzone:disabled { pointer-events: none; opacity: .55; }

.be-attach-dropzone-inset {
  position: absolute;
  inset: .5rem;
  z-index: -1;
  border: 1px dashed color-mix(in srgb, var(--beui-muted-foreground) 25%, transparent);
  border-radius: 1.5rem;
  background: var(--beui-background);
  transition: border-color .2s, background-color .2s;
}
.be-attach-dropzone:hover .be-attach-dropzone-inset {
  border-color: color-mix(in srgb, var(--beui-muted-foreground) 45%, transparent);
}
.be-attach-dropzone[data-dragging="true"] .be-attach-dropzone-inset {
  border-color: color-mix(in srgb, var(--beui-foreground) 65%, transparent);
  background: color-mix(in srgb, var(--beui-muted) 20%, transparent);
}

.be-attach-dropzone-icon {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  margin-bottom: .75rem;
  place-items: center;
  border-radius: 1rem;
  background: var(--beui-muted);
  color: var(--beui-foreground);
  transition: background-color .2s, color .2s;
}
.be-attach-dropzone:hover .be-attach-dropzone-icon { background: color-mix(in srgb, var(--beui-muted) 80%, transparent); }
.be-attach-dropzone[data-dragging="true"] .be-attach-dropzone-icon {
  background: var(--beui-foreground);
  color: var(--beui-background);
}

.be-attach-dropzone-title {
  font-size: .875rem;
  font-weight: 600;
  letter-spacing: -.01em;
  color: var(--beui-foreground);
}
.be-attach-dropzone-description {
  margin-top: .25rem;
  font-size: .75rem;
  line-height: 1.25rem;
  color: var(--beui-muted-foreground);
}

/* Section ------------------------------------------------------------------- */

.be-attach-section { margin-top: 2rem; }
/* Reset explicitly: a host stylesheet's heading rules must not reshape the label. */
.be-attach-heading {
  margin: 0;
  padding: 0;
  border: 0;
  font-size: .875rem;
  line-height: 1.25rem;
  font-weight: 600;
  color: var(--beui-foreground);
}

.be-attach-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: .5rem;
  margin: .75rem 0 0;
  padding: 0;
  list-style: none;
}

/* Row ----------------------------------------------------------------------- */

.be-attach-row {
  display: flex;
  min-width: 0;
  min-height: 3.5rem;
  align-items: center;
  gap: .25rem;
  box-sizing: border-box;
  padding: .25rem;
  border-radius: 1rem;
  background: color-mix(in srgb, var(--beui-muted) 70%, transparent);
  /* Host `li` typography (docs prose) must not leak into the row. */
  font-size: inherit;
  line-height: inherit;
  color: inherit;
}

.be-attach-row-inner {
  position: relative;
  isolation: isolate;
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  align-self: stretch;
  gap: .75rem;
  overflow: hidden;
  border-radius: .75rem;
  background: var(--beui-background);
  padding: .25rem .5rem;
}

.be-attach-row-failed {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: color-mix(in srgb, var(--beui-destructive) 10%, transparent);
}

.be-attach-glyph {
  display: grid;
  width: 1.75rem;
  height: 1.75rem;
  flex: none;
  place-items: center;
  color: var(--beui-muted-foreground);
}

.be-attach-thumb-empty {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: none;
  place-items: center;
  border-radius: .5rem;
  background: var(--beui-muted);
  color: var(--beui-muted-foreground);
}

.be-attach-thumb {
  position: relative;
  width: 2.25rem;
  height: 2.25rem;
  flex: none;
  overflow: hidden;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: var(--beui-muted);
  cursor: pointer;
  outline: none;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--beui-border) 70%, transparent);
}
.be-attach-thumb:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.be-attach-thumb-image { display: block; width: 100%; height: 100%; object-fit: cover; }

.be-attach-ident { min-width: 0; flex: 1; }
.be-attach-name {
  display: block;
  overflow: hidden;
  font-size: .875rem;
  font-weight: 500;
  color: var(--beui-foreground);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.be-attach-error {
  display: block;
  overflow: hidden;
  font-size: 11px;
  color: var(--beui-destructive);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.be-attach-size {
  flex: none;
  font-size: .75rem;
  color: var(--beui-muted-foreground);
}

.be-attach-open {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: none;
  place-items: center;
  border-radius: .5rem;
  color: var(--beui-muted-foreground);
  outline: none;
  transition: background-color .15s, color .15s;
}
.be-attach-open:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.be-attach-open:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }

/* Audio --------------------------------------------------------------------- */

.be-attach-time {
  width: 2.25rem;
  flex: none;
  font-size: .75rem;
  font-variant-numeric: tabular-nums;
  color: var(--beui-muted-foreground);
}
.be-attach-time.is-end { text-align: right; }

.be-attach-wave {
  display: flex;
  height: 2.75rem;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 3px;
  overflow: hidden;
}
.be-attach-bar {
  width: 3px;
  flex: none;
  border-radius: 999px;
  background: color-mix(in srgb, var(--beui-muted-foreground) 35%, transparent);
  transform-origin: center;
}
.be-attach-bar.is-filled { background: var(--beui-foreground); }

.be-attach-play {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  flex: none;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--beui-foreground);
  color: var(--beui-background);
  cursor: pointer;
  outline: none;
}
.be-attach-play:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.be-attach-play-icon { display: grid; place-items: center; }
.be-attach-play-icon .is-nudged { transform: translateX(1px); }

/* Upload sweep -------------------------------------------------------------- */

.be-attach-progress {
  position: absolute;
  inset: 0;
  z-index: -1;
  transform-origin: left;
  pointer-events: none;
  background: rgb(52 211 153 / .25);
}
:global(.dark .be-attach-progress),
:global([data-beui-theme="dark"] .be-attach-progress) { background: rgb(16 185 129 / .2); }

/* Action cell --------------------------------------------------------------- */

.be-attach-action {
  display: grid;
  flex: none;
  place-items: center;
}

.be-attach-action-slot { display: block; width: 2.25rem; height: 2.25rem; }

.be-attach-action-complete,
.be-attach-action-removing,
.be-attach-action-failed {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  border-radius: .75rem;
}
.be-attach-action-complete { color: #059669; }
:global(.dark .be-attach-action-complete),
:global([data-beui-theme="dark"] .be-attach-action-complete) { color: #34d399; }
.be-attach-action-removing { color: var(--beui-muted-foreground); }
.be-attach-action-failed { color: var(--beui-destructive); }
.be-attach-spin { display: grid; place-items: center; }

.be-attach-action-button {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: .75rem;
  background: none;
  color: var(--beui-muted-foreground);
  cursor: pointer;
  outline: none;
  transition: background-color .15s, color .15s;
}
.be-attach-action-button:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.be-attach-action-button.is-retry { color: var(--beui-destructive); }
.be-attach-action-button.is-retry:hover {
  background: color-mix(in srgb, var(--beui-destructive) 10%, transparent);
  color: var(--beui-destructive);
}
.be-attach-action-button:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }

/* Tooltip ------------------------------------------------------------------- */

.be-attach-tip-surface {
  display: block;
  padding: .25rem .625rem;
  border: 1px solid var(--beui-border);
  border-radius: .5rem;
  background: var(--beui-background);
  color: var(--beui-foreground);
  font-size: .75rem;
  font-weight: 500;
  line-height: 1rem;
  white-space: nowrap;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1);
  transform-origin: center bottom;
  pointer-events: auto;
}
.be-attach-tip.is-card .be-attach-tip-surface {
  padding: .25rem;
  border-radius: .75rem;
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / .1), 0 8px 10px -6px rgb(0 0 0 / .1);
}
.be-attach-tip-card { display: block; width: 8rem; }
.be-attach-tip-image { display: block; width: 100%; height: 5rem; border-radius: .5rem; object-fit: cover; }
.be-attach-tip-hint {
  display: block;
  padding: .25rem .25rem .125rem;
  text-align: center;
  font-size: 10px;
  font-weight: 500;
  color: var(--beui-muted-foreground);
}

/* Image preview ------------------------------------------------------------- */

.be-attach-preview {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 10000;
  width: 0;
  height: 0;
  pointer-events: none;
}

.be-attach-preview-scrim {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: rgb(0 0 0 / .45);
  backdrop-filter: blur(24px);
  cursor: default;
}

.be-attach-preview-stage {
  position: fixed;
  inset: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
@media (min-width: 640px) {
  .be-attach-preview-stage { inset: 2rem; }
}

.be-attach-preview-dialog { position: relative; }

.be-attach-preview-image {
  display: block;
  max-width: 90vw;
  max-height: 90vh;
  border-radius: 1rem;
  object-fit: contain;
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / .25);
}

.be-attach-preview-close {
  position: absolute;
  top: -.75rem;
  right: -.75rem;
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--beui-background);
  color: var(--beui-foreground);
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / .1), 0 8px 10px -6px rgb(0 0 0 / .1);
  outline: none;
  transition: background-color .15s;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--beui-border) 70%, transparent), 0 20px 25px -5px rgb(0 0 0 / .1);
}
.be-attach-preview-close:hover { background: var(--beui-muted); }
.be-attach-preview-close:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }

/* Static CSS transitions are the only motion left for the surfaces above. */
@media (prefers-reduced-motion: reduce) {
  .be-attach-dropzone,
  .be-attach-dropzone-inset,
  .be-attach-dropzone-icon,
  .be-attach-open,
  .be-attach-action-button,
  .be-attach-preview-close { transition: none; }
}
</style>
