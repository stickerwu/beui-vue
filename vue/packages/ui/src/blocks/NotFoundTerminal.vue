<script setup lang="ts">
import type { NotFoundMessages } from './messages'
import NotFound from './NotFound.vue'

withDefaults(defineProps<{
  className?: string
  code?: string
  title?: string
  description?: string
  homeHref?: string
  homeLabel?: string
  browseHref?: string
  browseLabel?: string
  labels?: Partial<NotFoundMessages>
}>(), { code: '404' })
</script>

<template>
  <NotFound variant="terminal" v-bind="$props" />
</template>
