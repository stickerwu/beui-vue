<script setup lang="ts">
import { onMounted, provide, shallowRef } from 'vue'
import { previewVariantKey } from './preview-variant'

// A page with several upstream examples renders one frame per example; `variant` pins
// the demo inside to that example (read through usePreviewVariant / useAgentVariant).
const { variant } = defineProps<{ variant?: string }>()
provide(previewVariantKey, variant)
const ready = shallowRef(false)
onMounted(() => { ready.value = true })
</script>

<template>
  <div class="beui-demo" :data-ready="ready" :data-variant="variant"><slot /></div>
</template>
