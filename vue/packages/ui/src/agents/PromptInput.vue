<script lang="ts">
/** English defaults for `PromptInput`. Override per instance with `labels`. */
export const promptInputMessages = {
  placeholder: 'Ask the agent to do something…',
  label: 'Prompt',
  addToPrompt: 'Add to prompt',
  chooseModel: 'Choose model',
  send: 'Send prompt',
  stop: 'Stop generating',
}
export type PromptInputMessages = typeof promptInputMessages

/** A model offered in the picker. `icon` is a lucide name from `AgentIcon` or an image URL. */
export interface PromptModel { value: string, label: string, icon?: string, disabled?: boolean }
/** An entry in the "add to prompt" popover. `icon` is a lucide name from `AgentIcon` or an image URL. */
export interface PromptAction { value: string, label: string, description?: string, icon?: string, disabled?: boolean }
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, watch } from 'vue'
import ButtonBase from '../ButtonBase.vue'
import FloatingPanel from '../controls/FloatingPanel.vue'
import Select from '../controls/choice/Select.vue'
import SelectContent from '../controls/choice/SelectContent.vue'
import SelectItem from '../controls/choice/SelectItem.vue'
import SelectTrigger from '../controls/choice/SelectTrigger.vue'
import { swapSpring } from '../core/motion'
import AgentIcon from './AgentIcon.vue'
import { agentIcons, type AgentIconName } from './icons'
import { useValue, type Labels } from './shared'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  modelValue?: string, value?: string, defaultValue?: string,
  models?: PromptModel[], model?: string, defaultModel?: string,
  actions?: PromptAction[], loading?: boolean, disabled?: boolean,
  minRows?: number, maxRows?: number, labels?: Labels, placeholder?: string, ariaLabel?: string
}>(), { defaultValue: '', models: () => [], actions: () => [], minRows: 2, maxRows: 8 })
const emit = defineEmits<{
  'update:modelValue': [value: string], valueChange: [value: string], 'update:model': [value: string], modelChange: [value: string],
  submit: [value: string, model?: string], stop: [], action: [value: string], keydown: [event: KeyboardEvent]
}>()
defineSlots<{
  'leading-action'?(): unknown
  /** Replaces the icon of a model row and of the trigger. */
  'model-icon'?(props: { model: PromptModel }): unknown
  /** Replaces the icon of an action row. */
  'action-icon'?(props: { action: PromptAction }): unknown
}>()

const reduce = useReducedMotion()
const t = computed(() => ({ ...promptInputMessages, ...props.labels }))
const { value, set } = useValue(() => props.modelValue ?? props.value, props.defaultValue, next => { emit('update:modelValue', next); emit('valueChange', next) })
const selected = useValue(() => props.model, props.defaultModel ?? props.models[0]?.value, next => { emit('update:model', next); emit('modelChange', next) })
const currentModelValue = selected.value
const currentModel = computed(() => props.models.find(option => option.value === currentModelValue.value))

const textarea = shallowRef<HTMLTextAreaElement | null>(null)
const mirror = shallowRef<HTMLElement | null>(null)
const addButton = shallowRef<{ $el: HTMLElement } | HTMLElement | null>(null)
const actionsOpen = shallowRef(false)
const modelOpen = shallowRef(false)
const uid = useId()
const canSend = computed(() => Boolean(value.value.trim()) && !props.disabled && !props.loading)

const anchorOf = (node: { $el: HTMLElement } | HTMLElement | null) => (node && '$el' in node ? node.$el : node) as HTMLElement | null
let observer: ResizeObserver | undefined

function size() {
  const field = textarea.value
  const measure = mirror.value
  if (!field || !measure || field.value !== value.value) return
  const next = Math.min(Math.max(measure.scrollHeight, props.minRows * 24), props.maxRows * 24)
  const height = `${next}px`
  if (field.style.height !== height) field.style.height = height
}

