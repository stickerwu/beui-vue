import { defineComponent } from 'vue'

/**
 * Declarative parts. `FileTree` reads them from its default slot and turns them into one
 * flattened, keyboard-navigable collection, so they render nothing on their own.
 * A part may carry an `icon` slot; a folder's default slot holds its children.
 */
export const FileTreeFolder = defineComponent({
  name: 'FileTreeFolder',
  props: {
    value: { type: String, required: true },
    name: { type: String, required: true },
    disabled: { type: Boolean, default: false },
  },
  setup: () => () => null,
})

export const FileTreeFile = defineComponent({
  name: 'FileTreeFile',
  props: {
    value: { type: String, required: true },
    name: { type: String, required: true },
    disabled: { type: Boolean, default: false },
  },
  setup: () => () => null,
})
