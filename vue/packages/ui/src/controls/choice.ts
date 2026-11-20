import { defineComponent, h, type PropType } from 'vue'
import ChoiceList from './ChoiceList.vue'
import type { ChoiceOption } from './types'

interface ChoiceConfig { name: string; searchable?: boolean; morph?: boolean; multiple?: boolean }

function choiceComponent(config: ChoiceConfig) {
  return defineComponent({
    name: config.name,
    inheritAttrs: false,
    props: {
      options: { type: Array as PropType<readonly ChoiceOption[]>, required: true },
      modelValue: [String, Array] as PropType<string | string[]>,
      label: String,
      placeholder: String,
      empty: String,
      disabled: Boolean,
      name: String,
    },
    emits: ['update:modelValue'],
    setup(props, { attrs, slots, emit }) {
      return () => h(ChoiceList, {
        ...attrs, ...props, ...config, name: props.name,
        'onUpdate:modelValue': (value: string | string[] | undefined) => emit('update:modelValue', value),
      }, slots)
    },
  })
}

export const Select = choiceComponent({ name: 'Select' })
export const SelectMorph = choiceComponent({ name: 'SelectMorph', morph: true })
export const Combobox = choiceComponent({ name: 'Combobox', searchable: true })
export const MultiSelect = choiceComponent({ name: 'MultiSelect', searchable: true, multiple: true })
