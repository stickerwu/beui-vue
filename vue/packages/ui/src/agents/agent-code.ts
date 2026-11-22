/**
 * Lightweight stand-in for the upstream Shiki highlighter (github light/dark high-contrast).
 * Synchronous and dependency-free: it covers the languages the agent components ship
 * (typescript/tsx, bash, json) and falls back to plain text for the rest.
 */
export type AgentCodeLanguage = 'bash' | 'diff' | 'json' | 'text' | 'tsx' | 'typescript'
export type AgentCodeToken = { content: string, light: string, dark: string }

type Pair = readonly [light: string, dark: string]
const PLAIN: Pair = ['#0E1116', '#F0F3F6']
const KEYWORD: Pair = ['#A0111F', '#FF9492']
const STRING: Pair = ['#032563', '#ADDCFF']
const FUNCTION: Pair = ['#622CBC', '#DBB7FF']
const VARIABLE: Pair = ['#702C00', '#FFB757']
const CONSTANT: Pair = ['#023B95', '#91CBFF']
const COMMENT: Pair = ['#66707B', '#BDC4CC']
const PROPERTY: Pair = ['#024C1A', '#72F088']

const KEYWORDS = new Set('import export from as default const let var function return async await new type interface extends implements if else for while do class static public private protected readonly typeof instanceof in of throw try catch finally switch case break continue void yield enum declare namespace abstract satisfies keyof delete'.split(' '))
const CONSTANTS = new Set(['true', 'false', 'null', 'undefined', 'this', 'NaN', 'Infinity'])
const BUILTIN_TYPES = new Set('string number boolean any unknown never object bigint symbol'.split(' '))
const TOKEN = /(\s+)|(\/\/.*$|\/\*.*?\*\/)|("(?:\\.|[^"\\])*"?|'(?:\\.|[^'\\])*'?)|(`(?:\\.|[^`\\])*`?)|(\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?n?)|([A-Za-z_$][\w$]*)|(=>|===|!==|==|!=|<=|>=|&&|\|\||\?\?|\?\.|\.\.\.|[=+\-*/%<>!?&|^~]|\?:)|(.)/g

function push(out: AgentCodeToken[], content: string, pair: Pair) {
  if (!content) return
  const last = out[out.length - 1]
  if (last && last.light === pair[0]) last.content += content
  else out.push({ content, light: pair[0], dark: pair[1] })
}

function template(raw: string, out: AgentCodeToken[]) {
  // Text and `${` / `}` delimiters take the string colour; the expression inside stays code.
  let rest = raw
  while (rest) {
    const start = rest.indexOf('${')
    if (start < 0) { push(out, rest, STRING); return }
    push(out, rest.slice(0, start + 2), STRING)
    const end = rest.indexOf('}', start)
    const expression = end < 0 ? rest.slice(start + 2) : rest.slice(start + 2, end)
    typescriptLine(expression, out)
    if (end < 0) return
    push(out, '}', STRING)
    rest = rest.slice(end + 1)
  }
}

function typescriptLine(line: string, out: AgentCodeToken[]) {
  const parts = [...line.matchAll(TOKEN)]
  let previous = ''
  let destructuring = false
  for (let index = 0; index < parts.length; index++) {
    const [text, space, comment, quoted, tpl, number, word, operator] = parts[index]
    const after = line.slice((parts[index].index ?? 0) + text.length)
    if (space) { push(out, text, PLAIN); continue }
    if (comment) { push(out, text, COMMENT); previous = ''; continue }
    if (quoted) { push(out, text, STRING); previous = text; continue }
    if (tpl) { template(text, out); previous = text; continue }
    if (number) { push(out, text, CONSTANT); previous = text; continue }
    if (operator) { push(out, text, text === '?:' || text === '=>' || (text !== '?' && text !== '.' && text !== '?.' && text !== '...') ? KEYWORD : PLAIN); previous = text; continue }
    if (!word) {
      if (text === '{' && /^(const|let|var)$/.test(previous)) destructuring = true
      if (text === '}') destructuring = false
      // A type-annotation colon is a keyword in Shiki's themes; an object-literal colon stays plain.
      const annotation = text === ':' && /^[\w$]+$/.test(previous) && /^\s*(string|number|boolean|any|unknown|void|never|object|null|undefined|[A-Z]\w*|\w+\[\])/.test(after)
      push(out, text, annotation ? KEYWORD : PLAIN)
      if (text.trim()) previous = text
      continue
    }
    const nextChar = after.trimStart()[0]
    let pair: Pair = PLAIN
    if (KEYWORDS.has(text) && previous !== '.') pair = KEYWORD
    else if (CONSTANTS.has(text)) pair = CONSTANT
    else if (BUILTIN_TYPES.has(text)) pair = CONSTANT
    else if (previous === 'function' || /^\s*\(/.test(after) || /^\s*<[^>]*>\s*\(/.test(after)) pair = FUNCTION
    else if (/^(type|interface|class|enum)$/.test(previous)) pair = VARIABLE
    else if (previous === 'extends' || previous === 'implements') pair = CONSTANT
    else if (destructuring) pair = CONSTANT
    else if (/^(const|let|var)$/.test(previous)) pair = /^\s*=\s*(async\b|\([^)]*\)\s*(:[^=]+)?=>|function\b|[A-Za-z_$][\w$]*\s*=>)/.test(after) ? FUNCTION : CONSTANT
    else if (/^\??:\s*(string|number|boolean|any|unknown|void|never|object|null|undefined|[A-Z]\w*|\w+\[\])/.test(after.trimStart()) && nextChar !== undefined) pair = VARIABLE
    push(out, text, pair)
    previous = text
  }
}

function bashLine(line: string, out: AgentCodeToken[]) {
  let command = true
  for (const match of line.matchAll(/(\s+)|(#.*$)|(\S+)/g)) {
    const [text, space, comment, word] = match
    if (space) { push(out, text, PLAIN); continue }
    if (comment) { push(out, text, COMMENT); continue }
    if (/^(\|\||&&|\||;)$/.test(word)) { push(out, word, KEYWORD); command = true; continue }
    if (command) { push(out, word, VARIABLE); command = false; continue }
    push(out, word, /^\d+(?:\.\d+)?$/.test(word) || /^-{1,2}[\w-]/.test(word) ? CONSTANT : STRING)
  }
}

function jsonLine(line: string, out: AgentCodeToken[]) {
  for (const m of line.matchAll(/("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)|([\s\S])/g)) {
    if (m[1]) { push(out, m[1], m[2] ? PROPERTY : STRING); if (m[2]) push(out, m[2], PLAIN) }
    else if (m[3]) push(out, m[3], CONSTANT)
    else push(out, m[0], PLAIN)
  }
}

export function tokenizeLine(line: string, language: AgentCodeLanguage | string = 'typescript'): AgentCodeToken[] {
  const out: AgentCodeToken[] = []
  if (language === 'bash') bashLine(line, out)
  else if (language === 'json') jsonLine(line, out)
  else if (language === 'typescript' || language === 'tsx') typescriptLine(line, out)
  else push(out, line, PLAIN)
  return out
}

export function tokenizeCode(code: string, language: AgentCodeLanguage | string = 'typescript') {
  return code.split('\n').map(line => tokenizeLine(line, language))
}
