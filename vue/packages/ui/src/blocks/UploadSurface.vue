<script setup lang="ts">
import { AnimatePresence, motion, mountedStates } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { easeOut } from '../core/motion'
import { useValue } from '../agents/shared'
import { fileUploadMessages, formatMessage, type FileUploadMessages } from './messages'
import {
  UploadGlyph,
  createFileUploadItem,
  type FileUploadClassNames,
  type FileUploadItem,
  type FileUploadStatus,
  type FileUploadVariant,
} from './uploads'

export interface FileUploadProps {
  value?: FileUploadItem[]
  defaultValue?: FileUploadItem[]
  /** Alias of `value`, kept from the original port. */
  modelValue?: FileUploadItem[]
  /** Passed to the picker; the queue itself accepts whatever it is given. */
  accept?: string
  multiple?: boolean
  maxFiles?: number
  /**
   * Accepted for parity with the docs examples. The queue does not validate
   * size — the React original leaves that to the caller.
   */
  maxFileSize?: number
  disabled?: boolean
  variant?: FileUploadVariant
  title?: string
  description?: string
  browseLabel?: string
  /** Localizes the byte formatting (`Intl.NumberFormat` units). */
  locale?: string
  labels?: Partial<FileUploadMessages>
  className?: string
  classNames?: FileUploadClassNames
}

/**
 * Port of `components/motion/file-upload.tsx` — the progress queue.
 *
 * The drop physics, queue order and status model are the original's; the row
 * and dropzone motion are gated behind `useReducedMotion()` exactly as there.
 */

const props = withDefaults(defineProps<FileUploadProps>(), {
  multiple: true,
  disabled: false,
  variant: 'default',
})

const emit = defineEmits<{
  'update:modelValue': [items: FileUploadItem[]]
  valueChange: [items: FileUploadItem[]]
  filesAdded: [items: FileUploadItem[], files: File[]]
  remove: [item: FileUploadItem]
  retry: [item: FileUploadItem]
}>()

// Mirrors `ROW_TRANSITION` / `FAST_TRANSITION` in the original.
const ROW_TRANSITION = { duration: 0.22, ease: easeOut } as const
const FAST_TRANSITION = { duration: 0.16, ease: easeOut } as const
const PROGRESS_TRANSITION = { duration: 0.28, ease: easeOut } as const

const STATUS_TONE: Record<FileUploadStatus, string> = {
  queued: 'is-queued',
  uploading: 'is-uploading',
  success: 'is-success',
  error: 'is-error',
}

const reduce = useReducedMotion()
const t = computed(() => ({ ...fileUploadMessages, ...props.labels }))
const inputId = useId()
const input = useTemplateRef<HTMLInputElement>('input')
const dragDepth = shallowRef(0)
const dragging = shallowRef(false)

const { value: items, set: setItems } = useValue<FileUploadItem[]>(
  () => props.modelValue ?? props.value,
  props.defaultValue ?? [],
  next => {
    emit('update:modelValue', next)
    emit('valueChange', next)
  },
)

const maxReached = computed(() => props.maxFiles !== undefined && items.value.length >= props.maxFiles)
const queue = useTemplateRef<HTMLUListElement>('queue')
// The dropzone above the queue changes height with the variant. Vue patches it before the rows
// (which snapshot their layout in `onBeforeUpdate`) so the rows would only ever see the new
// position and jump; React measures every row before any DOM commit. Snapshot them first.
watch(() => [props.variant, maxReached.value], () => {
  if (reduce.value) return
  for (const row of Array.from(queue.value?.children ?? [])) mountedStates.get(row as HTMLElement)?.beforeUpdate()
}, { flush: 'pre' })
const centered = computed(() => props.variant === 'centered')
const disabledState = computed(() => props.disabled || maxReached.value)

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

const UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'] as const

