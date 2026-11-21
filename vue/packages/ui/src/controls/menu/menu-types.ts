import type { Component } from 'vue'
import type { MenuItem } from '../types'

/** A `MenuItem` that can also carry an icon and an explicit typeahead text. */
export interface MenuItemSpec extends Omit<MenuItem, 'children'> {
  icon?: Component
  textValue?: string
  children?: readonly MenuItemSpec[]
}
