export interface ChoiceOption {
  value: string
  label: string
  disabled?: boolean
  group?: string
  detail?: string
  keywords?: readonly string[]
  color?: string
}
export interface MenuItem {
  value: string
  label: string
  disabled?: boolean
  type?: 'item' | 'checkbox' | 'radio' | 'label' | 'separator'
  checked?: boolean
  destructive?: boolean
  shortcut?: string
  children?: readonly MenuItem[]
  closeOnSelect?: boolean
}
