<script setup lang="ts">
import { useAnimatedSidebarPanel } from './context'

const { collapsed } = useAnimatedSidebarPanel()
</script>

<template>
  <div data-slot="sidebar-group-label" class="be-asb-group-label" :aria-hidden="collapsed" :data-collapsed="collapsed"><slot /></div>
</template>

<style>
:where(.be-asb-group-label) {
  height: 1.75rem; margin-bottom: .25rem; padding: 0 .5rem; overflow: hidden; color: var(--beui-muted-foreground);
  font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: .14em; transition: opacity .15s;
}
.be-asb-group-label[data-collapsed=true] { opacity: 0; }
</style>
