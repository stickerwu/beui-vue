<script setup lang="ts">
import { ref } from 'vue'
import { BottomSheet, ButtonBase } from 'beui-vue'
const open = ref(false)
</script>
<template><ButtonBase @click="open=true">Open sheet</ButtonBase><BottomSheet v-model:open="open" title="Activity" description="Drag the handle to resize the sheet." :snap-points="[.35,.6,.85]"><ul><li>Launch brief updated</li><li>New design shared</li><li>Release notes published</li></ul></BottomSheet></template>
