<script setup lang="ts">
import { AnimatePresence, LayoutGroup, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { layoutSpring, pressSpring } from '../core/motion'
import { useMountedMedia } from '../core/mounted-media'
import { useOpenState } from '../primitives/state'
import { formatMessage, projectFolderMessages } from './messages'

type FolderPreview = { id: string; content?: string }

const props = withDefaults(defineProps<{
  title: string
  description?: string
  previews?: readonly FolderPreview[]
  count?: number
  /**
   * Singular noun for the count, e.g. `"file"`. Pluralized the English way by
   * appending `s` (`3 files`), so only pass it for English copy. Leave it
   * unset to use the localizable `countOne`/`countOther` messages.
   */
  itemLabel?: string
  open?: boolean
  defaultOpen?: boolean
  expanded?: boolean
  defaultExpanded?: boolean
  disabled?: boolean
  ariaLabel?: string
  className?: string
  /** Override any built-in string. `{count}` fills `countOne`/`countOther`; `{title}` fills `close`. */
  labels?: Partial<typeof projectFolderMessages>
}>(), { previews: () => [], open: undefined, expanded: undefined, defaultOpen: false, defaultExpanded: false, disabled: false })

const emit = defineEmits<{
  'update:open': [value: boolean]
  openChange: [value: boolean]
  'update:expanded': [value: boolean]
  expandedChange: [value: boolean]
  click: []
}>()

defineSlots<{
  /** Renders one file; used both inside the folder and in the expanded overlay. */
  preview?(props: { preview: FolderPreview }): unknown
}>()

const MAX_PREVIEWS = 5
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getPreviewTransform(index: number, count: number) {
  const offset = index - (count - 1) / 2
  const distance = Math.abs(offset)
  const centerLift = Math.max(0, 2 - distance) * 8
  return {
    x: offset * 44,
    y: 8 - centerLift,
    rotate: offset * 6,
    scale: distance === 0 ? 1.04 : distance === 1 ? 0.95 : 0.88,
    opacity: distance === 0 ? 1 : distance === 1 ? 0.78 : 0.58,
    zIndex: 10 - distance,
  }
}

const t = computed(() => ({ ...projectFolderMessages, ...props.labels }))
const reduce = useReducedMotion()
const canHover = useMountedMedia('(hover: hover) and (pointer: fine)')
const uid = useId()
const layoutGroupId = `be-project-folder-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`
const dialogTitleId = `${layoutGroupId}-title`

const folderButton = useTemplateRef<{ $el?: HTMLElement }>('folderButton')
const closeButton = useTemplateRef<HTMLButtonElement>('closeButton')
const dialog = useTemplateRef<HTMLElement>('dialog')

const mounted = shallowRef(false)
const isClosing = shallowRef(false)
let hovered = false
let focused = false
let restoringFocus = false

const openState = useOpenState(() => props.open, props.defaultOpen, next => { emit('update:open', next); emit('openChange', next) }, () => props.disabled)
const expandedState = useOpenState(() => props.expanded, props.defaultExpanded, next => { emit('update:expanded', next); emit('expandedChange', next) }, () => props.disabled || previewItems.value.length === 0)
const isExpanded = expandedState.open
const isOpen = computed(() => openState.open.value || isExpanded.value)
const previewItems = computed(() => props.previews.slice(0, MAX_PREVIEWS))
const transition = computed(() => (reduce.value ? { duration: 0 } : layoutSpring))
const count = computed(() => props.count ?? props.previews.length)
// `itemLabel` keeps its English suffix plural; without it the count comes from messages.
const countText = computed(() => (props.itemLabel !== undefined
  ? `${count.value} ${props.itemLabel}${count.value === 1 ? '' : 's'}`
  : formatMessage(count.value === 1 ? t.value.countOne : t.value.countOther, { count: count.value })))
const description = computed(() => props.description ?? t.value.description)

function folderElement() {
  const reference = folderButton.value
  return reference instanceof HTMLElement ? reference : reference?.$el instanceof HTMLElement ? reference.$el : null
}

function finishClose() {
  if (!isClosing.value) return
  isClosing.value = false
  restoringFocus = true
  requestAnimationFrame(() => folderElement()?.focus())
}

function closeOverlay() {
  isClosing.value = true
  openState.setOpen(false)
  expandedState.setOpen(false)
}

function handleFolderClick() {
  isClosing.value = false
  expandedState.setOpen(true)
  openState.setOpen(true)
  emit('click')
}

onMounted(() => { mounted.value = true })

watch([reduce, isClosing], () => {
  if (reduce.value && isClosing.value) finishClose()
})

// The expanded overlay owns the body scroll, Escape, and a Tab loop for as long
// as it is open.
watch(isExpanded, (expanded, _previous, onCleanup) => {
  if (!expanded) return
  const previousOverflow = document.body.style.overflow
  const focusFrame = requestAnimationFrame(() => closeButton.value?.focus())
  document.body.style.overflow = 'hidden'

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeOverlay()
      return
    }
    if (event.key !== 'Tab' || !dialog.value) return
    const focusable = Array.from(dialog.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(element => element.tabIndex >= 0)
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
  document.addEventListener('keydown', onKeyDown)
  onCleanup(() => {
    cancelAnimationFrame(focusFrame)
    document.body.style.overflow = previousOverflow
    document.removeEventListener('keydown', onKeyDown)
  })
}, { immediate: true, flush: 'post' })

function onPointerEnter() {
  if (!canHover.value) return
  hovered = true
  openState.setOpen(true)
}
function onPointerLeave() {
  if (!canHover.value) return
  hovered = false
  if (!isExpanded.value && !isClosing.value) openState.setOpen(focused)
}
function onFocus() {
  if (restoringFocus) {
    restoringFocus = false
    focused = false
    return
  }
  focused = true
  openState.setOpen(true)
}
function onBlur() {
  focused = false
  if (!isExpanded.value && !isClosing.value) openState.setOpen(hovered)
}

function previewAnimate(index: number) {
  const opened = getPreviewTransform(index, previewItems.value.length)
  return isOpen.value && !reduce.value
    ? { x: opened.x * 1.4, y: opened.y - 8, rotate: opened.rotate * 1.3, scale: opened.scale * 1.02, opacity: Math.min(1, opened.opacity + 0.18) }
    : { x: opened.x, y: opened.y, rotate: opened.rotate, scale: opened.scale, opacity: opened.opacity }
}
</script>

<template>
  <LayoutGroup :id="layoutGroupId">
    <motion.button
      ref="folderButton"
      type="button"
      class="be-project-folder"
      :class="className"
      :disabled="disabled"
      :aria-label="ariaLabel"
      aria-haspopup="dialog"
      :aria-expanded="isExpanded"
      :data-open="isOpen ? 'true' : 'false'"
      :data-expanded="isExpanded ? 'true' : 'false'"
      :tabindex="isExpanded ? -1 : undefined"
      :while-press="reduce || disabled ? undefined : { scale: 0.98 }"
      :transition="reduce ? { duration: 0 } : pressSpring"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
      @focus="onFocus"
      @blur="onBlur"
      @click="handleFolderClick">
      <motion.span
        aria-hidden="true"
        class="be-project-folder-back"
        :animate="{ rotateX: isOpen && !reduce ? 15 : 0 }"
        :transition="transition" />

      <span aria-hidden="true" class="be-project-folder-stage">
        <span class="be-project-folder-anchor">
          <AnimatePresence :initial="false">
            <template v-if="!isExpanded">
              <motion.span
                v-for="(preview, index) in previewItems"
                :key="preview.id"
                :layout-id="`${layoutGroupId}-file-${preview.id}`"
                :initial="false"
                :animate="previewAnimate(index)"
                :transition="transition"
                class="be-project-folder-file"
                :style="{ zIndex: getPreviewTransform(index, previewItems.length).zIndex }"
                @layout-animation-complete="isClosing && index === 0 && finishClose()">
                <slot name="preview" :preview="preview">{{ preview.content }}</slot>
              </motion.span>
            </template>
          </AnimatePresence>
        </span>
      </span>

      <motion.span
        :initial="false"
        :animate="{ rotateX: isOpen && !reduce ? -25 : 0 }"
        :transition="transition"
        class="be-project-folder-front">
        <span class="be-project-folder-title-row"><span class="be-project-folder-title">{{ title }}</span></span>
        <span class="be-project-folder-meta-row">
          <span class="be-project-folder-count">{{ countText }}</span>
          <span class="be-project-folder-description">{{ description }}</span>
        </span>
      </motion.span>
    </motion.button>

    <Teleport v-if="mounted" to="body">
      <template v-if="isExpanded || isClosing">
        <AnimatePresence :initial="false">
          <motion.button
            v-if="isExpanded"
            key="project-files-backdrop"
            type="button"
            tabindex="-1"
            :aria-label="t.closeOverlay"
            :initial="{ opacity: 0 }"
            :animate="{ opacity: 1 }"
            :exit="{ opacity: 0 }"
            :transition="reduce ? { duration: 0 } : { duration: 0.18 }"
            class="be-project-folder-backdrop"
            :class="{ 'is-closing': isClosing }"
            @click="closeOverlay" />
        </AnimatePresence>

        <div
          ref="dialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="dialogTitleId"
          :aria-hidden="isExpanded ? undefined : 'true'"
          class="be-project-folder-dialog">
          <div class="be-project-folder-panel" :class="{ 'is-closing': isClosing }">
            <AnimatePresence :initial="false">
              <motion.div
                v-if="isExpanded"
                key="project-files-header"
                :initial="{ opacity: 0, y: reduce ? 0 : 8 }"
                :animate="{ opacity: 1, y: 0 }"
                :exit="{ opacity: 0, y: reduce ? 0 : -8 }"
                :transition="reduce ? { duration: 0 } : { duration: 0.18 }"
                class="be-project-folder-header">
                <div>
                  <h2 :id="dialogTitleId" class="be-project-folder-heading">{{ title }}</h2>
                  <p class="be-project-folder-subheading">{{ countText }}</p>
                </div>
                <button ref="closeButton" type="button" class="be-project-folder-close" :aria-label="formatMessage(t.close, { title })" @click="closeOverlay">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
              </motion.div>
            </AnimatePresence>

            <div class="be-project-folder-grid">
              <template v-if="isExpanded">
                <motion.div
                  v-for="preview in previewItems"
                  :key="preview.id"
                  :layout-id="`${layoutGroupId}-file-${preview.id}`"
                  :transition="transition"
                  class="be-project-folder-sheet">
                  <slot name="preview" :preview="preview">{{ preview.content }}</slot>
                </motion.div>
              </template>
            </div>
          </div>
        </div>
      </template>
    </Teleport>
  </LayoutGroup>
</template>

<style scoped>
.be-project-folder {
  --pf-line: color-mix(in srgb, var(--beui-foreground) 10%, transparent);
  position: relative; display: block; box-sizing: border-box; width: 18rem; height: 14rem; margin: 0; padding: 0; border: 0; border-radius: 1rem;
  background: transparent; color: var(--beui-foreground); font: inherit; font-size: 1rem; line-height: 1.5; text-align: left; cursor: pointer;
  user-select: none; -webkit-user-select: none; outline: none; perspective: 1200px;
}
.be-project-folder:focus-visible { box-shadow: 0 0 0 4px var(--beui-background), 0 0 0 6px var(--beui-ring); }
.be-project-folder:disabled { cursor: not-allowed; opacity: .5; }
.be-project-folder-back { position: absolute; inset: 0; border: 1px solid var(--pf-line); border-radius: 1rem; background: color-mix(in srgb, var(--beui-background) 25%, transparent); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); transform-origin: center bottom; }
.be-project-folder-stage { pointer-events: none; position: absolute; inset: 0; }
.be-project-folder-anchor { position: absolute; left: 50%; top: 0; display: block; width: 0; height: 0; }
.be-project-folder-file { position: absolute; left: 0; top: 0; display: block; width: 6rem; height: 10rem; margin-left: -3rem; overflow: hidden; border: 1px solid var(--pf-line); border-radius: .5rem; background: color-mix(in srgb, var(--beui-background) 45%, transparent); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
.be-project-folder-front { position: absolute; inset: auto 0 0; z-index: 20; overflow: hidden; border: 1px solid var(--pf-line); border-radius: 1rem; background: color-mix(in srgb, var(--beui-background) 60%, transparent); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px); backface-visibility: hidden; transform-origin: center bottom; }
.be-project-folder-title-row { display: flex; height: 4rem; align-items: center; padding-inline: 1rem; }
.be-project-folder-title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; font-size: 1.25rem; line-height: 1.25; font-weight: 500; color: var(--beui-foreground); }
.be-project-folder-meta-row { display: flex; height: 3rem; align-items: center; justify-content: space-between; gap: .75rem; padding-inline: 1rem; border-top: 1px solid var(--pf-line); }
.be-project-folder-count { flex: none; font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: color-mix(in srgb, var(--beui-foreground) 70%, transparent); }
.be-project-folder-description { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }

