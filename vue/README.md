# beui-vue 开发与发布

Vue 3.5 + TypeScript 组件库。工作目录为 `vue/`。使用 Node 24 LTS 和 pnpm 10.28.2。

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm docs:build
pnpm docs:preview
```

访问 `http://127.0.0.1:4173/beui-vue/`。开发文档时用 `pnpm docs:dev`，组件修改后重新构建包。网页展示的是工作区构建出的 npm 产物。

## 迁移目录与验收

`catalog.json` 记录基准提交的 160 个安装条目、源文件、上游文档、变体和贡献者。`pnpm catalog` 从 Git 基准对象重新计算并对照快照。浅克隆环境需先获取上游提交历史。`ports.json` 登记 Vue 导出与 API，已实现条目展示预览与示例，验收后附上证据。

```sh
pnpm exec playwright install chromium firefox webkit
pnpm test:e2e
pnpm test:package
```

`test:package` 创建 `.artifacts/*.tgz`，装入独立的 Vite 与 Nuxt 工程，检查类型、CSS、SSR 和浏览器水合。Playwright 失败会保存 trace 和截图。视觉验收须记录具体变体、视口、主题、动效偏好及关键帧，人工复核快速反向、中断和真机触摸，对照结果附到对应条目。

## 发布

1. 使用 `pnpm changeset` 记录改动，执行 `pnpm version-packages` 更新包版本。`0.x-alpha` 用于阶段性预览；稳定版受全量验收门槛约束。
2. 主分支通过 Vue 工作流后，Pages 部署文档，静态产物在 `docs/.vitepress/dist`。Actions 的 `vue-package` 附件是验证过的 npm 压缩包。
3. 首次在 npm 建立包时由包维护者登录，通过 2FA 发布经过验证的预发布压缩包。后续在 npm 配置 GitHub Trusted Publishing，仓库填 `stickerwu/beui-vue`，工作流填 `npm.yml`，环境填 `npm`。
4. 手动运行 Publish verified Vue tarball 并填写同一主分支提交的成功构建 run ID。工作流复用已测试的压缩包，预发布使用 `next` 标签，正式版使用 `latest`。

## 同步 Gitee

执行 `node scripts/sync-gitee.mjs` 同步 GitHub 的 `main` 和标签并核对远端 SHA。该脚本使用本机 Git 登录，遇到分叉会停止。自动同步使用仓库专用的 Gitee SSH 写入密钥，将私钥放入 GitHub Actions 的 `GITEE_DEPLOY_KEY`，将核验过的 Gitee SSH 主机公钥放入仓库变量 `GITEE_KNOWN_HOSTS`，设置 `GITEE_MIRROR_ENABLED=true` 启用工作流。