function send() {
  const prompt = value.value.trim()
  if (!prompt || props.disabled || props.loading) return
  emit('submit', prompt, currentModelValue.value)
  if (props.modelValue === undefined && props.value === undefined) set('')
  textarea.value?.focus({ preventScroll: true })
}

function keydown(event: KeyboardEvent) {
  emit('keydown', event)
  if (event.defaultPrevented || event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) return
  event.preventDefault()
  send()
}

function closeActions(reason?: string) {
  actionsOpen.value = false
  if (reason === 'escape') anchorOf(addButton.value)?.focus()
}
function pickAction(action: PromptAction) {
  emit('action', action.value)
  actionsOpen.value = false
  anchorOf(addButton.value)?.focus()
}
function placedActions() {
  nextTick(() => document.getElementById(`${uid}-actions`)?.querySelector<HTMLElement>('button:not(:disabled)')?.focus({ preventScroll: true }))
}

// The model picker is the library's unfold Select, as upstream; only its open state is held here so a
// starting generation can close it.
function chooseModel(next: string) {
  selected.set(next)
}

watch([value, () => props.minRows, () => props.maxRows], size, { flush: 'post' })
watch(() => props.loading, loading => { if (loading) { actionsOpen.value = false; modelOpen.value = false } })
onMounted(() => {
  observer = new ResizeObserver(size)
  if (textarea.value) observer.observe(textarea.value)
  nextTick(size)
})
onBeforeUnmount(() => observer?.disconnect())

const isIconName = (icon?: string): icon is AgentIconName => Boolean(icon && icon in agentIcons)
</script>

