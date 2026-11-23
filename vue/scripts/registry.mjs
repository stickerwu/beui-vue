// Builds the shadcn-vue registry served at https://beui.stickerwu.net/r/<install-slug>.json.
//
//   npx shadcn-vue@latest add https://beui.stickerwu.net/r/<install-slug>.json
//
// Every install slug in catalog.json becomes one registry item. An item starts from the
// component's .vue file and bundles, with their content, every file the component reaches
// through relative imports (.vue, .ts, .css, side-effect `import './x.css'`, dynamic imports,
// <style src>, CSS @import). Compound components (Alert + AlertTitle, Message + MessageBubble,
// ...) are separate files in Vue and the root never imports its parts, so the item also starts
// from every export that beui.dev documents for the slug's upstream file (upstream-props.json),
// resolved through the library barrels. Bare imports become `dependencies` pinned to the
// versions in packages/ui/package.json (`vue` is a peer dependency and is never listed).
//
// Files keep the library's folder structure under `components/beui/`, so the relative imports
// inside them keep working wherever the user's `components` folder lives. Items are
// "universal" for the shadcn-vue CLI (type registry:item, every file registry:file with an
// explicit target), which makes them install with or without a components.json.
//
// Every item also ships the same four style files (theme.css, agents/agents.css,
// blocks/blocks.css and a styles.css that imports them). The library imports those from
// packages/ui/src/index.ts rather than from the components, so a copy-paste install would
// otherwise lose them. Identical content in every item means installing several items never
// conflicts: shadcn-vue skips a file whose content is unchanged.
//
// Output: docs/public/r/<slug>.json and docs/public/r/index.json (generated, gitignored,
// published by `pnpm docs:build`).
import { existsSync, readFileSync, statSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { parse as parseSfc } from 'vue/compiler-sfc'
import { readPorts } from './ports.mjs'
import { siteURL } from './routes.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const source = path.join(root, 'packages', 'ui', 'src')
const output = path.join(root, 'docs', 'public', 'r')
const catalogData = path.join(root, 'docs', '.vitepress', 'catalog-data.json')
/** Folder, relative to the user's project, that holds the installed library (shadcn-vue puts a leading `components` under `src/` when the project has one). */
const targetRoot = 'components/beui'
const itemSchema = 'https://shadcn-vue.com/schema/registry-item.json'
const registrySchema = 'https://shadcn-vue.com/schema/registry.json'
/** Shipped with every item; see the header comment. */
const sharedStyles = ['theme.css', 'agents/agents.css', 'blocks/blocks.css']
const stylesEntry = 'styles.css'
const stylesContent = `/* beui-vue shared styles. Import this file once in your app entry. */
${sharedStyles.map(file => `@import './${file}';`).join('\n')}
`

const slash = file => file.split(path.sep).join('/')
const relative = file => slash(path.relative(source, file))
const isFile = file => existsSync(file) && statSync(file).isFile()
/** Registry content must not depend on the checkout's line endings. */
const normalise = text => text.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n')

const {dependencies: libraryDependencies} = JSON.parse(await readFile(path.join(root, 'packages', 'ui', 'package.json'), 'utf8'))
const {entries} = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8'))
/** Upstream source file -> the components, hooks and helpers beui.dev documents for it. */
const upstreamProps = JSON.parse(await readFile(path.join(root, 'upstream-props.json'), 'utf8'))
const ports = await readPorts()

if (!existsSync(catalogData)) throw Error('docs/.vitepress/catalog-data.json is missing: run `node scripts/catalog.mjs --docs` first (pnpm docs:prepare does both)')
const pageEntries = new Map()
for (const page of JSON.parse(await readFile(catalogData, 'utf8')).pages) {
  for (const entry of page.entries) pageEntries.set(entry.slug, {...entry, pageTitle: page.title})
}

// --- Import analysis -------------------------------------------------------------------

function scriptSpecifiers(code, file) {
  const found = []
  const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const visit = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      found.push(node.moduleSpecifier.text)
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      found.push(node.moduleReference.expression.text)
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [argument] = node.arguments
      if (!argument || !ts.isStringLiteralLike(argument)) throw Error(`${relative(file)}: dynamic import() needs a string literal`)
      found.push(argument.text)
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      found.push(node.argument.literal.text)
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') {
      throw Error(`${relative(file)}: require() is not supported`)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return found
}

function cssSpecifiers(code, file) {
  const text = code.replace(/\/\*[\s\S]*?\*\//g, '')
  const found = [...text.matchAll(/@import\s+(?:url\(\s*)?(['"])([^'"]+)\1/g)].map(match => match[2])
  // Binary assets cannot travel as registry `content`; none exist today, so fail loudly if one appears.
  const asset = text.match(/url\(\s*(['"]?)(?![#]|data:|https?:|\/\/)([^'")\s]+)\1\s*\)/)
  if (asset) throw Error(`${relative(file)}: url(${asset[2]}) references a file the registry cannot bundle`)
  return found
}

function specifiersOf(file, content) {
  if (file.endsWith('.ts')) return scriptSpecifiers(content, file)
  if (file.endsWith('.css')) return cssSpecifiers(content, file).map(specifier => specifier.startsWith('.') ? specifier : `./${specifier}`)
  if (file.endsWith('.vue')) {
    const {descriptor, errors} = parseSfc(content, {filename: file})
    if (errors.length) throw Error(`${relative(file)}: ${errors[0].message ?? errors[0]}`)
    const found = []
    for (const block of [descriptor.script, descriptor.scriptSetup]) {
      if (!block) continue
      if (block.src) found.push(block.src)
      found.push(...scriptSpecifiers(block.content, file))
    }
    if (descriptor.template?.src) found.push(descriptor.template.src)
    for (const style of descriptor.styles) {
      if (style.src) found.push(style.src)
      found.push(...cssSpecifiers(style.content, file).map(specifier => specifier.startsWith('.') ? specifier : `./${specifier}`))
    }
    return found
  }
  throw Error(`${relative(file)}: unsupported file type`)
}

function resolveRelative(from, specifier) {
  const base = path.resolve(path.dirname(from), specifier)
  // Same order as Vite: the exact path, then .ts, then the directory index. `.vue` and `.css`
  // are never implicit in Vite, but accepting them keeps this resolver a superset of it.
  const hit = [base, `${base}.ts`, `${base}.vue`, `${base}.css`, path.join(base, 'index.ts'), path.join(base, 'index.vue')].find(isFile)
  if (!hit) throw Error(`${relative(from)}: cannot resolve '${specifier}'`)
  if (!hit.startsWith(source + path.sep)) throw Error(`${relative(from)}: '${specifier}' leaves packages/ui/src`)
  if (!/\.(ts|vue|css)$/.test(hit)) throw Error(`${relative(from)}: '${specifier}' is a ${path.extname(hit)} file, which the registry does not bundle`)
  return hit
}

function packageOf(specifier) {
  const parts = specifier.split('/')
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

/**
 * Public export name -> the file that provides it, following the barrels from src/index.ts
 * (`export { default as X } from './X.vue'`, `export { a, b } from './y'`, `export * from './dir'`).
 * A Vue component is exported under the name of its .vue file's default export.
 */
const exportCache = new Map()
function exportsOf(file) {
  if (exportCache.has(file)) return exportCache.get(file)
  const result = new Map()
  exportCache.set(file, result)
  if (!file.endsWith('.ts')) return result
  const sourceFile = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      const target = statement.moduleSpecifier ? resolveRelative(file, statement.moduleSpecifier.text) : file
      if (!statement.exportClause) {
        for (const [name, from] of exportsOf(target)) if (!result.has(name)) result.set(name, from)
      } else if (ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) result.set(element.name.text, target)
      } else result.set(statement.exportClause.name.text, target)
    } else if (statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name)) result.set(declaration.name.text, file)
      } else if (statement.name && ts.isIdentifier(statement.name)) result.set(statement.name.text, file)
    }
  }
  return result
}

const analysed = new Map()
async function analyse(file) {
  if (analysed.has(file)) return analysed.get(file)
  const content = normalise(await readFile(file, 'utf8'))
  const related = []
  const packages = []
  for (const specifier of specifiersOf(file, content)) {
    if (specifier.startsWith('.')) related.push(resolveRelative(file, specifier))
    else if (specifier === 'vue' || specifier.startsWith('vue/')) continue
    else if (specifier.startsWith('@/') || specifier.startsWith('~') || specifier.startsWith('/')) throw Error(`${relative(file)}: alias import '${specifier}' would break once copied`)
    else {
      const name = packageOf(specifier)
      if (!libraryDependencies[name]) throw Error(`${relative(file)}: '${name}' is not a dependency of beui-vue`)
      packages.push(name)
    }
  }
  const result = {content, related, packages}
  analysed.set(file, result)
  return result
}

/** Every file reachable from `starts`, in first-seen order, plus the packages they import. */
async function closure(starts) {
  const files = []
  const packages = new Set()
  const seen = new Set()
  const queue = [...starts]
  while (queue.length) {
    const file = queue.shift()
    if (seen.has(file)) continue
    seen.add(file)
    const {content, related, packages: bare} = await analyse(file)
    files.push({file, content})
    for (const name of bare) packages.add(name)
    queue.push(...related)
  }
  return {files, packages}
}

// --- Items -----------------------------------------------------------------------------

const targetOf = rel => {
  const target = `${targetRoot}/${rel}`
  // shadcn-vue strips the first "src/" from a target before it writes the file.
  if (target.includes('src/')) throw Error(`${target}: a path segment ending in "src" would be rewritten by shadcn-vue`)
  return target
}
const fileEntry = (rel, content) => ({path: targetOf(rel), content, type: 'registry:file', target: targetOf(rel)})

const styles = await closure(sharedStyles.map(file => path.join(source, file)))
const styleFiles = [
  ...styles.files.map(({file, content}) => fileEntry(relative(file), content)),
  fileEntry(stylesEntry, stylesContent),
].sort((a, b) => a.path.localeCompare(b.path))
if (styles.packages.size) throw Error('shared styles must not import packages')

const libraryExports = exportsOf(path.join(source, 'index.ts'))

// beui.dev ships one React file per component family (`alert.tsx` holds Alert, AlertTitle,
// AlertAction, ...), so installing a slug always installed every part documented for its source
// file. The Vue port splits a family into one file per part and the root never imports its
// siblings, so seed the bundle with every export upstream-props.json documents for the slug's
// upstream file. Names the Vue port does not export (React-only internals) are skipped.
// Following the families of everything reached would snowball (a Button in a game pulls in the
// whole actions family, then half the library), so this is one level only.
const familyMembers = upstreamFile => (upstreamProps[upstreamFile] ?? []).map(doc => libraryExports.get(doc.displayName)).filter(Boolean)
// The Vue ChatApp imports only the sidebar shell it renders itself, while the React root imports
// the whole animated-sidebar file and its usage fills the sidebar with the other parts.
const composes = {'chat-app': ['components/motion/animated-sidebar.tsx']}

const items = []
for (const entry of entries) {
  const port = ports[entry.slug]
  if (!port) throw Error(`${entry.slug}: no Vue port is registered, so there is nothing to install`)
  const component = libraryExports.get(port.name)
  if (!component?.endsWith('.vue')) throw Error(`${entry.slug}: no .vue file is exported as ${port.name}`)
  const page = pageEntries.get(entry.slug)
  if (!page) throw Error(`${entry.slug}: missing from docs/.vitepress/catalog-data.json`)
  if (!upstreamProps[entry.source]) throw Error(`${entry.slug}: upstream-props.json has no entry for ${entry.source}`)
  // Seeds: the component, its family, and the `extraFiles` upstream bundles with a page-level
  // install (chat-app lists the whole conversation suite there).
  const seeds = [component, ...[entry.source, ...page.extraFiles ?? [], ...composes[entry.slug] ?? []].flatMap(familyMembers)]

  const {files, packages} = await closure(seeds)
  const code = files.map(({file, content}) => fileEntry(relative(file), content))
  // The component first, then its dependencies alphabetically, then the shared styles.
  const [main, ...rest] = code
  rest.sort((a, b) => a.path.localeCompare(b.path))
  const itemFiles = [main, ...rest]
  for (const style of styleFiles) {
    const present = itemFiles.find(file => file.path === style.path)
    if (present) {
      if (present.content !== style.content) throw Error(`${entry.slug}: ${style.path} differs from the shared style`)
    } else itemFiles.push(style)
  }

  const entryImport = `@/${targetRoot}/${relative(component)}`
  items.push({
    $schema: itemSchema,
    name: entry.slug,
    type: 'registry:item',
    title: entry.title,
    description: page.description,
    categories: [entry.category],
    dependencies: [...packages].sort().map(name => `${name}@${libraryDependencies[name]}`),
    files: itemFiles,
    meta: {page: new URL(page.path.slice(1), siteURL).href},
    // Printed by the CLI after the install. The alias assumes the usual `@` -> `src`.
    docs: `Use it with: import ${port.name} from '${entryImport}'\nLoad the shared styles once in your app entry: import '@/${targetRoot}/${stylesEntry}'`,
  })
}

// Files that appear in several items must be byte-identical, or installing both would prompt.
const contents = new Map()
for (const item of items) {
  for (const file of item.files) {
    if (contents.has(file.path) && contents.get(file.path) !== file.content) throw Error(`${file.path} has different content in different items`)
    contents.set(file.path, file.content)
  }
}

await rm(output, {recursive: true, force: true})
await mkdir(output, {recursive: true})
for (const item of items) await writeFile(path.join(output, `${item.name}.json`), `${JSON.stringify(item, null, 2)}\n`)

// The index lists every item without file content, like the `registry.json` shadcn builds from.
const index = {
  $schema: registrySchema,
  name: 'beui-vue',
  homepage: siteURL,
  items: items.map(({$schema, files, docs, ...item}) => ({...item, files: files.map(({path, type, target}) => ({path, type, target}))})),
}
await writeFile(path.join(output, 'index.json'), `${JSON.stringify(index, null, 2)}\n`)

const bytes = items.reduce((total, item) => total + item.files.reduce((sum, file) => sum + file.content.length, 0), 0)
const largest = items.reduce((best, item) => item.files.length > best.files.length ? item : best)
console.log(`${items.length} registry items, ${contents.size} distinct files (${Math.round(bytes / 1024)} KiB of source across items); largest: ${largest.name} with ${largest.files.length} files -> docs/public/r/`)
