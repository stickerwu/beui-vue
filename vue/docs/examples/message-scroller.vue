<script setup lang="ts">
import { Message, MessageBubble, MessageBubbleContent, MessageGroup, MessageScroller } from 'beui-vue'
import { ref } from 'vue'
const messages = ref(['Review the plan.', 'The plan has three milestones.', 'What comes first?', 'Start with the keyboard interactions.', 'Can we include mobile?', 'Yes, mobile layouts are part of the first milestone.'])
</script>
<template><div class="be-agent-demo"><MessageScroller style="height: 12rem" navigation="rail"><MessageGroup spacing="default"><Message v-for="(text,index) in messages" :key="index" :from="index % 2 ? 'assistant' : 'user'"><MessageBubble :variant="index % 2 ? 'soft' : 'solid'"><MessageBubbleContent>{{ text }}</MessageBubbleContent></MessageBubble></Message></MessageGroup></MessageScroller><button type="button" class="be-agent-button" @click="messages.push(`Update ${messages.length + 1}`)">Append message</button></div></template>
