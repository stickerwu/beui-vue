<script setup lang="ts">
import ButtonBase from './ButtonBase.vue'

// The link form of the button: the same look and press feel on an <a>.
const { variant = 'primary', size = 'md', pressScale = 0.93, href = '' } = defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  pressScale?: number
  href?: string
}>()
</script>

<template>
  <ButtonBase :variant="variant" :size="size" :press-scale="pressScale" :href="href"><slot /></ButtonBase>
</template>
