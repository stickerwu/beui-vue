<script setup lang="ts">
import { Switch } from 'beui-vue'
import { shallowRef } from 'vue'

const on = shallowRef(true)
</script>

<template>
  <div class="switch-demo">
    <Switch v-model:checked="on" label="Enable notifications" />
    <!-- Controlled-only, like the upstream preview: these two never change. -->
    <Switch :checked="false" label="Off" />
    <Switch checked disabled label="Disabled" />
  </div>
</template>

<style scoped>
.switch-demo { display: flex; flex-direction: column; gap: .75rem; }
</style>
