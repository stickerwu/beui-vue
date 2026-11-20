<script setup lang="ts">
import { AISidebar, ChatApp, Message, MessageBubble, MessageBubbleContent, MessageGroup, MessageScroller, PromptInput, type SidebarResource } from 'beui-vue'
import { ref } from 'vue'
const items: SidebarResource[] = [{ id:'design', label:'Design review', kind:'project' }, { id:'release', label:'Release notes', kind:'file' }]
const messages = ref([{ from:'assistant' as 'user' | 'assistant', text:'How can I help with your project?' }])
function send(text: string) { messages.value.push({from:'user',text}, {from:'assistant',text:`Added to the conversation: ${text}`}) }
</script>
<template><ChatApp sidebar-width="11rem"><template #sidebar><AISidebar :default-items="items" /></template><template #default="{ open, toggle }"><div><button type="button" class="be-agent-button" :aria-expanded="open" @click="toggle">Resources</button></div><MessageScroller style="height:12rem"><MessageGroup><Message v-for="(message,index) in messages" :key="index" :from="message.from"><MessageBubble :variant="message.from === 'user' ? 'solid' : 'soft'"><MessageBubbleContent>{{ message.text }}</MessageBubbleContent></MessageBubble></Message></MessageGroup></MessageScroller><PromptInput @submit="send" /></template></ChatApp></template>
