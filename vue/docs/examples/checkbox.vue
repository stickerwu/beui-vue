<script setup lang="ts">
import { Checkbox } from 'beui-vue'
import { ref } from 'vue'
import { usePreviewVariant } from './use-preview-variant'
// `?variant=description` shows the second upstream preview.
const { variant } = usePreviewVariant('description')
const terms = ref(true)
const updates = ref(false)
const comments = ref(true)
const mentions = ref(true)
const digest = ref(false)
</script>
<template>
  <div v-if="variant === 'description'" class="description">
    <Checkbox v-model="comments" label="Comments" description="Replies on threads you started." />
    <Checkbox v-model="mentions" label="Mentions" description="Whenever someone tags you by name." />
    <Checkbox v-model="digest" label="Weekly digest" description="A summary of activity every Monday." />
    <Checkbox :model-value="false" disabled label="SMS alerts" description="Add a phone number to enable." />
  </div>
  <div v-else class="choices">
    <Checkbox v-model="terms" label="Accept terms and conditions" />
    <Checkbox v-model="updates" label="Email me product updates" />
    <Checkbox :model-value="true" indeterminate label="Select all (partial)" />
    <Checkbox :model-value="true" disabled label="Disabled" />
  </div>
</template>
<style scoped>
.choices, .description { display: flex; flex-direction: column; gap: 0.75rem; }
.description { width: 100%; max-width: 16rem; }
</style>