/** `locale` localizes digits and unit names; without it the English `KB`/`MB` form stays. */
function formatBytes(bytes: number, locale?: string) {
  const positive = Number.isFinite(bytes) && bytes > 0
  const exponent = positive ? Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1) : 0
  const value = positive ? bytes / 1024 ** exponent : 0
  const digits = value >= 10 || exponent === 0 ? 0 : 1

  if (!locale) return `${value.toFixed(digits)} ${['B', 'KB', 'MB', 'GB', 'TB'][exponent]}`
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: UNITS[exponent],
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

function fileKind(item: FileUploadItem) {
  const extension = item.name.includes('.') ? item.name.split('.').pop() : undefined
  if (extension) return extension.toUpperCase()
  if (item.type) return item.type.split('/').pop()?.toUpperCase()
  return 'FILE'
}

function getFileIcon(item: FileUploadItem) {
  const extension = item.name.includes('.') ? item.name.split('.').pop()?.toLowerCase() : undefined
  const type = item.type ?? ''

  if (type.startsWith('image/')) return 'fileImage' as const
  if (type.startsWith('video/')) return 'fileVideo' as const
  if (type.startsWith('audio/')) return 'fileAudio' as const
  if (type.includes('zip') || type.includes('compressed') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension ?? '')) {
    return 'fileArchive' as const
  }
  if (type.includes('spreadsheet') || type.includes('excel') || ['csv', 'xls', 'xlsx'].includes(extension ?? '')) {
    return 'fileSpreadsheet' as const
  }
  if (type.includes('pdf') || type.startsWith('text/') || ['pdf', 'doc', 'docx', 'md', 'txt'].includes(extension ?? '')) {
    return 'fileText' as const
  }
  if (['css', 'html', 'js', 'jsx', 'json', 'mdx', 'ts', 'tsx', 'xml', 'yaml', 'yml'].includes(extension ?? '')) {
    return 'fileCode' as const
  }
  return 'file' as const
}

function clampProgress(value: number | undefined, status: FileUploadStatus) {
  if (status === 'success') return 100
  if (value === undefined || Number.isNaN(value)) return 0
  return Math.max(0, Math.min(100, value))
}

/* -------------------------------------------------------------------------- */
/* Queue                                                                      */
/* -------------------------------------------------------------------------- */

function addFiles(incoming: File[]) {
  if (props.disabled || incoming.length === 0) return

  const remainingSlots = props.maxFiles === undefined ? incoming.length : props.maxFiles - items.value.length
  if (remainingSlots <= 0) return

  const files = incoming.slice(0, props.multiple ? remainingSlots : Math.min(1, remainingSlots))
  const added = files.map((file, index) => createFileUploadItem(file, index))
  if (added.length === 0) return

  setItems([...items.value, ...added])
  emit('filesAdded', added, files)
}

function onInputChange(event: Event) {
  const target = event.currentTarget as HTMLInputElement
  addFiles(Array.from(target.files ?? []))
  target.value = ''
}

function removeItem(item: FileUploadItem) {
  setItems(items.value.filter(entry => entry.id !== item.id))
  emit('remove', item)
}

function retryItem(item: FileUploadItem) {
  const retrying: FileUploadItem = { ...item, error: undefined, progress: 0, status: 'uploading' }
  setItems(items.value.map(entry => (entry.id === item.id ? retrying : entry)))
  emit('retry', retrying)
}

function resetDrag() {
  dragDepth.value = 0
  dragging.value = false
}

function onDragEnter(event: DragEvent) {
  if (disabledState.value) return
  event.preventDefault()
  dragDepth.value += 1
  dragging.value = true
}

function onDragOver(event: DragEvent) {
  if (disabledState.value) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  dragging.value = true
}

function onDragLeave(event: DragEvent) {
  if (disabledState.value) return
  event.preventDefault()
  dragDepth.value = Math.max(0, dragDepth.value - 1)
  if (dragDepth.value === 0) dragging.value = false
}

function onDrop(event: DragEvent) {
  if (disabledState.value) return
  event.preventDefault()
  resetDrag()
  addFiles(Array.from(event.dataTransfer?.files ?? []))
}
</script>