<template>
  <form class="be-pi" :class="[$attrs.class, { 'be-pi-disabled': disabled }]" :style="($attrs.style as any)" @submit.prevent="send">
    <div ref="mirror" class="be-pi-measure" aria-hidden="true">{{ value }}&#8203;</div>
    <textarea
      ref="textarea"
      v-bind="{ ...$attrs, class: undefined, style: undefined }"
      class="be-pi-field"
      :aria-label="ariaLabel ?? t.label"
      :placeholder="placeholder ?? t.placeholder"
      :value="value"
      :disabled="disabled"
      :rows="minRows"
      @input="set(($event.target as HTMLTextAreaElement).value)"
      @keydown="keydown"
    />

    <div class="be-pi-bar">
      <template v-if="actions.length">
        <ButtonBase
          :ref="(node: any) => { addButton = node }"
          variant="ghost"
          size="icon"
          class="be-pi-round"
          :disabled="disabled || loading"
          :aria-label="t.addToPrompt"
          aria-haspopup="dialog"
          :aria-expanded="actionsOpen"
          :aria-controls="actionsOpen ? `${uid}-actions` : undefined"
          @click="actionsOpen = !actionsOpen"
        >
          <motion.span aria-hidden="true" class="be-pi-icon" :animate="{ rotate: actionsOpen ? 45 : 0 }" :transition="reduce ? { duration: 0 } : swapSpring">
            <AgentIcon name="Plus" :size="16" />
          </motion.span>
        </ButtonBase>
        <FloatingPanel
          :id="`${uid}-actions`"
          role="dialog"
          :aria-label="t.addToPrompt"
          :open="actionsOpen"
          :anchor="anchorOf(addButton)"
          side="top"
          align="start"
          :gap="8"
          variant="morph"
          class="be-pi-popover"
          @placed="placedActions"
          @dismiss="closeActions"
        >
          <button v-for="action in actions" :key="action.value" type="button" class="be-pi-action" :disabled="action.disabled" @click="pickAction(action)">
            <span v-if="action.icon || $slots['action-icon']" class="be-pi-action-icon">
              <slot name="action-icon" :action="action"><AgentIcon v-if="isIconName(action.icon)" :name="action.icon" :size="16" /><img v-else :src="action.icon" alt="" width="16" height="16"></slot>
            </span>
            <span class="be-pi-action-text">
              <span class="be-pi-action-label">{{ action.label }}</span>
              <span v-if="action.description" class="be-pi-action-description">{{ action.description }}</span>
            </span>
          </button>
        </FloatingPanel>
      </template>

      <slot name="leading-action" />

      <Select
        v-if="models.length"
        v-model:open="modelOpen"
        class="be-pi-select"
        :model-value="currentModelValue"
        :disabled="disabled || loading"
        :label="t.chooseModel"
        @update:model-value="chooseModel"
      >
        <SelectTrigger class="be-pi-select-trigger">
          <span class="be-pi-select-value">
            <span v-if="currentModel && (currentModel.icon || $slots['model-icon'])" class="be-pi-model-icon">
              <slot name="model-icon" :model="currentModel"><AgentIcon v-if="isIconName(currentModel.icon)" :name="currentModel.icon" :size="14" /><img v-else :src="currentModel.icon" alt="" width="16" height="16" referrerpolicy="no-referrer"></slot>
            </span>
            <span class="be-pi-select-label">{{ currentModel?.label ?? t.chooseModel }}</span>
          </span>
        </SelectTrigger>
        <SelectContent class="be-pi-listbox">
          <SelectItem v-for="option in models" :key="option.value" :value="option.value" :disabled="option.disabled" :label="option.label" class="be-pi-option">
            <span class="be-pi-option-main">
              <span v-if="option.icon || $slots['model-icon']" class="be-pi-option-icon">
                <slot name="model-icon" :model="option"><AgentIcon v-if="isIconName(option.icon)" :name="option.icon" :size="16" /><img v-else :src="option.icon" alt="" width="16" height="16" referrerpolicy="no-referrer"></slot>
              </span>
              <span class="be-pi-option-label">{{ option.label }}</span>
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <ButtonBase
        :type="loading ? 'button' : 'submit'"
        size="icon"
        class="be-pi-round be-pi-send"
        :disabled="loading ? false : !canSend"
        :aria-label="loading ? t.stop : t.send"
        @click="loading ? emit('stop') : undefined"
      >
        <AnimatePresence :initial="false" mode="popLayout">
          <motion.span
            :key="loading ? 'stop' : 'send'"
            class="be-pi-icon"
            :initial="reduce ? { opacity: 1 } : { opacity: 0, y: 3, scale: .8 }"
            :animate="{ opacity: 1, y: 0, scale: 1 }"
            :exit="reduce ? { opacity: 0 } : { opacity: 0, y: -3, scale: .8 }"
            :transition="reduce ? { duration: 0 } : swapSpring"
          >
            <svg v-if="loading" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" /></svg>
            <AgentIcon v-else name="ArrowUp" :size="16" />
          </motion.span>
        </AnimatePresence>
      </ButtonBase>
    </div>
  </form>
</template>

<style>
.be-pi {
  position: relative; box-sizing: border-box; width: 100%; padding: .5rem;
  border: 1px solid color-mix(in srgb, var(--beui-border) 80%, transparent); border-radius: 1rem;
  background: var(--beui-background); color: var(--beui-foreground);
  font-size: .875rem; line-height: 1.5rem; transition: border-color .15s;
}
.be-pi:focus-within { border-color: color-mix(in srgb, var(--beui-foreground) 25%, transparent); }
.be-pi-disabled { opacity: .6; }
.be-pi-measure, .be-pi-field {
  box-sizing: border-box; font: inherit; font-size: .875rem; line-height: 1.5rem; overflow-wrap: break-word;
}
.be-pi-measure {
  position: absolute; inset-inline: .5rem; top: 0; padding-inline: .5rem;
  visibility: hidden; pointer-events: none; white-space: pre-wrap;
}
.be-pi-field {
  display: block; width: 100%; resize: none; overflow-y: auto; margin: 0; border: 0; outline: none;
  padding: .375rem .5rem 0; background: transparent; color: var(--beui-foreground);
  scrollbar-width: none; -ms-overflow-style: none;
}
.be-pi-field::-webkit-scrollbar { display: none; }
.be-pi .be-pi-field:focus, .be-pi .be-pi-field:focus-visible { outline: none; box-shadow: none; }
.be-pi-field::placeholder { color: color-mix(in srgb, var(--beui-muted-foreground) 55%, transparent); }
.be-pi-bar { display: flex; align-items: center; gap: .25rem; min-height: 2rem; margin-top: .25rem; }
.be-pi-round.be-button[data-size=icon] { width: 2rem; height: 2rem; border-radius: 999px; }
.be-pi-round.be-button[data-variant=ghost]:hover { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); color: var(--beui-foreground); }
.be-pi-send { margin-inline-start: auto; }
.be-pi-icon { display: grid; place-items: center; }

