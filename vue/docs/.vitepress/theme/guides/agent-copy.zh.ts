import type { AgentCopy } from './agent-copy.en'

/** Agent 指南的中文文案，结构与 agent-copy.en.ts 一致。反引号之间的文字渲染为行内代码。 */
export const agentCopyZh: AgentCopy = {
  header: {
    eyebrow: 'Agent 指南',
    title: '面向 AI Agent',
    intro: 'beui-vue 提供一套静态、对 agent 友好的接口。安装 beui-vue skill、连接下面的 MCP 服务，或者直接请求注册表端点。编程 agent（Claude、Codex、Cursor、Amp）可以列出组件、获取带全部依赖的源码，并把文件放进用户的 Vue 项目。',
  },
  agentSkill: {
    title: 'Agent skill',
    body: '这个 skill 让编程 agent 先读取实时注册表，选出最接近的 `items[].name` 安装名，查看条目内容，再用 shadcn-vue 安装，并基于生成的源码组合界面。希望 agent 选用现成的 beui-vue 组件、而不是自己发明动效控件时，就用它。',
  },
  mcpServer: {
    title: 'MCP 服务',
    body: '最快的方式：连接 beui-vue 的 MCP 服务，agent 就能直接列出、搜索和安装组件。服务地址是 `{url}`。',
    manual: '其他客户端：手动加入 MCP 配置。',
    tools: '工具：`list_components`、`search_components`、`get_component`、`get_install_command`。服务读取实时注册表，新增组件不需要重新部署就能查到。',
  },
  endpoints: {
    title: '端点',
    open: '打开',
    llmsTxt: { label: 'llms.txt', desc: 'llmstxt.org 格式的 Markdown 索引。' },
    registryIndex: { label: '注册表索引', desc: '所有可安装组件的 JSON 目录。' },
    shadcnItem: { label: 'shadcn-vue 条目', desc: '安装条目，包含每个文件的内容、npm 依赖和用法说明。' },
  },
  agentFlow: {
    title: 'Agent 流程',
    body: '两次请求，然后安装。每个条目都带着它需要的全部文件。',
  },
  shadcnFlow: {
    title: 'shadcn-vue 流程',
    body: 'shadcn-vue 条目会安装源码文件和依赖包。`@beui-vue` 已收录进 shadcn-vue 的注册表目录，项目里有 `components.json` 就能直接用短名称。',
  },
  entryShape: {
    title: '条目结构',
    body: '共享的辅助文件（例如 `core/motion.ts` 和共享的 `styles.css`）作为额外文件随条目一起提供，`docs` 字段说明该导入哪个文件。',
  },
}