<template>
  <div class="be-file-upload" :class="[className, classNames?.root]">
    <input
      ref="input"
      :id="inputId"
      type="file"
      :aria-label="t.input"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabledState"
      tabindex="-1"
      class="be-file-upload-sr"
      @change="onInputChange">
    <!--
      A button, as in the original: the whole surface opens the picker, and the
      drag listeners sit on it so the depth counter sees enter/leave pairs.
    -->
    <button
      type="button"
      class="be-file-upload-dropzone"
      :class="centered ? 'is-centered' : 'is-row'"
      :disabled="disabledState"
      :data-dragging="dragging ? 'true' : 'false'"
      @click="input?.click()"
      @dragenter="onDragEnter"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop">
      <motion.span
        aria-hidden="true"
        class="be-file-upload-icon"
        :class="centered ? 'is-centered' : 'is-row'"
        :animate="reduce ? undefined : { transform: dragging ? 'translateY(-2px)' : 'translateY(0px)' }"
        :transition="FAST_TRANSITION">
        <UploadGlyph icon="uploadCloud" :size="centered ? '1.75rem' : '1.5rem'" />
      </motion.span>

      <span class="be-file-upload-copy" :class="centered ? 'is-centered' : 'is-row'">
        <span class="be-file-upload-title" :class="centered ? 'is-centered' : 'is-row'">
          {{ maxReached ? t.limitTitle : (title ?? t.title) }}
        </span>
        <span class="be-file-upload-description" :class="centered ? 'is-centered' : 'is-row'">
          {{ maxReached
            ? formatMessage(t.limitDescription, { count: items.length, max: maxFiles ?? 0 })
            : (description ?? t.description) }}
        </span>
      </span>

      <span class="be-file-upload-browse" :class="centered ? 'is-centered' : 'is-row'">
        {{ browseLabel ?? t.browse }}
      </span>
    </button>

    <ul ref="queue" class="be-file-upload-queue" :class="classNames?.queue">
      <AnimatePresence :initial="false">
        <motion.li
          v-for="item in items"
          :key="item.id"
          class="be-file-upload-row"
          :class="classNames?.item"
          :layout="reduce ? false : true"
          :initial="reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }"
          :animate="{ opacity: 1, transform: 'translateY(0px)' }"
          :exit="reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-6px)' }"
          :transition="ROW_TRANSITION">
          <div class="be-file-upload-row-inner">
            <div class="be-file-upload-leading" :class="classNames?.leading">
              <UploadGlyph :icon="getFileIcon(item)" size="1.25rem" />
            </div>

            <div class="be-file-upload-content" :class="classNames?.content">
              <div class="be-file-upload-head">
                <div class="be-file-upload-ident">
                  <p class="be-file-upload-name" :class="classNames?.name">{{ item.name }}</p>
                  <p class="be-file-upload-meta" :class="classNames?.meta">
                    {{ fileKind(item) }} · {{ formatBytes(item.size, locale) }}<template v-if="(item.status ?? 'queued') === 'error' && item.error"> · {{ item.error }}</template>
                  </p>
                </div>

                <div class="be-file-upload-actions">
                  <!-- Status: one position, swapped with `mode="wait"` like the original. -->
                  <AnimatePresence mode="wait" :initial="false">
                    <motion.span
                      :key="item.status ?? 'queued'"
                      class="be-file-upload-status"
                      :class="STATUS_TONE[item.status ?? 'queued']"
                      :initial="reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(4px)' }"
                      :animate="{ opacity: 1, transform: 'translateY(0px)' }"
                      :exit="reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-4px)' }"
                      :transition="FAST_TRANSITION">
                      <UploadGlyph
                        v-if="(item.status ?? 'queued') === 'success'"
                        icon="checkCircle"
                        size="1rem" />
                      <UploadGlyph
                        v-else-if="(item.status ?? 'queued') === 'error'"
                        icon="alertCircle"
                        size="1rem" />
                      <UploadGlyph
                        v-else-if="(item.status ?? 'queued') === 'uploading'"
                        icon="loader"
                        class="be-file-upload-spinner"
                        :class="{ 'is-still': reduce }"
                        size="1rem" />
                      <UploadGlyph v-else icon="file" size="1rem" />
                      <span class="be-file-upload-sr">{{ t[item.status ?? 'queued'] }}</span>
                    </motion.span>
                  </AnimatePresence>

                  <button
                    v-if="(item.status ?? 'queued') === 'error'"
                    type="button"
                    class="be-file-upload-action"
                    :class="classNames?.action"
                    :aria-label="formatMessage(t.retry, { name: item.name })"
                    @click="retryItem(item)">
                    <UploadGlyph icon="rotateCcw" size="0.875rem" />
                  </button>
                  <button
                    type="button"
                    class="be-file-upload-action"
                    :class="classNames?.action"
                    :aria-label="formatMessage(t.remove, { name: item.name })"
                    @click="removeItem(item)">
                    <UploadGlyph icon="x" size="0.875rem" />
                  </button>
                </div>
              </div>

              <div
                v-if="(item.status ?? 'queued') === 'uploading' || (item.status ?? 'queued') === 'success'"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-valuenow="Math.round(clampProgress(item.progress, item.status ?? 'queued'))"
                :aria-label="formatMessage(t.progress, { name: item.name })"
                class="be-file-upload-progress"
                :class="classNames?.progress">
                <motion.div
                  class="be-file-upload-fill"
                  :class="{ 'is-success': (item.status ?? 'queued') === 'success' }"
                  :style="{
                    transformOrigin: 'left',
                    transform: reduce ? `scaleX(${clampProgress(item.progress, item.status ?? 'queued') / 100})` : undefined,
                  }"
                  :initial="false"
                  :animate="reduce ? undefined : { transform: `scaleX(${clampProgress(item.progress, item.status ?? 'queued') / 100})` }"
                  :transition="PROGRESS_TRANSITION" />
              </div>
            </div>
          </div>
        </motion.li>
      </AnimatePresence>
    </ul>
  </div>
