// Reads the public API of a Vue SFC: props (type, required, default, JSDoc), v-model
// bindings, emits and slots. Used by catalog.mjs to build the docs API tables.
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import ts from 'typescript'

const squash = text => text.replace(/\s+/g, ' ').replace(/\s*;\s*}/g, ' }').replace(/;\s*/g, '; ').trim()
// beui.dev prints string literals with double quotes; match it.
const quotes = text => text.replace(/'([^'"\\]*)'/g, '"$1"')

function scripts(file) {
  const source = readFileSync(file, 'utf8')
  if (!file.endsWith('.vue')) return [source]
  return [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1])
}

function jsDoc(node) {
  const parts = ts.getJSDocCommentsAndTags(node).filter(ts.isJSDoc)
  const text = parts.map(doc => (typeof doc.comment === 'string' ? doc.comment : ts.getTextOfJSDocComment(doc.comment) ?? '')).join(' ')
  return text.replace(/\s+/g, ' ').trim()
}

/** Every interface/type alias visible from `file`, following relative type imports. */
function typeScope(file, seen = new Set()) {
  const types = new Map()
  if (seen.has(file) || !existsSync(file)) return types
  seen.add(file)
  for (const [index, code] of scripts(file).entries()) {
    const sf = ts.createSourceFile(`${file}.${index}.ts`, code, ts.ScriptTarget.Latest, true)
    for (const statement of sf.statements) {
      if (ts.isInterfaceDeclaration(statement)) types.set(statement.name.text, { node: statement, sf, file })
      else if (ts.isTypeAliasDeclaration(statement)) types.set(statement.name.text, { node: statement.type, sf, file })
      else if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text.startsWith('.')) {
        const bindings = statement.importClause?.namedBindings
        if (!bindings || !ts.isNamedImports(bindings)) continue
        const base = resolve(dirname(file), statement.moduleSpecifier.text)
        const target = [base, `${base}.ts`, `${base}/index.ts`].find(path => existsSync(path) && !path.endsWith('/'))
        if (!target || !/\.(ts|vue)$/.test(target)) continue
        const imported = typeScope(target, seen)
        for (const element of bindings.elements) {
          const name = (element.propertyName ?? element.name).text
          if (imported.has(name) && !types.has(element.name.text)) types.set(element.name.text, imported.get(name))
        }
      }
    }
  }
  return types
}

