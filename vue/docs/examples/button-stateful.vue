<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { StatefulButton } from 'beui-vue'

type ButtonState = 'idle' | 'loading' | 'success' | 'error'
const okState = ref<ButtonState>('idle')
const errState = ref<ButtonState>('idle')
const timers = new Set<ReturnType<typeof setTimeout>>()

function later(callback: () => void, delay: number) {
  const id = setTimeout(() => { timers.delete(id); callback() }, delay)
  timers.add(id)
}
function run(target: 'ok' | 'err') {
  const state = target === 'ok' ? okState : errState
  state.value = 'loading'
  later(() => {
    state.value = target === 'ok' ? 'success' : 'error'
    later(() => { state.value = 'idle' }, 1800)
  }, 1400)
}
onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <div class="stateful-demo">
    <StatefulButton :state="okState" variant="primary" size="md" loading-text="Saving" success-text="Saved" @click="run('ok')">
      Save changes
      <template #icon>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
      </template>
    </StatefulButton>
    <StatefulButton :state="errState" variant="secondary" size="md" loading-text="Submitting" error-text="Failed" @click="run('err')">Submit</StatefulButton>
  </div>
</template>

<style scoped>
.stateful-demo { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .75rem; }
</style>
