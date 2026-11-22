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
import Avatar from './Avatar.vue'
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
</script>

<template>
  <TooltipProvider :skip-delay="400">
  <div class="be-avatars" :class="className" :data-size="size" @pointerleave="hovered = null">
    <ul :aria-label="label ?? text.label" class="be-avatars-list">
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
              <Avatar :name="member.name" :src="member.src" :size="size" />
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
              class="be-avatar be-avatar-count" :data-size="size"
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
.be-avatar-part { display: block; border-radius: 9999px; }
.be-avatar-count {
  border: 0; padding: 0; background: var(--beui-foreground); color: var(--beui-background);
  font-family: inherit; font-weight: 500; font-variant-numeric: tabular-nums; cursor: pointer;
}
.be-avatar-count { outline: none; }
.be-avatar-count:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
</style>