.be-project-folder-backdrop { position: fixed; inset: 0; z-index: 100; display: block; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; cursor: default; background: color-mix(in srgb, var(--beui-background) 80%, transparent); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
.be-project-folder-backdrop.is-closing { pointer-events: none; }
.be-project-folder-dialog { pointer-events: none; position: fixed; inset: 2rem 1.5rem; z-index: 101; display: flex; align-items: flex-start; justify-content: center; overflow-y: auto; color: var(--beui-foreground); font-size: 1rem; line-height: 1.5; }
@media (min-width: 640px) { .be-project-folder-dialog { align-items: center; } }
.be-project-folder-panel { pointer-events: auto; position: relative; z-index: 10; width: 100%; max-width: 61rem; }
.be-project-folder-panel.is-closing { pointer-events: none; }
.be-project-folder-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
.be-project-folder-heading { margin: 0; border: 0; padding: 0; font-size: 1.25rem; line-height: 1.75rem; font-weight: 500; color: var(--beui-foreground); }
.be-project-folder-subheading { margin: .25rem 0 0; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.be-project-folder-close { display: flex; width: 2.5rem; height: 2.5rem; align-items: center; justify-content: center; margin: 0; padding: 0; border: 1px solid var(--pf-line, color-mix(in srgb, var(--beui-foreground) 10%, transparent)); border-radius: 9999px; background: color-mix(in srgb, var(--beui-background) 50%, transparent); color: var(--beui-muted-foreground); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); cursor: pointer; outline: none; transition: color .15s; }
.be-project-folder-close:hover { color: var(--beui-foreground); }
.be-project-folder-close:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-project-folder-close svg { width: 1rem; height: 1rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.be-project-folder-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); place-items: center; gap: .75rem; }
@media (min-width: 640px) { .be-project-folder-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (min-width: 1024px) { .be-project-folder-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
.be-project-folder-sheet { width: 100%; max-width: 10rem; aspect-ratio: 3 / 4; overflow: hidden; border: 1px solid color-mix(in srgb, var(--beui-foreground) 10%, transparent); border-radius: .75rem; background: color-mix(in srgb, var(--beui-background) 50%, transparent); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
</style>
