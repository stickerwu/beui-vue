<script setup lang="ts">
import { HoldActionButton } from 'beui-vue'
import { onBeforeUnmount, shallowRef } from 'vue'

const confirmed = shallowRef(false)
let timer: ReturnType<typeof setTimeout> | undefined
function complete() {
  confirmed.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { confirmed.value = false }, 1800)
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="hold-demo">
    <HoldActionButton @hold-complete="complete">Hold for vertical fill</HoldActionButton>
    <HoldActionButton type="horizontal" @hold-complete="complete">Hold for horizontal fill</HoldActionButton>
    <p aria-live="polite">{{ confirmed ? 'Action confirmed' : 'Release early to cancel' }}</p>
  </div>
</template>

<style scoped>
.hold-demo { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .75rem; }
.hold-demo p { height: 1rem; margin: 0; color: var(--beui-muted-foreground); font-size: .75rem; line-height: 1rem; }
</style>
