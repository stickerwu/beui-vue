<script setup lang="ts">
import { shallowRef } from 'vue'

/** One avatar: the image, or initials when there is no image or it fails. */
const props = withDefaults(defineProps<{
  name: string
  /** Image URL. Without one, or if it fails to load, initials show. */
  src?: string
  size?: 'sm' | 'md' | 'lg'
}>(), { size: 'md' })

const failedSrc = shallowRef<string>()

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0]![0]! + parts[parts.length - 1]![0]! : (parts[0] ?? '?').slice(0, 2)
  return letters.toUpperCase() || '?'
}
</script>

<template>
  <span class="be-avatar" :data-size="size">
    <img v-if="src && failedSrc !== src" :src="src" :alt="name" draggable="false" @error="failedSrc = src">
    <template v-else>
      <span aria-hidden="true">{{ initials(name) }}</span>
      <span class="be-avatar-spoken">{{ name }}</span>
    </template>
  </span>
</template>

<style>
.be-avatar {
  position: relative; display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center;
  box-sizing: border-box; width: 2.25rem; height: 2.25rem; overflow: hidden; border-radius: 50%;
  background: var(--beui-card); color: var(--beui-muted-foreground); font-size: .75rem; line-height: 1rem; font-weight: 500;
  user-select: none; box-shadow: 0 0 0 2px var(--beui-background);
}
.be-avatar[data-size=sm] { width: 1.75rem; height: 1.75rem; font-size: 10px; }
.be-avatar[data-size=md] { width: 2.25rem; height: 2.25rem; font-size: .75rem; }
.be-avatar[data-size=lg] { width: 2.75rem; height: 2.75rem; font-size: .875rem; line-height: 1.25rem; }
.be-avatar img { width: 100%; height: 100%; object-fit: cover; }
.be-avatar-spoken { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
