<script lang="ts">
export interface AvatarGroupMember {
  id: string
  name: string
  /** Image URL. Without one, or if it fails to load, initials show. */
  src?: string
}
export type AvatarSize = 'sm' | 'md' | 'lg'

/** English defaults for `AvatarGroup`. */
export const avatarGroupMessages = {
  label: 'Members',
  showFewer: 'Show fewer members',
  showMore: 'Show {count} more members',
}
export type AvatarGroupMessages = typeof avatarGroupMessages
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, shallowRef } from 'vue'
import { useMountedMedia } from '../core/mounted-media'
import { easeOut, layoutSpring, pressSpring } from '../core/motion'
import Tooltip from './tooltip/Tooltip.vue'
import TooltipProvider from './tooltip/TooltipProvider.vue'

const SIZES = {
  sm: { text: '10px', px: 28 },
  md: { text: '.75rem', px: 36 },
  lg: { text: '.875rem', px: 44 },
} as const

const props = withDefaults(defineProps<{
  members: readonly AvatarGroupMember[]
  /** Avatars shown before the rest collapse into a +N count. */
  max?: number
  size?: AvatarSize
  /** Whether every member is shown. Pair with `@update:expanded`. */
  expanded?: boolean
  defaultExpanded?: boolean
  /** Accessible name for the list, such as "Project members". */
  label?: string
  /** Override any built-in string. `{count}` fills `showMore`. */
  labels?: Partial<AvatarGroupMessages>
  className?: string
}>(), { max: 4, size: 'md', defaultExpanded: false, expanded: undefined })
const emit = defineEmits<{ 'update:expanded': [value: boolean]; expandedChange: [value: boolean] }>()

const reduce = useReducedMotion()
// `useHoverCapable`: touch devices fire a phantom sticky `:hover` on tap, so the
// fan-apart only runs where a real pointer can leave.
const canHover = useMountedMedia('(hover: hover) and (pointer: fine)')
const localExpanded = shallowRef(props.defaultExpanded)
const isExpanded = computed(() => props.expanded ?? localExpanded.value)
// Index of the avatar under a mouse pointer; the +N button counts as the last slot.
const hovered = shallowRef<number | null>(null)
const failed = shallowRef(new Set<string>())

const text = computed(() => ({ ...avatarGroupMessages, ...props.labels }))
const limit = computed(() => Math.max(1, props.max))
const overflow = computed(() => Math.max(0, props.members.length - limit.value))
const visible = computed(() => (isExpanded.value ? props.members : props.members.slice(0, limit.value)))
const px = computed(() => SIZES[props.size].px)
// Avatars overlap by a third of their width. Hovering one parts the row around
// it: everything before slides back, everything after slides on, so the hovered
// avatar shows in full while the group stays in place.
const geometry = computed(() => {
  const overlap = Math.round(px.value / 3)
  return { overlap, rest: -overlap, push: Math.round(overlap * .75) }
})
const parting = computed(() => !reduce.value && canHover.value && hovered.value !== null)
function offset(index: number) {
  if (!parting.value || index === hovered.value) return 0
  return index < (hovered.value ?? 0) ? -geometry.value.push : geometry.value.push
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0]![0]! + parts[parts.length - 1]![0]! : (parts[0] ?? '?').slice(0, 2)
  return letters.toUpperCase() || '?'
}

function toggle() {
  const next = !isExpanded.value
  if (props.expanded === undefined) localExpanded.value = next
  emit('update:expanded', next)
  emit('expandedChange', next)
}

const showMore = computed(() => text.value.showMore.replace('{count}', String(overflow.value)))
function enter(index: number, event: PointerEvent) {
  if (event.pointerType === 'mouse') hovered.value = index
}
function fail(src: string) {
  const next = new Set(failed.value)
  next.add(src)
  failed.value = next
}
</script>

