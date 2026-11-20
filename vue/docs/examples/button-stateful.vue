<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { StatefulButton } from 'beui-vue'
const state = ref<'idle'|'loading'|'success'>('idle')
let timer: ReturnType<typeof setTimeout>
function save() {
  state.value = 'loading'
  timer = setTimeout(() => { state.value = 'success' }, 700)
}
onBeforeUnmount(() => clearTimeout(timer))
</script>
<template><StatefulButton :state="state" loading-text="保存中" success-text="已保存" @click="save">保存更改</StatefulButton></template>
