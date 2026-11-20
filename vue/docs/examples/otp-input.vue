<script setup lang="ts">
import { ref } from 'vue'
import { OTPInput } from 'beui-vue'
const status = ref<'idle'|'success'>('idle')
</script>
<template><OTPInput label="One-time passcode" :status="status" success-message="Verified" @change="status='idle'" @complete="status='success'" /></template>
