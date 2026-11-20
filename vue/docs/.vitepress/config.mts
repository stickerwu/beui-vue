import { defineConfig, type HeadConfig } from 'vitepress'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { siteURL as site, componentRoutes } from '../../scripts/routes.mjs'

const base = '/'
const repository = 'https://github.com/stickerwu/beui-vue'
const description = 'beUI 动效组件与界面区块的 Vue 3 实现，提供 TypeScript 类型、在线示例和中文文档，支持 Vite 与 Nuxt SSR。'

export default defineConfig({
  lang: 'zh-CN',
  title: 'beui-vue',
  description,
  base,
  cleanUrls: true,
  sitemap: { hostname: site },
  async buildEnd({outDir}) {
    const {entries} = JSON.parse(await readFile(new URL('../../catalog.json', import.meta.url), 'utf8'))
    const {paths} = componentRoutes(entries)
    await mkdir(join(outDir, 'components'), {recursive: true})
    for (const [slug, path] of paths) {
      const target = `${base}${path.slice(1)}`
      await writeFile(join(outDir, 'components', `${slug}.html`), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${target}"><link rel="canonical" href="${new URL(path.slice(1), site)}"><title>beui-vue</title><a href="${target}">查看组件</a></html>`)
    }
    const index = [
      '# beui-vue', '',
      '> beUI 动效组件与界面区块的 Vue 3 实现，由 stickerwu 独立维护。', '',
      `- [安装与使用](${site}install)`,
      `- [组件目录](${site}catalog)`,
      `- [效果验收](${site}verification)`,
      `- [Vue 源码](${repository})`,
      '- [上游 beUI](https://github.com/starc007/ui-components)', '',
      '## 组件与区块', '',
      ...entries.map(entry => `- [${entry.title}](${site}${paths.get(entry.slug).slice(1)})`),
    ]
    await writeFile(join(outDir, 'llms.txt'), index.join('\n') + '\n')
  },
  head: [
    ['link', { rel: 'icon', type: 'image/png', sizes: '48x48', href: `${base}brand/favicon.png` }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: `${base}brand/apple-touch-icon.png` }],
    ['meta', { property: 'og:site_name', content: 'beui-vue' }],
    ['meta', { property: 'og:locale', content: 'zh_CN' }],
    ['meta', { property: 'og:image', content: `${site}brand/social.png` }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: 'beui-vue · beUI 动效组件的 Vue 3 实现' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],
  transformPageData(page) {
    if (page.isNotFound || page.relativePath === '404.md') return
    const path = page.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
    const url = new URL(path, site).href
    const home = path === ''
    const head: HeadConfig[] = [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:type', content: home ? 'website' : 'article' }],
      ['meta', { property: 'og:title', content: home ? page.title : `${page.title} | beui-vue` }],
      ['meta', { property: 'og:description', content: page.description || description }],
    ]
    if (home) {
      head.push(['script', { type: 'application/ld+json' }, JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareSourceCode',
        name: 'beui-vue',
        description: page.description,
        url: site,
        image: `${site}brand/beui-vue.png`,
        codeRepository: repository,
        programmingLanguage: 'TypeScript',
        runtimePlatform: 'Vue 3.5',
        license: `${repository}/blob/main/LICENSE`,
        isBasedOn: 'https://github.com/starc007/ui-components',
        maintainer: { '@type': 'Person', name: 'stickerwu', url: 'https://github.com/stickerwu' },
      })])
    }
    page.frontmatter.head = [...(page.frontmatter.head || []), ...head]
  },
  themeConfig: {
    logo: { src: '/brand/favicon.png', alt: '' },
    nav: [{text:'安装', link:'/install'}, {text:'组件目录', link:'/catalog'}, {text:'效果验收', link:'/verification'}],
    socialLinks: [{icon:'github', link:repository}],
    outlineTitle: '本页内容',
    docFooter: {prev:'上一页', next:'下一页'},
    footer: {message:'基于 beUI 的独立 Vue 移植，依 MIT 许可证分发。'},
  },
})
