import { AnimatePresence } from 'motion-v'
import { defineComponent, h, inject, type InjectionKey, type Ref } from 'vue'
import IslandSlot from './IslandSlot.vue'

export const viewKey: InjectionKey<Readonly<Ref<string | null>>> = Symbol('DynamicIsland')

/** Content shown inside `DynamicIsland` while the parent `view` equals `id`. */
export const DynamicIslandView = defineComponent({
  name: 'DynamicIslandView',
  props: { id: { type: String, required: true }, className: String },
  setup(props, { slots, attrs }) {
    const active = inject(viewKey)
    if (!active) throw new Error('DynamicIslandView must be used inside <DynamicIsland>')
    return () => h(
      AnimatePresence,
      { mode: 'popLayout', initial: false },
      () => active.value === props.id
        ? h(IslandSlot, { key: props.id, class: ['be-island-view', props.className, attrs.class], 'data-island-view': props.id }, () => slots.default?.())
        : null,
    )
  },
})
