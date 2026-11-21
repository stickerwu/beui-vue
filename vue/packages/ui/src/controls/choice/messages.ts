/** English defaults. Override per instance with `labels`. */
export const selectMessages = { valuePlaceholder: 'Select', listLabel: 'Options' }
export type SelectMessages = typeof selectMessages

export const comboboxMessages = {
  valuePlaceholder: 'Select an option',
  inputLabel: 'Search options',
  inputPlaceholder: 'Search…',
  listLabel: 'Options',
  empty: 'No options found.',
}
export type ComboboxMessages = typeof comboboxMessages

export const multiSelectMessages = {
  valuePlaceholder: 'Select options',
  removeValue: 'Remove {label}',
  inputLabel: 'Search options',
  inputPlaceholder: 'Search…',
  listLabel: 'Options',
  empty: 'No options found.',
}
export type MultiSelectMessages = typeof multiSelectMessages
