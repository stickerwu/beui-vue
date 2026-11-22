// Builds the docs API tables: beui.dev's react-docgen output (upstream-props.json, via
// scripts/upstream-props.ts) merged with what each Vue component actually exposes.
// Rows follow upstream order and wording; React-only shapes map to their Vue form
// (`children` → `#default`, `onX` → `@x`, `value` + `onValueChange` → `v-model`).
import { readFileSync } from 'node:fs'
import { vueApi } from './vue-api.mjs'

const upstream = JSON.parse(readFileSync(new URL('../upstream-props.json', import.meta.url), 'utf8'))
const kebab = name => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
const lowerFirst = name => name.charAt(0).toLowerCase() + name.slice(1)
const MODEL_VALUE_PROPS = ['value', 'checked', 'pressed', 'selected', 'values', 'selectedIds']
const cache = new Map()

function vueApiCached(file) {
  if (!cache.has(file)) {
    const api = vueApi(file)
    const source = readFileSync(file, 'utf8')
    api.hasDefaultSlot = api.slots.some(slot => slot.name === 'default') || /<slot(?![^>]*\bname=)[\s/>]/.test(source)
    cache.set(file, api)
  }
  return cache.get(file)
}

function rowsFor(doc, vue, gaps) {
  const rows = []
  const usedProps = new Set()
  const usedEvents = new Set()
  const usedModels = new Set()
  const usedSlots = new Set()
  const modelRow = (model, description) => {
    usedModels.add(model.name)
    usedEvents.add(`update:${model.name}`)
    return { name: model.name === 'modelValue' ? 'v-model' : `v-model:${model.name}`, type: model.type, required: model.required, defaultValue: model.defaultValue, description: model.description || description }
  }
  const propRow = (prop, description) => {
    usedProps.add(prop.name)
    // A prop with an update:prop event is a v-model binding.
    const bound = vue.events.some(event => event.name === `update:${prop.name}`)
    if (bound) usedEvents.add(`update:${prop.name}`)
    const name = bound ? (prop.name === 'modelValue' ? 'v-model' : `v-model:${prop.name}`) : prop.name
    return { name, type: prop.type, required: prop.required, defaultValue: prop.defaultValue, description: prop.description || description }
  }
  const findModel = name => vue.models.find(model => model.name === name)
  const findProp = name => vue.props.find(prop => prop.name === name)
  for (const up of doc.props) {
    const { name, description } = up
    if (name === 'children') {
      if (vue.hasDefaultSlot) {
        usedSlots.add('default')
        const slot = vue.slots.find(item => item.name === 'default')
        rows.push({ name: '#default', type: slot?.type || 'slot', required: false, defaultValue: null, description: slot?.description || description })
      } else gaps.push(name)
      continue
    }
    const prop = findProp(name)
    if (prop && !usedProps.has(name)) { rows.push(propRow(prop, description)); continue }
    const model = findModel(name)
    if (model && !usedModels.has(name)) { rows.push(modelRow(model, description)); continue }
    if (MODEL_VALUE_PROPS.includes(name)) {
      const valueModel = findModel('modelValue')
      if (valueModel && !usedModels.has('modelValue')) { rows.push(modelRow(valueModel, description)); continue }
      const valueProp = findProp('modelValue')
      if (valueProp && !usedProps.has('modelValue')) { rows.push(propRow(valueProp, description)); continue }
    }
    const callback = name.match(/^on([A-Z]\w*)$/)
    if (callback) {
      const base = lowerFirst(callback[1])
      const target = base.replace(/Change$/, '')
      const candidates = [base, kebab(base), `update:${target}`]
      if (/Change$/.test(base) && MODEL_VALUE_PROPS.includes(target) || ['onChange', 'onValueChange', 'onCheckedChange', 'onPressedChange', 'onSelectedChange', 'onValuesChange'].includes(name)) candidates.push('update:modelValue')
      const event = vue.events.find(item => candidates.includes(item.name))
      if (event) {
        if (event.name.startsWith('update:') && (usedProps.has(event.name.slice(7)) || usedModels.has(event.name.slice(7)) || usedEvents.has(event.name))) {
          usedEvents.add(event.name)
          continue
        }
        usedEvents.add(event.name)
        rows.push({ name: `@${kebab(event.name)}`, type: event.payload, required: false, defaultValue: null, description: event.description || description })
        continue
      }
      // Folded into a v-model binding that already has a row.
      if (candidates.some(candidate => candidate.startsWith('update:') && usedEvents.has(candidate))) continue
      const modelName = candidates.find(candidate => candidate.startsWith('update:') && findModel(candidate.slice(7)))
      if (modelName) continue
    }
    if (name === 'className' && !prop) {
      rows.push({ name: 'class', type: 'string', required: false, defaultValue: null, description })
      continue
    }
    // aria-*/data-* pass through as fallthrough attributes in Vue.
    if (name.includes('-')) {
      rows.push({ name, type: up.type, required: up.required, defaultValue: up.defaultValue, description })
      continue
    }
    // Built into every Vue component: template refs, and `style` / native DOM listeners
    // that fall through to the root element.
    if (name === 'ref') continue
    if (name === 'style') {
      rows.push({ name, type: 'StyleValue', required: false, defaultValue: null, description })
      continue
    }
    const domEvent = name.match(/^on(Click|DoubleClick|KeyDown|KeyUp|PointerDown|PointerUp|PointerEnter|PointerLeave|MouseEnter|MouseLeave|Focus|Blur|Input|Submit)$/)
    if (domEvent) {
      rows.push({ name: `@${kebab(lowerFirst(domEvent[1])).replace('double-click', 'dblclick')}`, type: up.type, required: false, defaultValue: null, description })
      continue
    }
    // `xClassName` is `xClass` in Vue, like `className` → `class`.
    const classAlias = name.match(/^(\w+)ClassName$/) && findProp(name.replace(/ClassName$/, 'Class'))
    if (classAlias && !usedProps.has(classAlias.name)) { rows.push(propRow(classAlias, description)); continue }
    const slot = vue.slots.find(item => item.name === name || item.name === kebab(name))
    if (slot) {
      usedSlots.add(slot.name)
      rows.push({ name: `#${slot.name}`, type: slot.type || 'slot', required: false, defaultValue: null, description: slot.description || description })
      continue
    }
    gaps.push(name)
  }
  // Vue-only API, in declaration order.
  for (const prop of vue.props) if (!usedProps.has(prop.name)) rows.push(propRow(prop, ''))
  for (const model of vue.models) if (!usedModels.has(model.name)) rows.push(modelRow(model, ''))
  for (const event of vue.events) if (!usedEvents.has(event.name)) rows.push({ name: `@${kebab(event.name)}`, type: event.payload, required: false, defaultValue: null, description: event.description })
  for (const slot of vue.slots) if (!usedSlots.has(slot.name)) rows.push({ name: `#${slot.name}`, type: slot.type || 'slot', required: false, defaultValue: null, description: slot.description })
  // beui.dev prints string defaults bare (`md`, not `"md"`).
  for (const row of rows) if (row.defaultValue && /^"[^"]*"$/.test(row.defaultValue)) row.defaultValue = row.defaultValue.slice(1, -1)
  return rows
}

