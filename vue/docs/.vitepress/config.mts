import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'beui-vue',
  description: '面向 Vue 3 的 beUI 动效组件',
  base: '/beui-vue/',
  cleanUrls: true,
  themeConfig: {
    nav: [{text:'安装', link:'/install'}, {text:'组件目录', link:'/catalog'}, {text:'效果验收', link:'/verification'}],
    socialLinks: [{icon:'github', link:'https://github.com/stickerwu/beui-vue'}],
    outlineTitle: '本页内容',
    docFooter: {prev:'上一页', next:'下一页'},
    footer: {message:'基于 beUI 的独立 Vue 移植，依 MIT 许可证分发。'},
  },
})