</template>

<style scoped>
.be-file-upload {
  box-sizing: border-box;
  display: grid;
  width: 100%;
  gap: .75rem;
  color: var(--beui-foreground);
  font-family: inherit;
}

.be-file-upload-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* Dropzone ------------------------------------------------------------------ */

.be-file-upload-dropzone {
  position: relative;
  display: flex;
  box-sizing: border-box;
  width: 100%;
  overflow: hidden;
  margin: 0;
  padding: 1.25rem;
  border: 1px dashed var(--beui-border);
  border-radius: 1.5rem;
  background: var(--beui-background);
  color: inherit;
  font: inherit;
  cursor: pointer;
  outline: none;
  transition: border-color .2s, transform .2s;
}
.be-file-upload-dropzone:hover { border-color: color-mix(in srgb, var(--beui-foreground) 40%, transparent); }
.be-file-upload-dropzone:active { transform: scale(.99); }
.be-file-upload-dropzone:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.be-file-upload-dropzone[data-dragging="true"] { border-color: var(--beui-foreground); }
.be-file-upload-dropzone:disabled { pointer-events: none; opacity: .55; }
.be-file-upload-dropzone.is-row { align-items: center; gap: 1rem; text-align: left; }
.be-file-upload-dropzone.is-centered {
  min-height: 14rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .75rem;
  padding: 1.75rem;
  text-align: center;
}

.be-file-upload-icon {
  display: grid;
  flex: none;
  place-items: center;
  background: var(--beui-muted);
  color: var(--beui-foreground);
}
.be-file-upload-icon.is-row { width: 3.5rem; height: 3.5rem; border-radius: 1.25rem; }
.be-file-upload-icon.is-centered {
  width: 4rem;
  height: 4rem;
  border: 1px solid var(--beui-border);
  border-radius: 1.35rem;
}

.be-file-upload-copy { min-width: 0; }
.be-file-upload-copy.is-row { flex: 1; }
.be-file-upload-copy.is-centered { max-width: 20rem; }

