<script setup lang="ts">
import UploadSurface from './UploadSurface.vue'
import type { UploadProps } from './uploads'
const props = withDefaults(defineProps<UploadProps>(), { multiple:true, maxFileSize:524288000 })
</script>
<template><UploadSurface v-bind="props" attachment><template v-if="$slots.item" #item="slotProps"><slot name="item" v-bind="slotProps" /></template></UploadSurface></template>
