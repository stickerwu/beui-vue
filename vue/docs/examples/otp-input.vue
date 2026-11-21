<script setup lang="ts">
import { ref } from 'vue'
import { OTPInput } from 'beui-vue'
const code = '123456'
const value = ref('')
const status = ref<'idle' | 'success' | 'error'>('idle')
</script>
<template>
  <div class="verification">
    <OTPInput v-model="value" label="Verification code" :hint="`Enter ${code} to verify.`" :status="status"
      success-message="Verified." error-message="Wrong code, try again." @change="status = 'idle'"
      @complete="status = $event === code ? 'success' : 'error'" />
  </div>
</template>
<style scoped>.verification { display: flex; flex-direction: column; align-items: center; gap: 1rem; }</style>
