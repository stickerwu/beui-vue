import { defineComponent, h, type Component, type PropType } from 'vue'

function part(name: string, slot: string) {
  return defineComponent({ name, setup(_, { slots }) { return () => h('div', { class: `be-${slot}`, 'data-slot': slot }, slots.default?.()) } })
}
function group(name: string, slot: string) {
  return defineComponent({ name, props: { spacing: { type: String as PropType<'compact' | 'default'>, default: 'compact' } },
    setup(props, { slots }) { return () => h('div', { class: `be-${slot}`, 'data-slot': slot, 'data-spacing': props.spacing }, slots.default?.()) } })
}
export const MessageGroup = group('MessageGroup', 'message-group')
export const MessageBubbleGroup = group('MessageBubbleGroup', 'message-bubble-group')
export const MessageContent = part('MessageContent', 'message-content')
export const MessageHeader = part('MessageHeader', 'message-header')
export const MessageFooter = part('MessageFooter', 'message-footer')
export const MessageMarker = part('MessageMarker', 'message-marker')
export const MessageAvatar = defineComponent({ name: 'MessageAvatar', props: { placeholder: Boolean },
  setup(props, { slots }) { return () => h('div', { class: 'be-message-avatar', 'data-slot': 'message-avatar', 'aria-hidden': props.placeholder || undefined }, slots.default?.()) } })
export const MessageTyping = defineComponent({ name: 'MessageTyping', props: { label: { type: String, default: 'Responding' } },
  setup(props) { return () => h('span', { class: 'be-message-typing', role: 'status', 'aria-label': props.label }, Array.from({ length: 3 }, () => h('i', { 'aria-hidden': true }))) } })
export const MessageBubbleContent = defineComponent({ name: 'MessageBubbleContent', props: { render: { type: [String, Object, Function] as PropType<string | Component>, default: 'div' } },
  setup(props, { slots }) { return () => h(props.render, { class: 'be-bubble-content', 'data-slot': 'message-bubble-content' }, typeof props.render === 'string' ? slots.default?.() : slots) } })
