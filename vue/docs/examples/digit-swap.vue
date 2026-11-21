<script setup lang="ts">
import { computed, ref } from 'vue'
import { DigitSwap } from 'beui-vue'

const CARD_NUMBER = ['4242', '4242', '4242', '0806'].join(' ')
const MASKED_NUMBER = '•••• •••• •••• 0806'
const revealed = ref(false)
const value = computed(() => (revealed.value ? CARD_NUMBER : MASKED_NUMBER))
</script>

<template>
  <div class="swap-demo">
    <div class="swap-field">
      <span class="swap-label">Card number</span>
      <DigitSwap
        :value="value"
        :animation-key="revealed ? 'revealed' : 'masked'"
        :direction="revealed ? 'up' : 'down'"
        :suffix-length="4"
        :glyph-class-name="revealed ? 'swap-on' : 'swap-off'"
        suffix-class-name="swap-on"
        class-name="swap-number"
      />
    </div>
    <button type="button" :aria-label="revealed ? 'Animate masked number' : 'Animate card number'" :aria-pressed="revealed" @click="revealed = !revealed">Animate</button>
  </div>
</template>

<style scoped>
.swap-demo { display: flex; width: 20rem; flex-direction: column; gap: 1.25rem; }
.swap-field { display: flex; flex-direction: column; gap: .5rem; }
.swap-label { font-size: .75rem; line-height: 1rem; font-weight: 500; color: var(--beui-muted-foreground); }
:deep(.swap-number) { font-family: var(--font-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 1.125rem; line-height: 1.75rem; letter-spacing: .08em; font-variant-numeric: tabular-nums; }
:deep(.swap-off) { color: var(--beui-muted-foreground); }
/* After swap-off so the suffix (which carries both classes) stays foreground, like tailwind-merge upstream. */
:deep(.swap-on) { color: var(--beui-foreground); }
button { height: 2.5rem; align-self: flex-start; padding: 0 .75rem; border: 1px solid var(--beui-border); border-radius: .5rem; background: transparent; color: var(--beui-foreground); font: inherit; font-size: .875rem; font-weight: 500; cursor: pointer; outline: none; transition: background-color .15s; }
button:hover { background: var(--beui-muted); }
button:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
</style>
