<script setup lang="ts">
import { Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader, MessageTyping, MessageBubble, MessageBubbleContent } from 'beui-vue'
</script>
<template>
  <MessageGroup spacing="default" class="be-agent-demo">
    <Message from="user"><MessageAvatar>Y</MessageAvatar><MessageContent><MessageHeader>You</MessageHeader><MessageBubble variant="solid"><MessageBubbleContent>What changed in this release?</MessageBubbleContent></MessageBubble></MessageContent></Message>
    <Message from="assistant"><MessageAvatar>A</MessageAvatar><MessageContent><MessageHeader>Assistant</MessageHeader><MessageBubble><MessageBubbleContent>I’ll review the notes and put together a summary.</MessageBubbleContent></MessageBubble><MessageFooter><MessageTyping /></MessageFooter></MessageContent></Message>
  </MessageGroup>
</template>