/**
 * API docs for one upstream source file. `vueFile(displayName)` returns the Vue SFC
 * for an exported component name; `fallback` is used when upstream documents a
 * single component whose Vue export has another name.
 */
export function apiDocs(upstreamFile, vueFile, fallback) {
  // react-docgen also documents hooks such as `useThemeToggle`; in Vue those are composables
  // with no props table, so only components (capitalised names) get a table.
  const docs = (upstream[upstreamFile] ?? []).filter(doc => doc.props.length && /^[A-Z]/.test(doc.displayName))
  const gaps = []
  const out = []
  // The main Vue export can carry another name (upstream `Button` is `ButtonBase`):
  // the first upstream component without a namesake takes the entry's own component.
  const named = new Set(docs.map(doc => vueFile(doc.displayName)).filter(Boolean))
  let fallbackFree = Boolean(fallback) && !named.has(fallback)
  for (const doc of docs) {
    let file = vueFile(doc.displayName)
    if (!file && fallbackFree) { file = fallback; fallbackFree = false }
    if (!file) { gaps.push({ component: doc.displayName, missing: 'component' }); continue }
    const missing = []
    const rows = rowsFor(doc, vueApiCached(file), missing)
    if (missing.length) gaps.push({ component: doc.displayName, missing })
    if (rows.length) out.push({ displayName: doc.displayName, rows })
  }
  if (!docs.length && fallback) {
    const rows = rowsFor({ props: [] }, vueApiCached(fallback), [])
    if (rows.length) out.push({ displayName: '', rows })
  }
  return { docs: out, gaps }
}

export function upstreamFiles() {
  return Object.keys(upstream)
}