.be-file-upload-title { display: block; font-weight: 600; color: var(--beui-foreground); }
/* Explicit line heights: the original's text-sm/base/xs scale, independent of the host's body line-height. */
.be-file-upload-title.is-row { font-size: .875rem; line-height: 1.25rem; }
.be-file-upload-title.is-centered { font-size: 1rem; line-height: 1.5rem; }

.be-file-upload-description { display: block; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.be-file-upload-description.is-row { margin-top: .125rem; }
.be-file-upload-description.is-centered { margin-top: .25rem; line-height: 1.25rem; }

.be-file-upload-browse {
  flex: none;
  border: 1px solid var(--beui-border);
  border-radius: 999px;
  padding: .5rem .875rem;
  font-size: .75rem;
  line-height: 1rem;
  font-weight: 500;
  color: var(--beui-foreground);
  transition: background-color .15s;
}
.be-file-upload-browse.is-centered { margin-top: .25rem; padding: .5rem 1rem; }
.be-file-upload-dropzone:hover .be-file-upload-browse { background: var(--beui-muted); }

/* Queue --------------------------------------------------------------------- */

.be-file-upload-queue {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: .5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.be-file-upload-row {
  position: relative;
  min-width: 0;
  overflow: hidden;
  box-sizing: border-box;
  padding: .75rem;
  border: 1px solid var(--beui-border);
  border-radius: 1rem;
  background: var(--beui-background);
}
.be-file-upload-row-inner { display: flex; align-items: center; gap: .75rem; }

.be-file-upload-leading {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: .75rem;
  background: var(--beui-muted);
  color: var(--beui-muted-foreground);
}

.be-file-upload-content { min-width: 0; flex: 1; }
.be-file-upload-head { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; }
.be-file-upload-ident { min-width: 0; }
.be-file-upload-name {
  overflow: hidden;
  margin: 0;
  color: var(--beui-foreground);
  font-size: .875rem;
  font-weight: 500;
  line-height: 1.25rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.be-file-upload-meta {
  margin: .125rem 0 0;
  overflow-wrap: anywhere;
  color: var(--beui-muted-foreground);
  font-size: .75rem;
  line-height: 1rem;
}

.be-file-upload-actions { display: flex; flex: none; align-items: center; gap: .25rem; }

.be-file-upload-status {
  display: grid;
  width: 1.5rem;
  height: 1.5rem;
  place-items: center;
}
.be-file-upload-status.is-queued { color: var(--beui-muted-foreground); }
.be-file-upload-status.is-uploading { color: var(--beui-foreground); }
.be-file-upload-status.is-success { color: oklch(59.6% .145 163.225); }
.be-file-upload-status.is-error { color: var(--beui-destructive); }
:global(.dark .be-file-upload-status.is-success),
:global([data-beui-theme="dark"] .be-file-upload-status.is-success) { color: oklch(76.5% .177 163.223); }

.be-file-upload-spinner { animation: be-file-upload-spin 1s linear infinite; }
.be-file-upload-spinner.is-still { animation: none; }
@keyframes be-file-upload-spin { to { transform: rotate(360deg); } }

.be-file-upload-action {
  display: grid;
  width: 1.75rem;
  height: 1.75rem;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--beui-muted-foreground);
  cursor: pointer;
  transition: background-color .15s, color .15s, transform .15s;
}
.be-file-upload-action:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.be-file-upload-action:active { transform: scale(.95); }
.be-file-upload-action:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }

.be-file-upload-progress {
  height: .375rem;
  margin-top: .75rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--beui-muted);
}
.be-file-upload-fill { width: 100%; height: 100%; border-radius: 999px; background: var(--beui-foreground); }
.be-file-upload-fill.is-success { background: oklch(69.6% .17 162.48); }

@media (prefers-reduced-motion: reduce) {
  .be-file-upload-dropzone,
  .be-file-upload-browse,
  .be-file-upload-action { transition: none; }
  .be-file-upload-spinner { animation: none; }
}
</style>
