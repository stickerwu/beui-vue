<script setup lang="ts">
import { ref, watch } from 'vue'
import { Message, MessageAvatar, MessageContent, MessageHeader, MessageFooter, MessageBubble, MessageBubbleCollapsible, MessageBubbleContent, MessageGroup } from 'beui-vue'
import { useAgentVariant } from '../.vitepress/use-agent-variant'

const props = defineProps<{variant?:string}>()
const {variant, choose, options} = useAgentVariant(() => props.variant,{
  surfaces:'agents/message-bubble', avatars:'agents/message-bubble-avatars', 'show-more':'agents/message-bubble-collapsible',
})
const prompt = ref('')
const messages = ref<{from:'user'|'assistant',text:string}[]>([{from:'user',text:'Show me an animated bubble.'}])
const replay = ref(0)
const visible = ref(1)
watch([variant,replay],([view],_,cleanup) => {
  if (view !== 'avatars' || typeof window === 'undefined') return
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) { visible.value=3; return }
  visible.value=1
  const first = setTimeout(() => { visible.value=2 },650)
  const second = setTimeout(() => { visible.value=3 },1550)
  cleanup(() => { clearTimeout(first); clearTimeout(second) })
})
function send() {
  const text = prompt.value.trim()
  if (!text) return
  messages.value.push({from:'user',text},{from:'assistant',text:'That message mounted once with a spring pop. Streaming updates only change its content, so the entrance does not replay.'})
  prompt.value=''
}
const conversation = [
  {from:'user',label:'You',icon:'●',text:'Can you turn these notes into a launch update?'},
  {from:'assistant',label:'Assistant',icon:'✦',text:'Absolutely. I’ll keep it concise and lead with what changed.'},
  {from:'assistant',label:'Assistant',icon:'✦',text:'Do you want the tone to feel more technical or more customer-facing?'},
] as const
</script>

<template>
  <div class="be-agent-demo be-block-stack" :data-example-variant="variant">
    <label>Example <select :value="variant" @change="choose(($event.target as HTMLSelectElement).value)"><option v-for="option in options" :key="option">{{ option }}</option></select></label>
    <template v-if="variant==='surfaces'">
      <MessageGroup spacing="default"><Message v-for="(item,index) in messages" :key="index" :from="item.from"><MessageBubble :align="item.from==='user'?'end':'start'" :variant="item.from==='user'?'solid':'soft'"><MessageBubbleContent>{{ item.text }}</MessageBubbleContent></MessageBubble></Message></MessageGroup>
      <form class="be-block-row" @submit.prevent="send"><input v-model="prompt" class="be-block-field" aria-label="Send a bubble" placeholder="Send a bubble…"><button type="submit" class="be-block-button" :disabled="!prompt.trim()">Send</button></form>
    </template>
    <template v-else-if="variant==='avatars'">
      <MessageGroup spacing="default">
        <Message v-for="(item,index) in conversation.slice(0,visible)" :key="item.text" :from="item.from">
          <MessageAvatar :placeholder="index===2">{{ index<2 ? item.icon : '' }}</MessageAvatar>
          <MessageContent><MessageHeader v-if="index<2">{{ item.label }} · {{ index===0 ? 'Now' : 'Just now' }}</MessageHeader>
            <MessageBubble :variant="item.from==='user'?'solid':'soft'"><MessageBubbleContent>{{ item.text }}</MessageBubbleContent></MessageBubble>
            <MessageFooter v-if="index===0">Delivered</MessageFooter>
          </MessageContent>
        </Message>
      </MessageGroup><button type="button" class="be-block-button" @click="replay++">Replay</button>
    </template>
    <Message v-else from="assistant"><MessageAvatar>✦</MessageAvatar><MessageContent><MessageHeader>Assistant · Summary</MessageHeader><MessageBubble variant="soft" :animate-in="false"><MessageBubbleContent><MessageBubbleCollapsible :collapsed-lines="2">
      The release introduces a compact conversation surface.<br>Keyboard navigation and reduced motion are covered.<br>The first review focused on spacing and accessible names.<br>Design QA is scheduled for Friday.<br>Detailed release notes follow the sign-off.
    </MessageBubbleCollapsible></MessageBubbleContent></MessageBubble></MessageContent></Message>
  </div>
</template>
