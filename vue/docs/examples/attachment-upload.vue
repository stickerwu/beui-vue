<script setup lang="ts">
import { AttachmentUpload, type AttachmentUploadItem } from 'beui-vue'
import { onBeforeUnmount, shallowRef, watch } from 'vue'

const items = shallowRef<AttachmentUploadItem[]>([
  { id: 'brief', name: 'launch-brief.pdf', kind: 'file', size: 32_400_000, href: 'data:application/pdf,beUI%20launch%20brief', status: 'failed', error: 'Upload failed' },
  { id: 'flowers', name: 'orange-flowers.jpg', kind: 'image', size: 9_800_000, previewUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=85' },
  { id: 'voice-note', name: 'launch-note.m4a', kind: 'audio', currentTime: 12, duration: 48 },
])
const playingId = shallowRef<string>()
const timers = new Set<ReturnType<typeof setTimeout>>()
let ticker: ReturnType<typeof setInterval> | undefined

function patch(id: string, change: Partial<AttachmentUploadItem>) {
  items.value = items.value.map(item => item.id === id ? { ...item, ...change } : item)
}

// Retry: uploading, then complete, then back to idle.
function retry(retried: AttachmentUploadItem) {
  patch(retried.id, { status: 'uploading', error: undefined })
  timers.add(setTimeout(() => patch(retried.id, { status: 'complete' }), 900))
  timers.add(setTimeout(() => patch(retried.id, { status: 'idle' }), 1900))
}

// Playback advances the audio clock one second at a time and stops at the end.
watch(playingId, id => {
  clearInterval(ticker)
  if (!id) return
  ticker = setInterval(() => {
    const item = items.value.find(entry => entry.id === id)
    if (!item?.duration) return
    const next = Math.min(item.duration, (item.currentTime ?? 0) + 1)
    patch(id, { currentTime: next })
    if (next >= item.duration) playingId.value = undefined
  }, 1000)
})
onBeforeUnmount(() => { clearInterval(ticker); for (const timer of timers) clearTimeout(timer) })
</script>

<template>
  <div class="attachment-demo">
    <AttachmentUpload
      :value="items"
      :playing-id="playingId"
      attachments-label="Attachments:"
      @value-change="items = $event"
      @retry="retry"
      @audio-toggle="playingId = playingId === $event.id ? undefined : $event.id"
    />
  </div>
</template>

<style scoped>
.attachment-demo { box-sizing: border-box; width: 100%; max-width: 42rem; padding: 1.5rem; }
</style>
