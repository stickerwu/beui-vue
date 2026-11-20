<script setup lang="ts">
import { FeedbackWidget } from 'beui-vue'
async function send() { await new Promise(resolve => setTimeout(resolve,200)) }
</script>
<template><FeedbackWidget title="Share feedback" placeholder="What could work better?" :on-submit="send" /></template>
