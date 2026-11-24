<script setup lang="ts">
import { motion } from 'motion-v'
import { pressSpring, useReducedMotion } from 'beui-vue'
import GuideIcon from './GuideIcon.vue'

/** beui.dev's motion-guide ReplayButton. */
defineProps<{ label: string }>()
defineEmits<{ click: [] }>()
const reduce = useReducedMotion()
</script>

<template>
  <motion.button
    type="button" class="beui-mg-replay" :while-press="reduce ? undefined : { scale: 0.97 }" :transition="pressSpring"
    @click="$emit('click')"
  >
    <GuideIcon name="refresh-cw" class="beui-mg-icon-3" />
    {{ label }}
  </motion.button>
</template>
