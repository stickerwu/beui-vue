import { defineComponent, h, inject, type PropType } from 'vue'
import { sideKey } from './shared'

/**
 * The non-animated parts of the message surface: group rows, content column,
 * header/footer chrome and the typing indicator. `MessageBubbleContent` lives in
 * its own SFC because it owns the animated bubble surface.
 */

function part(name: string, slot: string) {
  return defineComponent({
    name,
    props: { className: String },
    setup(props, { slots, attrs }) {
      return () => h('div', { ...attrs, class: [`be-${slot}`, props.className], 'data-slot': slot }, slots.default?.())
    },
  })
}

function sided(name: string, slot: string) {
  return defineComponent({
    name,
    props: { className: String },
    setup(props, { slots, attrs }) {
      const side = inject(sideKey, undefined)
      return () => h('div', {
        ...attrs,
        class: [`be-${slot}`, props.className],
        'data-slot': slot,
        'data-align': side?.value ?? 'start',
      }, slots.default?.())
    },
  })
}

function group(name: string, slot: string) {
  return defineComponent({
    name,
    props: {
      spacing: { type: String as PropType<'compact' | 'default'>, default: 'compact' },
      className: String,
    },
    setup(props, { slots, attrs }) {
      return () => h('div', {
        ...attrs,
        class: [`be-${slot}`, props.className],
        'data-slot': slot,
        'data-spacing': props.spacing,
      }, slots.default?.())
    },
  })
}

export const MessageGroup = group('MessageGroup', 'message-group')
export const MessageBubbleGroup = group('MessageBubbleGroup', 'message-bubble-group')
export const MessageContent = sided('MessageContent', 'message-content')
export const MessageHeader = sided('MessageHeader', 'message-header')
export const MessageFooter = sided('MessageFooter', 'message-footer')
export const MessageMarker = part('MessageMarker', 'message-marker')

export const MessageAvatar = defineComponent({
  name: 'MessageAvatar',
  props: { placeholder: Boolean, className: String },
  setup(props, { slots, attrs }) {
    return () => h('div', {
      ...attrs,
      class: ['be-message-avatar', props.className],
      'data-slot': 'message-avatar',
      'aria-hidden': props.placeholder || undefined,
    }, slots.default?.())
  },
})

export const MessageTyping = defineComponent({
  name: 'MessageTyping',
  props: { label: String, className: String },
  setup(props, { attrs }) {
    return () => h('span', { ...attrs, class: ['be-message-typing', props.className], 'data-slot': 'message-typing' }, [
      h('span', { class: 'be-sr-only' }, props.label ?? 'Responding'),
      // Three dots on a staggered loop; the CSS media query stills them.
      ...[0, 1, 2].map(index => h('span', {
        key: index,
        'aria-hidden': 'true',
        style: { animationDelay: `${index * .14}s` },
      })),
    ])
  },
})
