<script setup lang="ts">
import { onBeforeUnmount, shallowRef, useId } from 'vue'
import { useValue, sourceUrl } from '../agents/shared'
import { accepts, filesize, type UploadItem, type UploadProps } from './uploads'
const props = withDefaults(defineProps<UploadProps & { attachment?: boolean }>(), { defaultValue: () => [], multiple: true, maxFiles: Infinity, maxFileSize: Infinity })
const emit = defineEmits<{
  'update:modelValue': [value: UploadItem[]], valueChange: [value: UploadItem[]], filesAdded: [items: UploadItem[], files: File[]],
  filesRejected: [files: File[], reason: string], remove: [item: UploadItem], retry: [item: UploadItem], audioToggle: [item: UploadItem]
}>()
const { value: items, set } = useValue<UploadItem[]>(() => props.modelValue ?? props.value, props.defaultValue, next => { emit('update:modelValue',next); emit('valueChange',next) })
const picker = shallowRef<HTMLInputElement | null>(null)
const dragging = shallowRef(false)
const note = shallowRef('')
const id = useId()
const previews = new Map<string,string>()
let sequence = 0
function add(input: FileList | File[] | null) {
  dragging.value = false
  if (props.disabled || !input) return
  const added: UploadItem[] = []
  const rejected = new Map<string,File[]>()
  for (const file of Array.from(input)) {
    let reason: string | undefined
    if (!accepts(file,props.accept)) reason = 'type'
    else if (file.size > props.maxFileSize) reason = 'too-large'
    else if ((!props.multiple && added.length) || items.value.length + added.length >= props.maxFiles) reason = 'max-files'
    if (reason) { rejected.set(reason,[...(rejected.get(reason) ?? []),file]); continue }
    const item: UploadItem = { id:`${id}-${++sequence}`, name:file.name, size:file.size, type:file.type, file, status:props.attachment ? 'idle' : 'queued' }
    item.kind = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : 'file'
    if (props.attachment && item.kind === 'image') { item.previewUrl = URL.createObjectURL(file); previews.set(item.id,item.previewUrl) }
    added.push(item)
  }
  if (added.length) { set([...items.value,...added]); emit('filesAdded',added,added.map(item => item.file!)) }
  for (const [reason, files] of rejected) emit('filesRejected',files,reason)
  note.value = rejected.size ? 'Some files could not be added.' : `${added.length} files added.`
  if (picker.value) picker.value.value = ''
}
function remove(item: UploadItem) {
  if (props.disabled) return
  set(items.value.filter(entry => entry.id !== item.id)); emit('remove',item)
  const url = previews.get(item.id)
  if (url) { URL.revokeObjectURL(url); previews.delete(item.id) }
  note.value = `${item.name} removed.`
}
onBeforeUnmount(() => { for (const url of previews.values()) URL.revokeObjectURL(url) })
</script>
<template>
  <div class="be-block be-block-stack" :data-variant="variant">
    <div class="be-upload-zone" :class="{ 'be-upload-drag':dragging }" @dragover.prevent="dragging = !disabled" @dragleave="dragging = false" @drop.prevent="add($event.dataTransfer?.files ?? null)">
      <div aria-hidden="true" class="be-upload-icon">↑</div><strong>{{ title ?? (attachment ? 'Add attachments' : 'Upload files') }}</strong><span class="be-block-muted">{{ description ?? 'Drag and drop files here, or browse your device.' }}</span>
      <input ref="picker" type="file" :accept="accept" :multiple="multiple" :disabled="disabled" tabindex="-1" hidden @change="add(($event.target as HTMLInputElement).files)" />
      <button type="button" class="be-block-button" :disabled="disabled" @click="picker?.click()">{{ browseLabel ?? 'Browse files' }}</button>
    </div>
    <ul v-if="items.length" class="be-block-list" aria-label="Files"><li v-for="item in items" :key="item.id" class="be-upload-item">
      <img v-if="attachment && item.kind === 'image' && item.previewUrl" :src="item.previewUrl" alt="" />
      <div><slot name="item" :item="item"><a v-if="item.kind === 'link' && sourceUrl(item.href)" :href="sourceUrl(item.href)" rel="noopener noreferrer">{{ item.name }}</a><strong v-else>{{ item.name }}</strong><div class="be-block-muted">{{ item.error || `${filesize(item.size)} ${item.status ?? ''}` }}</div></slot><progress v-if="item.progress !== undefined" :value="item.progress" max="100" :aria-label="`Upload progress for ${item.name}`" /></div>
      <button v-if="item.kind === 'audio'" type="button" class="be-block-button" @click="emit('audioToggle',item)">{{ playingId === item.id ? 'Pause' : 'Play' }}</button>
      <button v-if="item.status === 'failed' || item.status === 'error'" type="button" class="be-block-button" :disabled="disabled" @click="emit('retry',item)">Retry</button><button type="button" class="be-block-button be-block-end" :disabled="disabled" :aria-label="`Remove ${item.name}`" @click="remove(item)">×</button>
    </li></ul><span role="status" class="be-agent-sr">{{ note }}</span>
  </div>
</template>
<style scoped>.be-upload-zone{display:flex;flex-direction:column;align-items:center;gap:.4rem;padding:1.5rem;border:1px dashed var(--beui-border);border-radius:1rem;background:var(--beui-muted);text-align:center}.be-upload-icon{font-size:1.6rem}.be-upload-drag{outline:2px solid var(--beui-primary)}.be-upload-item{display:flex;align-items:center;gap:.65rem;padding:.6rem;border-bottom:1px solid var(--beui-border)}.be-upload-item img{width:2.5rem;height:2.5rem;border-radius:.5rem;object-fit:cover}.be-upload-item>div{min-width:0;overflow-wrap:anywhere}</style>
