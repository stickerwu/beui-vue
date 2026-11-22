<script setup lang="ts">
import { FileUpload, type FileUploadItem, type FileUploadVariant } from 'beui-vue'
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { Icon } from './blocks-b-icons'

const initialItems: FileUploadItem[] = [
  { id: 'brand-assets', name: 'brand-assets.zip', size: 18_400_000, type: 'application/zip', progress: 100, status: 'success' },
  { id: 'release-video', name: 'release-cut.mov', size: 84_200_000, type: 'video/quicktime', progress: 58, status: 'uploading' },
  { id: 'contracts', name: 'vendor-contract.pdf', size: 2_800_000, type: 'application/pdf', progress: 32, status: 'error', error: 'Connection lost' },
]
const variants: { id: FileUploadVariant, label: string }[] = [
  { id: 'centered', label: 'Centered' },
  { id: 'default', label: 'Row' },
]

const items = shallowRef(initialItems)
const variant = shallowRef<FileUploadVariant>('centered')
const ready = computed(() => items.value.filter(item => item.status === 'success').length)
const timers = new Map<string, ReturnType<typeof setInterval>>()

function stopUpload(id: string) {
  const timer = timers.get(id)
  if (!timer) return
  clearInterval(timer)
  timers.delete(id)
}

// Simulated upload: every 520ms the item advances by 7-19 points, then flips to success.
function startUpload(id: string) {
  stopUpload(id)
  timers.set(id, setInterval(() => {
    const target = items.value.find(item => item.id === id)
    if (target?.status !== 'uploading') { stopUpload(id); return }
    const progress = Math.min(100, (target.progress ?? 0) + 7 + Math.random() * 12)
    if (progress >= 100) stopUpload(id)
    items.value = items.value.map(item => item.id === id ? { ...item, progress, status: progress >= 100 ? 'success' : 'uploading' } : item)
  }, 520))
}

function reset() {
  for (const item of items.value) stopUpload(item.id)
  items.value = initialItems
  startUpload('release-video')
}

onMounted(() => startUpload('release-video'))
onBeforeUnmount(() => { for (const timer of timers.values()) clearInterval(timer); timers.clear() })
</script>

<template>
  <div class="upload-demo">
    <div class="upload-demo-panel">
      <div class="upload-demo-head">
        <div>
          <p class="upload-demo-title">Upload package</p>
          <p class="upload-demo-sub">{{ ready }} of {{ items.length }} files ready</p>
        </div>

        <div class="upload-demo-tools">
          <div class="upload-demo-switch">
            <button v-for="entry in variants" :key="entry.id" type="button" :data-selected="entry.id === variant" @click="variant = entry.id">{{ entry.label }}</button>
          </div>
          <button type="button" class="upload-demo-reset" aria-label="Reset upload queue" @click="reset"><Icon name="rotateCcw" :size="14" /></button>
        </div>
      </div>

      <FileUpload
        :value="items"
        :variant="variant"
        :max-files="5"
        :title="variant === 'centered' ? 'Drop files to upload' : 'Drop release files'"
        description="PDF, images, video or zipped assets"
        @value-change="items = $event"
        @files-added="added => added.forEach(item => startUpload(item.id))"
        @retry="item => startUpload(item.id)"
        @remove="item => stopUpload(item.id)"
      />
    </div>
  </div>
</template>

<style scoped>
.upload-demo { display: flex; box-sizing: border-box; min-height: 30rem; width: 100%; align-items: center; justify-content: center; }
.upload-demo-panel { box-sizing: border-box; width: 100%; max-width: 28rem; padding: .75rem; border: 1px solid var(--beui-border); border-radius: 2rem; background: var(--beui-background); }
.upload-demo-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem; margin-bottom: .75rem; padding-inline: .25rem; }
.upload-demo-head p { margin: 0; }
.upload-demo-title { font-size: .875rem; line-height: 1.25rem; font-weight: 600; color: var(--beui-foreground); }
.upload-demo-sub { font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.upload-demo-tools { display: flex; align-items: center; gap: .375rem; }
.upload-demo-switch { display: flex; padding: .25rem; border: 1px solid var(--beui-border); border-radius: 9999px; background: var(--beui-muted); }
.upload-demo-switch button { height: 1.75rem; padding: 0 .75rem; border: 0; border-radius: 9999px; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: .75rem; line-height: 1rem; font-weight: 500; cursor: pointer; transition: background-color .15s, color .15s, transform .15s; }
.upload-demo-switch button:hover { color: var(--beui-foreground); }
.upload-demo-switch button:active { transform: scale(.95); }
.upload-demo-switch button[data-selected='true'] { background: var(--beui-background); color: var(--beui-foreground); }
.upload-demo-reset { display: grid; width: 2.25rem; height: 2.25rem; place-items: center; padding: 0; border: 1px solid var(--beui-border); border-radius: 9999px; background: transparent; color: var(--beui-muted-foreground); cursor: pointer; transition: color .15s, transform .15s; }
.upload-demo-reset:hover { color: var(--beui-foreground); }
.upload-demo-reset:active { transform: scale(.95); }
</style>