<template>
  <TooltipProvider :skip-delay="400">
  <div class="be-avatars" :class="className" :data-size="size" @pointerleave="hovered = null">
    <ul :aria-label="label ?? text.label" class="be-avatars-list" :data-size="size" :style="{ '--avatar-text': SIZES[size].text }">
      <AnimatePresence :initial="false" mode="popLayout">
        <motion.li
          v-for="(member, index) in visible"
          :key="member.id"
          class="be-avatar-slot"
          :layout="reduce ? false : 'position'"
          :initial="{ opacity: 0, scale: reduce ? 1 : .6 }"
          :animate="{ opacity: 1, scale: 1 }"
          :exit="{ opacity: 0, scale: reduce ? 1 : .6, transition: { duration: .14, ease: easeOut } }"
          :transition="{ layout: layoutSpring, scale: layoutSpring, opacity: { duration: .18, ease: easeOut } }"
          :style="{ marginInlineStart: index === 0 ? 0 : geometry.rest, zIndex: parting && hovered === index ? visible.length + 1 : index, position: 'relative' }"
        >
          <Tooltip :content="member.name" side="top">
            <motion.span
              class="be-avatar-part"
              :animate="{ x: offset(index), y: parting && hovered === index ? -3 : 0, scale: parting && hovered === index ? 1.06 : 1 }"
              :transition="layoutSpring"
              @pointerenter="enter(index, $event)"
            >
              <span class="be-avatar">
                <img
                  v-if="member.src && !failed.has(member.src)"
                  :src="member.src"
                  :alt="member.name"
                  draggable="false"
                  @error="fail(member.src!)"
                >
                <template v-else>
                  <span aria-hidden="true">{{ initials(member.name) }}</span>
                  <span class="be-avatar-spoken">{{ member.name }}</span>
                </template>
              </span>
            </motion.span>
          </Tooltip>
        </motion.li>
        <motion.li
          v-if="overflow > 0"
          key="overflow"
          class="be-avatar-slot"
          :layout="reduce ? false : 'position'"
          :transition="{ layout: layoutSpring }"
          :style="{ marginInlineStart: geometry.rest, zIndex: visible.length, position: 'relative' }"
        >
          <motion.span class="be-avatar-part" :animate="{ x: offset(visible.length) }" :transition="layoutSpring" @pointerenter="enter(visible.length, $event)">
            <motion.button
              type="button"
              class="be-avatar be-avatar-count"
              :aria-expanded="isExpanded"
              :aria-label="isExpanded ? text.showFewer : showMore"
              :while-press="reduce ? undefined : { scale: .92 }"
              :transition="pressSpring"
              @click="toggle"
            >
              <AnimatePresence :initial="false" mode="popLayout">
                <motion.span
                  :key="isExpanded ? 'less' : 'more'"
                  aria-hidden="true"
                  :initial="{ opacity: 0, y: reduce ? 0 : isExpanded ? 8 : -8 }"
                  :animate="{ opacity: 1, y: 0 }"
                  :exit="{ opacity: 0, y: reduce ? 0 : isExpanded ? -8 : 8 }"
                  :transition="{ duration: .16, ease: easeOut }"
                >{{ isExpanded ? '−' : `+${overflow}` }}</motion.span>
              </AnimatePresence>
            </motion.button>
          </motion.span>
        </motion.li>
      </AnimatePresence>
    </ul>
  </div>
  </TooltipProvider>
</template>

<style scoped>
.be-avatars { display: inline-flex; align-items: center; }
.be-avatars-list { position: relative; display: flex; align-items: center; margin: 0; padding: 0; list-style: none; }
.be-avatar-slot { margin: 0; }
.be-avatar-part { display: block; }
.be-avatar {
  position: relative; display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center;
  box-sizing: border-box; width: 2.25rem; height: 2.25rem; overflow: hidden; border-radius: 50%;
  background: var(--beui-card); color: var(--beui-muted-foreground); font-size: var(--avatar-text, .75rem); font-weight: 500;
  user-select: none; outline: 2px solid var(--beui-background);
}
.be-avatars[data-size=sm] .be-avatar { width: 1.75rem; height: 1.75rem; }
.be-avatars[data-size=md] .be-avatar { width: 2.25rem; height: 2.25rem; }
.be-avatars[data-size=lg] .be-avatar { width: 2.75rem; height: 2.75rem; }
.be-avatar img { width: 100%; height: 100%; object-fit: cover; }
.be-avatar-spoken { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.be-avatar-count {
  border: 0; padding: 0; background: var(--beui-foreground); color: var(--beui-background);
  font: inherit; font-size: var(--avatar-text, .75rem); font-weight: 500; font-variant-numeric: tabular-nums; cursor: pointer;
}
.be-avatar-count:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
</style>
