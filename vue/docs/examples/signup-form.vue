<script setup lang="ts">
import { SignUpForm, type SignUpValues } from 'beui-vue'
import { shallowRef } from 'vue'

const formError = shallowRef<string>()

async function submit(values: SignUpValues) {
  formError.value = undefined
  await new Promise(resolve => setTimeout(resolve, 1200))
  if (values.email.toLowerCase().startsWith('taken@')) {
    formError.value = 'That email is already registered.'
    throw new Error('Email already registered')
  }
}
</script>

<template>
  <div class="signup-demo">
    <SignUpForm description="Sign up with taken@example.com to see the failure state." :error-message="formError" :on-submit="submit">
      <template #footer>
        Already have an account?
        <button type="button" class="signup-demo-link">Sign in</button>
      </template>
    </SignUpForm>
  </div>
</template>

<style scoped>
.signup-demo { display: flex; width: 100%; justify-content: center; padding-block: 1rem; box-sizing: border-box; }
.signup-demo-link { padding: 0; border: 0; background: transparent; color: var(--beui-foreground); font: inherit; font-weight: 500; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
</style>
