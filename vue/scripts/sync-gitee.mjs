import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const cwd = fileURLToPath(new URL('../../', import.meta.url))
const source = 'https://github.com/stickerwu/beui-vue.git'
const mirror = process.env.BEUI_GITEE_SSH === '1' ? 'git@gitee.com:stickerwu/beui-vue.git' : 'https://gitee.com/stickerwu/beui-vue.git'
const git = (...args) => execFileSync('git', args, {cwd, encoding:'utf8'})
function refs(remote) {
  return new Map(git('ls-remote', '--refs', remote, 'refs/heads/main', 'refs/tags/*').trim().split('\n').filter(Boolean).map(line => {
    const [sha, ref] = line.split(/\s+/)
    return [ref, sha]
  }))
}
const before = refs(source)
if (!before.has('refs/heads/main')) throw Error('GitHub main missing')
git('fetch', '--no-tags', source, ...before.keys())
git('push', '--atomic', mirror, ...Array.from(before, ([ref, sha]) => `${sha}:${ref}`))
const after = refs(mirror)
for (const [ref, sha] of before) {
  if (sha !== after.get(ref)) throw Error(`Mirror mismatch for ${ref}`)
  console.log(`${ref} ${sha}`)
}
