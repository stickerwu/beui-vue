<script setup lang="ts">
import { Input } from 'beui-vue'
import { computed, ref } from 'vue'

const email = ref('')
const pass = ref('hunter2')
const query = ref('Ada')
const show = ref(false)
const emailError = computed(() => (email.value.length > 0 && !email.value.includes('@') ? 'Enter a valid email address.' : undefined))
</script>
<template>
  <div class="fields">
    <Input v-model="email" label="Email" type="email" placeholder="you@example.com" :error="emailError" reserve-error-line>
      <template #leftIcon>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" /><rect x="2" y="4" width="20" height="16" rx="2" /></svg>
      </template>
    </Input>
    <Input v-model="pass" label="Password" :type="show ? 'text' : 'password'" reserve-error-line>
      <template #rightIcon>
        <button type="button" class="reveal" :aria-label="show ? 'Hide password' : 'Show password'" @click="show = !show">
          <svg v-if="show" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" /><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" /><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" /><path d="m2 2 20 20" /></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
        </button>
      </template>
    </Input>
    <Input v-model="query" label="Search" :success="query.length > 1" reserve-error-line>
      <template #leftIcon>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" /></svg>
      </template>
    </Input>
  </div>
</template>
<style scoped>
.fields { display: flex; width: 100%; max-width: 20rem; flex-direction: column; gap: 0.25rem; }
.reveal { padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; pointer-events: auto; }
</style>
