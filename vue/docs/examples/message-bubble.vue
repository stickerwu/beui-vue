<script setup lang="ts">
import { MessageBubble, MessageBubbleCollapsible, MessageBubbleContent, MessageBubbleGroup } from 'beui-vue'
</script>
<template>
  <MessageBubbleGroup class="be-agent-demo" spacing="default">
    <MessageBubble align="end" variant="solid"><MessageBubbleContent>Can you summarize the meeting?</MessageBubbleContent></MessageBubble>
    <MessageBubble><MessageBubbleContent>We agreed to ship the first prototype on Friday.</MessageBubbleContent></MessageBubble>
    <MessageBubble variant="outline"><MessageBubbleContent><MessageBubbleCollapsible :collapsed-lines="2">The design review covered keyboard navigation, mobile layouts, and loading states.<br />The team will check each flow in a real browser.<br />Review notes are available in the project folder.</MessageBubbleCollapsible></MessageBubbleContent></MessageBubble>
  </MessageBubbleGroup>
</template>
