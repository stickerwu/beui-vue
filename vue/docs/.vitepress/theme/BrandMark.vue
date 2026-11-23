<script setup lang="ts">
// The beui-vue mark: beUI's squircle in the text colour, so it follows the theme, with Vue's V in Vue green.
const { size = 24 } = defineProps<{ size?: number }>()
</script>

<template>
  <svg class="brand-mark" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path stroke="currentColor" d="M12 3c7.2 0 9 1.8 9 9s-1.8 9-9 9s-9-1.8-9-9s1.8-9 9-9" />
    <path stroke="#41b883" d="M7 8.5h2.7L12 12.4l2.3-3.9H17l-5 8.4z" />
  </svg>
</template>

<style scoped>
.brand-mark { display: block; flex: none; }
</style>
