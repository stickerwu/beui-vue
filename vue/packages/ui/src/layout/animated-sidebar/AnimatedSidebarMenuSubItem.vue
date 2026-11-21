<script setup lang="ts">
import { motion } from 'motion-v'
import { SUBMENU_ITEM_VARIANTS } from './context'
</script>

<template>
  <motion.li :variants="SUBMENU_ITEM_VARIANTS" data-slot="sidebar-menu-sub-item" class="be-asb-sub-item"><slot /></motion.li>
</template>

<style>
:where(.be-asb-sub-item) { position: relative; min-width: 0; }
</style>
