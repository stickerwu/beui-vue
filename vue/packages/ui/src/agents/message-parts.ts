/**
 * The non-animated parts of the message surface: group rows, content column,
 * header/footer chrome and the typing indicator. `MessageBubbleContent` lives in
 * its own SFC because it owns the animated bubble surface.
 */
export { default as MessageGroup } from './MessageGroup.vue'
export { default as MessageBubbleGroup } from './MessageBubbleGroup.vue'
export { default as MessageAvatar } from './MessageAvatar.vue'
export { default as MessageContent } from './MessageContent.vue'
export { default as MessageHeader } from './MessageHeader.vue'
export { default as MessageFooter } from './MessageFooter.vue'
export { default as MessageMarker } from './MessageMarker.vue'
export { default as MessageTyping } from './MessageTyping.vue'