.be-pi-select { position: relative; min-width: 0; }
/* Upstream: SelectTrigger h-8 w-auto max-w-52 rounded-xl border-0 bg-transparent px-2 py-0 text-xs hover:bg-muted. */
.be-pi .be-pi-select .be-pi-select-trigger {
  width: auto; max-width: 13rem; height: 2rem; padding: 0 .5rem; border: 0; background: transparent;
  font-size: .75rem; line-height: 1rem;
}
.be-pi .be-pi-select .be-pi-select-trigger:hover { background: var(--beui-muted); }
.be-pi .be-pi-select .be-pi-select-trigger:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-pi-select-value { display: flex; min-width: 0; align-items: center; gap: .375rem; }
.be-pi-model-icon { display: grid; flex: none; place-items: center; width: 1rem; height: 1rem; color: var(--beui-muted-foreground); }
.be-pi-model-icon img { width: 1rem; height: 1rem; border-radius: .25rem; object-fit: contain; }
.be-pi-select-label { overflow: hidden; color: var(--beui-muted-foreground); text-overflow: ellipsis; white-space: nowrap; }

div.be-pi-popover.floating {
  padding: .375rem; border-color: var(--beui-border); border-radius: .75rem; background: var(--beui-background);
}
div.be-pi-popover.floating { width: 14rem; box-shadow: 0 12px 32px -12px rgb(0 0 0 / .32); }
/* Upstream: SelectContent right-auto w-52 shadow-none; SelectItem py-2. */
.be-pi .be-pi-select .be-pi-listbox { right: auto; width: 13rem; box-shadow: none; }
.be-pi-action {
  display: flex; align-items: flex-start; gap: .625rem; width: 100%; box-sizing: border-box; padding: .5rem .625rem;
  border: 0; border-radius: .5rem; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer;
  outline: none; transition: background-color .15s;
}
.be-pi-action:is(:hover, :focus-visible) { background: var(--beui-muted); }
.be-pi-action:disabled { pointer-events: none; opacity: .5; }
.be-pi-action-icon { display: grid; flex: none; place-items: center; width: 1.25rem; height: 1.25rem; margin-top: .125rem; color: var(--beui-muted-foreground); }
.be-pi-action-text { min-width: 0; }
.be-pi-action-label { display: block; color: var(--beui-foreground); font-size: .875rem; line-height: 1.25rem; }
.be-pi-action-description { display: block; margin-top: .125rem; color: var(--beui-muted-foreground); font-size: .75rem; line-height: 1rem; }
.be-pi .be-pi-select .be-pi-option { padding-block: .5rem; }
.be-pi-option-main { display: flex; min-width: 0; align-items: center; gap: .5rem; }
.be-pi-option-icon { display: grid; flex: none; place-items: center; width: 1.25rem; height: 1.25rem; color: var(--beui-muted-foreground); }
.be-pi-option-icon img { width: 1rem; height: 1rem; border-radius: .25rem; object-fit: contain; }
.be-pi-option-label { min-width: 0; overflow: hidden; color: var(--beui-foreground); text-overflow: ellipsis; white-space: nowrap; }
</style>
