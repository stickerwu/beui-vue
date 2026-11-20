<script setup lang="ts">
import { SignUpForm } from 'beui-vue'
async function complete() { await new Promise(resolve => setTimeout(resolve,250)) }
</script>
<template><SignUpForm title="Create an account" description="Create your demo workspace." :on-submit="complete" /></template>
