<script setup lang="ts">
import { computed } from 'vue'
import type { ChoiceOption } from '../types'
import { useComboContext } from './combo-context'
import type { ComboOptionsProps } from './combo-types'
import ComboContent from './ComboContent.vue'
import ComboEmpty from './ComboEmpty.vue'
import ComboGroup from './ComboGroup.vue'
import ComboItem from './ComboItem.vue'
import ComboLabel from './ComboLabel.vue'
import ComboList from './ComboList.vue'
import ComboSeparator from './ComboSeparator.vue'
import ComboboxInput from './ComboboxInput.vue'
import ComboboxTrigger from './ComboboxTrigger.vue'
import MultiSelectInput from './MultiSelectInput.vue'
import MultiSelectTrigger from './MultiSelectTrigger.vue'
import MultiSelectValue from './MultiSelectValue.vue'

// The `options` shorthand of Combobox and MultiSelect: lays out the same parts a consumer would compose.
const props = defineProps<ComboOptionsProps & { multiple: boolean }>()
defineSlots<{
  option?(props: { option: ChoiceOption; selected: boolean; active: boolean }): unknown
  chip?(props: { option: ChoiceOption | undefined; value: string; label: string }): unknown
}>()
const context = useComboContext('Combobox')
const byValue = computed(() => new Map((props.options ?? []).map(option => [option.value, option])))
const keywordsOf = (option: ChoiceOption) => [...(option.keywords ?? []), ...(option.detail ? [option.detail] : []), ...(option.group ? [option.group] : [])]

// Consecutive options sharing a `group` render under one label.
const groups = computed(() => {
  const out: { key: string; label?: string; items: ChoiceOption[] }[] = []
  for (const option of props.options ?? []) {
    const last = out[out.length - 1]
    if (last && last.label === option.group) last.items.push(option)
    else out.push({ key: `${out.length}`, label: option.group, items: [option] })
  }
  return out
})
</script>

<template>
  <MultiSelectTrigger v-if="multiple" :style="triggerStyle">
    <MultiSelectValue :placeholder="placeholder">
      <template #default="{ value, label }"><slot name="chip" :option="byValue.get(value)" :value="value" :label="label">{{ label }}</slot></template>
    </MultiSelectValue>
    <MultiSelectInput :aria-label="label" :placeholder="placeholder" :show-icon="showIcon" />
  </MultiSelectTrigger>
  <ComboboxTrigger v-else :style="triggerStyle">
    <ComboboxInput :aria-label="label" :placeholder="placeholder" />
  </ComboboxTrigger>
  <ComboContent :side="side" :align="align" :side-offset="sideOffset" :avoid-collisions="avoidCollisions" :style="contentStyle">
    <ComboList :aria-label="listLabel" :style="listStyle">
      <template v-for="(group, groupIndex) in groups" :key="group.key">
        <ComboGroup v-if="group.label !== undefined">
          <ComboSeparator v-if="groupSeparator && groupIndex > 0" />
          <ComboLabel>{{ group.label }}</ComboLabel>
          <ComboItem v-for="option in group.items" :key="option.value" :value="option.value" :text-value="option.label" :keywords="keywordsOf(option)" :disabled="option.disabled">
            <template #default="{ selected, active }">
              <slot name="option" :option="option" :selected="selected" :active="active">
                <span class="be-combo-row">
                  <span v-if="option.color" class="be-combo-dot" :style="{ background: option.color }" />
                  <span class="be-combo-text">
                    <span class="be-combo-name">{{ option.label }}</span>
                    <span v-if="option.detail" class="be-combo-detail">{{ option.detail }}</span>
                  </span>
                </span>
              </slot>
            </template>
          </ComboItem>
        </ComboGroup>
        <template v-else>
          <ComboItem v-for="option in group.items" :key="option.value" :value="option.value" :text-value="option.label" :keywords="keywordsOf(option)" :disabled="option.disabled">
            <template #default="{ selected, active }">
              <slot name="option" :option="option" :selected="selected" :active="active">
                <span class="be-combo-row">
                  <span v-if="option.color" class="be-combo-dot" :style="{ background: option.color }" />
                  <span class="be-combo-text">
                    <span class="be-combo-name">{{ option.label }}</span>
                    <span v-if="option.detail" class="be-combo-detail">{{ option.detail }}</span>
                  </span>
                </span>
              </slot>
            </template>
          </ComboItem>
        </template>
      </template>
      <ComboEmpty>{{ empty ?? context.t('empty') }}</ComboEmpty>
    </ComboList>
  </ComboContent>
</template>
