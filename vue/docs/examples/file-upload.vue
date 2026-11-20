<script setup lang="ts">
import { FileUpload } from 'beui-vue'
</script>
<template><FileUpload :max-files="4" :max-file-size="5 * 1024 * 1024" /></template>
