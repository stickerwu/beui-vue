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

`catalog.json` 记录基准提交的 160 个安装条目、源文件、上游文档、变体和贡献者。`pnpm catalog` 从 Git 基准对象重新计算并对照快照。浅克隆环境需先获取上游提交历史。`ports*.json` 登记 Vue 导出、API 和逐变体验收。目录页展示每项已通过还原验收的比例。

```sh
pnpm exec playwright install chromium firefox webkit
pnpm test:e2e
pnpm test:package
```

`test:package` 创建 `.artifacts/*.tgz`，装入独立的 Vite 与 Nuxt 工程，检查类型、CSS、SSR 和浏览器水合。Playwright 失败会保存 trace 和截图。视觉验收须记录具体变体、视口、主题、动效偏好及关键帧，人工复核快速反向、中断和真机触摸，对照结果附到对应条目。

在仓库根目录运行 `bun install --frozen-lockfile` 安装上游预览所需的依赖。回到 `vue/` 运行 `pnpm test:parity`，为六个样板在同一组数据与输入下采集亮暗主题的起始、中间和结束帧。原图、移植图、像素差异图和报告位于 `.artifacts/parity/`。`pnpm test:gallery` 采集固定上游目录的全部 172 组演示入口并生成 `.artifacts/gallery/index.html`，可逐组审看。两侧默认演示的数据、交互路径或内容仍有区别时，应先对齐再作结论。所有截图均在本地浏览器生成。

使用 `pnpm docs:evidence` 将已生成的完整图库和六个样板的关键帧复制到文档静态目录，再运行 `pnpm docs:build`。这些图片只随文档分发。

运行 `pnpm test:motion` 可为全部 172 组演示采集明暗主题下 0、120 和 900 毫秒的原图、Vue 图与差分图。`.artifacts/motion-review/report.json` 记录输入、两侧是否匹配到同一控件、各帧差异及待复核项目。在 GitHub Actions 手动运行 **Capture Vue visual comparisons** 也可下载全部原始材料。

## 发布

1. 使用 `pnpm changeset` 记录改动，执行 `pnpm version-packages` 更新包版本。`0.x-alpha` 用于阶段性预览；稳定版受全量验收门槛约束。
2. 主分支通过 Vue 工作流后，Pages 部署文档，静态产物在 `docs/.vitepress/dist`。Actions 的 `vue-package` 附件是验证过的 npm 压缩包。
3. 首次在 npm 建立包时由包维护者登录，通过 2FA 发布经过验证的预发布压缩包。后续在 npm 配置 GitHub Trusted Publishing，仓库填 `stickerwu/beui-vue`，工作流填 `npm.yml`，环境填 `npm`。
4. 手动运行 Publish verified Vue tarball 并填写同一主分支提交的成功构建 run ID。工作流复用已测试的压缩包，预发布使用 `next` 标签，正式版使用 `latest`。

## 同步 Gitee

在 `vue/` 运行 `node scripts/sync-gitee.mjs` 会同步 GitHub 的 `main` 和标签并核对两端 SHA。该脚本使用本机 Git 登录，遇到分叉会停止。本地也可把 GitHub、Gitee 地址都设为 `origin` 的推送地址。运行 `git remote get-url --push --all origin` 可检查两个目标，随后 `git push origin main` 会依次推送。若其中一个目标失败，修复后重试并核对两个目标的 SHA。

如需从 GitHub Actions 自动同步，为 Gitee 建立专用机器账号，只授予它对 `stickerwu/beui-vue` 的写权限。生成新 SSH 密钥对，把公钥添加到该机器账号的**账户 SSH 公钥**设置。Gitee 仓库的部署公钥仅支持读取。[Gitee 部署公钥说明](https://help.gitee.com/repository/ssh-key/generate-and-add-ssh-public-key)

在 GitHub 仓库的 Actions 设置中，把私钥保存为 secret `GITEE_MACHINE_USER_SSH_KEY`，把经官方指纹核验的 Gitee SSH 主机公钥保存为变量 `GITEE_KNOWN_HOSTS`。设置仓库变量 `GITEE_MIRROR_ENABLED=true` 后，推送 `main` 或标签将触发同步。首次配置后可手动运行 **Sync Gitee mirror** 核对两个仓库的引用。
