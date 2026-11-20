<script setup lang="ts">
import { Input } from 'beui-vue'
import { ref } from 'vue'
const email = ref('')
const password = ref('example')
const query = ref('Ada')
const show = ref(false)
</script>
<template>
  <div class="fields">
    <Input v-model="email" label="Email" type="email" placeholder="you@example.com" :error="email.length > 0 && !email.includes('@') ? 'Enter a valid email address.' : undefined" reserve-error-line><template #leftIcon>✉</template></Input>
    <Input v-model="password" label="Password" :type="show ? 'text' : 'password'" reserve-error-line><template #rightIcon><button type="button" :aria-label="show ? 'Hide password' : 'Show password'" @click="show = !show">◉</button></template></Input>
    <Input v-model="query" label="Search" :success="query.length > 1" reserve-error-line><template #leftIcon>⌕</template></Input>
  </div>
</template>
<style scoped>.fields { display: grid; width: min(20rem,100%); gap: .25rem; } .fields button { font: inherit; cursor: pointer; }</style>
