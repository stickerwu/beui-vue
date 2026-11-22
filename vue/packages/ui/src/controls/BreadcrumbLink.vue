<script setup lang="ts">
import type { Component } from 'vue'

/** A crumb that navigates. Renders an `<a>`; give `as` your router's link component to use it instead. */
withDefaults(defineProps<{
  /** Element or component to render, for a router link. Everything else falls through to it. */
  as?: string | Component
}>(), { as: 'a' })
defineSlots<{ default?: () => unknown }>()
</script>

<template>
  <component :is="as" class="be-crumb-link"><slot /></component>
</template>

<style>
.be-crumb-link { display: inline-flex; box-sizing: border-box; min-height: 2rem; min-width: 0; align-items: center; gap: .375rem; padding: 0 .5rem; border: 0; border-radius: .375rem; background: none; color: var(--beui-muted-foreground); font: inherit; font-weight: 500; text-decoration: none; cursor: pointer; transition: color .15s cubic-bezier(.4, 0, .2, 1), background-color .15s cubic-bezier(.4, 0, .2, 1); }
.be-crumb-link:hover { background: color-mix(in oklab, var(--beui-muted) 60%, transparent); color: var(--beui-foreground); }
.be-crumb-link:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.be-crumb-link > svg, .be-crumb-page > svg { width: .875rem; height: .875rem; flex: none; }
</style>
