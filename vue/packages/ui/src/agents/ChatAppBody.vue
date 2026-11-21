<script setup lang="ts">
/**
 * Folds the sidebar away while the shell is too narrow to carry both panes, and
 * brings it back when it isn't. Only crossings are acted on, so a manual toggle
 * at either size stays put until the shell actually changes shape.
 *
 * Mount is not a crossing in the opening direction: a shell that merely has room
 * says nothing about whether the caller wanted the sidebar open, so the first
 * measurement leaves `defaultOpen` alone. Too narrow at mount is the fold
 * condition itself, so that half applies immediately.
 */
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { useAnimatedSidebar } from '../layout/animated-sidebar/context'

const props = defineProps<{ fit: boolean, minWidth: number }>()
const sidebar = useAnimatedSidebar()
const marker = useTemplateRef<HTMLElement>('marker')
let observer: ResizeObserver | undefined
let narrow: boolean | null = null

onMounted(() => {
  const shell = marker.value?.parentElement
  if (!shell) return
  observer = new ResizeObserver(([entry]) => {
    if (!props.fit) return
    const next = entry.contentRect.width < props.minWidth
    if (narrow === next) return
    const first = narrow === null
    narrow = next
    if (first && !next) return
    const wanted = !next
    // Already where the shell wants it: saying so again would only be an openChange nobody asked for.
    if (sidebar.open.value === wanted) return
    sidebar.setOpen(wanted)
  })
  observer.observe(shell)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="marker" hidden />
  <slot :open="sidebar.open.value" :set-open="sidebar.setOpen" :toggle="sidebar.toggleSidebar" />
</template>
