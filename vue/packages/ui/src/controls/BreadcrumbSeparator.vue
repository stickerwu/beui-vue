<script setup lang="ts">
/** Decorative separator, placed inside the following `BreadcrumbItem`. */
defineSlots<{
  /** Replaces the chevron. */
  default?: () => unknown
}>()
</script>

<template>
  <span aria-hidden="true" data-breadcrumb-separator="" class="be-crumb-separator">
    <slot><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg></slot>
  </span>
</template>

<style>
.be-crumb-separator { display: inline-flex; flex: none; align-items: center; color: color-mix(in oklab, var(--beui-muted-foreground) 50%, transparent); }
.be-crumb-separator > svg { width: .875rem; height: .875rem; }
[dir=rtl] .be-crumb-separator { transform: rotate(180deg); }
</style>
