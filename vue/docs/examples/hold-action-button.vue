<script setup lang="ts">
import { HoldActionButton } from 'beui-vue'
import { ref } from 'vue'
const count = ref(0)
</script>
<template><HoldActionButton @hold-complete="count++">Hold to confirm</HoldActionButton> <output>Confirmed {{ count }}</output></template>