/** Property signatures of a type node, resolving references, intersections and `extends`. */
function members(node, sf, types, depth = 0) {
  if (!node || depth > 6) return []
  if (ts.isParenthesizedTypeNode(node)) return members(node.type, sf, types, depth + 1)
  if (ts.isTypeLiteralNode(node) || ts.isInterfaceDeclaration(node)) {
    const own = node.members.filter(ts.isPropertySignature).map(member => ({ member, sf }))
    const inherited = ts.isInterfaceDeclaration(node)
      ? (node.heritageClauses ?? []).flatMap(clause => clause.types.flatMap(type => members(ts.factory.createTypeReferenceNode(type.expression.getText(sf)), sf, types, depth + 1)))
      : []
    return [...inherited, ...own]
  }
  if (ts.isIntersectionTypeNode(node)) return node.types.flatMap(type => members(type, sf, types, depth + 1))
  if (ts.isTypeReferenceNode(node)) {
    const name = ts.isIdentifier(node.typeName) ? node.typeName.text : node.typeName.getText?.(sf)
    if (name === 'Partial' || name === 'Readonly') return members(node.typeArguments?.[0], sf, types, depth + 1)
    if (name === 'Omit' || name === 'Pick') {
      const keys = new Set([...(node.typeArguments?.[1]?.getText(sf) ?? '').matchAll(/['"](\w+)['"]/g)].map(match => match[1]))
      const all = members(node.typeArguments?.[0], sf, types, depth + 1)
      return all.filter(({ member }) => (name === 'Omit') !== keys.has(member.name.getText(member.getSourceFile())))
    }
    const found = types.get(name)
    if (found) return members(found.node, found.sf, types, depth + 1)
  }
  return []
}

function emitsFrom(typeNode, sf) {
  if (!typeNode || !ts.isTypeLiteralNode(typeNode)) return []
  const events = []
  for (const member of typeNode.members) {
    if (ts.isPropertySignature(member) && member.type && ts.isTupleTypeNode(member.type)) {
      const name = member.name.getText(sf).replace(/^['"]|['"]$/g, '')
      const params = member.type.elements.map((element, index) => ts.isNamedTupleMember(element)
        ? `${element.name.text}${element.questionToken ? '?' : ''}: ${squash(element.type.getText(sf))}`
        : `arg${index}: ${squash(element.getText(sf))}`)
      events.push({ name, payload: `(${params.join(', ')}) => void`, description: jsDoc(member) })
    } else if (ts.isCallSignatureDeclaration(member)) {
      const [first, ...rest] = member.parameters
      const name = first?.type?.getText(sf).replace(/^['"]|['"]$/g, '')
      if (name) events.push({ name, payload: `(${rest.map(param => squash(param.getText(sf))).join(', ')}) => void`, description: jsDoc(member) })
    }
  }
  return events
}

function initializerText(node, sf) {
  if (!node) return null
  // `() => [...]` / `() => ({...})` factories: show what they return.
  if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) return squash(node.body.getText(sf).replace(/^\((.*)\)$/s, '$1'))
  return squash(node.getText(sf))
}

export function vueApi(file) {
  const types = typeScope(file)
  const blocks = scripts(file)
  const props = []
  const events = []
  const slots = []
  const models = []
  for (const [index, code] of blocks.entries()) {
    const sf = ts.createSourceFile(`${file}.${index}.ts`, code, ts.ScriptTarget.Latest, true)
    const defaults = new Map()
    const visit = node => {
      if (ts.isCallExpression(node)) {
        const callee = node.expression.getText(sf)
        if (callee === 'withDefaults' && node.arguments[1] && ts.isObjectLiteralExpression(node.arguments[1])) {
          for (const property of node.arguments[1].properties) {
            if (ts.isPropertyAssignment(property)) defaults.set(property.name.getText(sf), initializerText(property.initializer, sf))
            else if (ts.isMethodDeclaration(property)) defaults.set(property.name.getText(sf), squash(property.getText(sf)))
          }
        }
        if (callee === 'defineProps') {
          const declared = node.typeArguments?.[0]
          for (const { member, sf: memberSf } of members(declared, sf, types)) {
            const name = member.name.getText(memberSf).replace(/^['"]|['"]$/g, '')
            if (props.some(prop => prop.name === name)) continue
            props.push({ name, type: quotes(squash(member.type?.getText(memberSf) ?? 'unknown')), required: !member.questionToken, defaultValue: null, description: jsDoc(member) })
          }
          // `const { a = 1 } = defineProps<...>()` (Vue 3.5 props destructure)
          const parent = node.parent
          if (parent && ts.isVariableDeclaration(parent) && ts.isObjectBindingPattern(parent.name)) {
            for (const element of parent.name.elements) {
              const name = (element.propertyName ?? element.name).getText(sf)
              if (element.initializer) defaults.set(name, initializerText(element.initializer, sf))
            }
          }
        }
        if (callee === 'defineEmits') events.push(...emitsFrom(node.typeArguments?.[0], sf))
        if (callee === 'defineSlots' && node.typeArguments?.[0] && ts.isTypeLiteralNode(node.typeArguments[0])) {
          for (const member of node.typeArguments[0].members) {
            if (!member.name) continue
            const name = member.name.getText(sf).replace(/^['"]|['"]$/g, '')
            const param = ts.isMethodSignature(member) ? member.parameters[0]?.type : undefined
            slots.push({ name, type: param ? quotes(squash(param.getText(sf))) : '', description: jsDoc(member) })
          }
        }
        if (callee === 'defineModel') {
          const [first, second] = node.arguments
          const name = first && ts.isStringLiteral(first) ? first.text : 'modelValue'
          const options = (ts.isObjectLiteralExpression(first ?? {}) ? first : second)
          let defaultValue = null
          let required = false
          if (options && ts.isObjectLiteralExpression(options)) {
            for (const property of options.properties) {
              if (!ts.isPropertyAssignment(property)) continue
              const key = property.name.getText(sf)
              if (key === 'default') defaultValue = initializerText(property.initializer, sf)
              if (key === 'required') required = property.initializer.kind === ts.SyntaxKind.TrueKeyword
            }
          }
          const statement = node.parent && ts.isVariableDeclaration(node.parent) ? node.parent.parent?.parent : undefined
          models.push({ name, type: quotes(squash(node.typeArguments?.[0]?.getText(sf) ?? 'unknown')), required, defaultValue: defaultValue && quotes(defaultValue), description: statement ? jsDoc(statement) : '' })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
    for (const prop of props) if (prop.defaultValue === null && defaults.has(prop.name)) prop.defaultValue = quotes(defaults.get(prop.name))
  }
  return { props, events, slots, models }
}
