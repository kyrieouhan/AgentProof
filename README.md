# AgentProof

[![CI](https://github.com/kyrieouhan/AgentProof/actions/workflows/ci.yml/badge.svg)](https://github.com/kyrieouhan/AgentProof/actions/workflows/ci.yml)

AgentProof 是一个本地优先的 AI 编程 Agent 独立验收与证据平台。它不直接相信 Codex、Claude Code、Cursor 等编程 Agent 对“任务已完成”的自述，而是在独立运行环境中安装、构建、测试并验证目标项目，把需求、代码版本、运行环境、验收规则和证据绑定起来，输出可复查的结论。

当前仓库是 **本地 M3 MVP**：已经具备本地 CLI 验收内核、官方 Demo、轻量防作弊检查、证据 Manifest、HTML/Markdown 报告，以及一个最小本地 Web 界面。

AgentProof 可以导入符合 RunnerProfile 规范的本地 Git 项目，并执行安装、构建和现有测试。当前完整的 Playwright 浏览器流程、API 联合检查和 SQLite 联合断言以官方 Demo 为参考实现；外部项目如需完整行为验收，需要后续提供项目专属的浏览器步骤、API 断言和数据库断言配置。当前版本不声称能够自动理解任意项目并生成完整验证流程，M4 也尚未完成真实外部项目兼容验证。

## 当前已支持的能力

- RunnerProfile 校验：检查目标项目的安装、构建、测试、启动和资源配置。
- Docker 预检：区分 Docker/环境问题和目标项目功能失败。
- 受限容器运行：在本地 Docker 中执行 install/build/test/start 等阶段。
- 官方 Demo 联合验证：对官方 Demo 的注册、登录、任务和管理员权限路径执行 Playwright、API 与 SQLite 断言。
- 浏览器证据采集：通过 Playwright 执行已配置的页面流程，并采集截图和浏览器事件证据。
- 页面/API/数据库联合判断：在已有专属验证流程时避免只看页面文字或单一接口导致误判；未配置的外部项目会返回 `unverifiable`。
- 风险检查：识别测试削弱、只读规则破坏和固定输入/硬编码行为的风险信号。
- 本地 Web MVP：导入本地 Git 项目、编辑需求和验收项、启动验收、查看阶段进度、证据和报告。

## 系统要求

- Windows、macOS 或 Linux
- Node.js 20+
- npm
- Docker Desktop 或兼容 Docker Engine
- Chrome 或 Microsoft Edge（用于浏览器 smoke 测试）

官方 Demo 使用 pnpm/Prisma/SQLite；运行时由项目脚本和 RunnerProfile 自动处理。

## 安装

```powershell
git clone https://github.com/kyrieouhan/AgentProof.git
Set-Location -LiteralPath <REPO_ROOT>
npm install
npm run docker:check
```

根目录 `npm install` 会通过 Corepack 在 `samples/demo-web-app` 内自动执行 `pnpm install --frozen-lockfile` 和 `pnpm run prisma:generate`，为官方 Demo 准备 Prisma Client、SQLite 和测试依赖。

`npm run docker:check` 应返回 Docker CLI 和 Docker Engine 可用。若 Docker 不可用，AgentProof 会把相关运行标记为 `infrastructure_error`，而不是伪装成功或误判为功能失败。

## 启动本地 Web MVP

```powershell
npm run web:start
```

默认访问地址：

```text
http://127.0.0.1:4173
```

Web 服务默认只监听 localhost，不对局域网或公网开放。

## 运行数据目录

AgentProof 默认不把验收报告、截图、数据库、trace 或临时文件写入被验收项目仓库。

- Windows 默认目录：`%LOCALAPPDATA%\AgentProof\runs\<run-id>`
- macOS/Linux 默认目录：`~/.agentproof/runs/<run-id>`
- 浏览器 smoke 与回归数据位于同一数据根目录下的 `smoke/` 子目录。
- Runner 使用的数据缓存位于同一数据根目录下的 `cache/runner/`，用于复用 Corepack/pnpm 包管理器和依赖缓存，减少重复联网。
- 可用环境变量覆盖数据根目录：

  ```powershell
  $env:AGENTPROOF_DATA_DIR = "D:\AgentProofData"
  npm run web:start
  ```

报告目录通常包含 `report.html`、`report.md`、`summary.json` 和 `evidence/`。公开仓库中的 `artifacts/` 只保留 `.gitkeep`，不作为默认运行输出位置。

## 官方 Demo 使用步骤

1. 启动本地 Web MVP。
2. 在“本地 Git 仓库路径”中输入：

   ```text
   <REPO_ROOT>\samples\demo-web-app
   ```

   在 macOS/Linux 中使用：

   ```text
   <REPO_ROOT>/samples/demo-web-app
   ```

3. 点击“检查项目”，确认项目名称、分支、提交哈希、工作区状态和 RunnerProfile 命令显示正常。
4. 在“需求与验收标准”区域点击“加载示例”，或手动填写需求和验收项。
5. 点击“开始验收”。
6. 等待安装、构建、测试、启动服务、API 验证、浏览器验证、数据库验证和报告生成阶段完成。
7. 在结果区查看每个验收项状态、失败原因、证据、合并建议，并打开 HTML 报告或下载 Markdown 报告。

## Windows 安装版

当前 M3 分发增强支持构建未签名的 Windows x64 桌面安装包：

```powershell
npm run desktop:dist:win
```

构建完成后，安装包位于：

```text
dist-installer\AgentProof-Setup-0.1.0-x64.exe
```

安装版说明：

- 安装后可通过桌面快捷方式或开始菜单启动 AgentProof。
- AgentProof 自身随安装包携带 Electron/Node 运行环境，用户不需要为 AgentProof 执行 `git clone`、`npm install` 或 `npm run web:start`，也不需要单独安装 Node.js。
- Docker Desktop 仍需用户单独安装并启动；AgentProof 不捆绑 Docker，也不修改 Docker 设置。
- 浏览器验证使用本机 Chrome 或 Microsoft Edge；找不到浏览器时可设置 `CHROME_PATH`。
- 安装器为 NSIS x64，默认当前用户安装，允许选择 C 盘或 D 盘安装目录，创建桌面和开始菜单快捷方式，支持卸载。
- 当前安装包未做代码签名，Windows SmartScreen 可能提示“无法识别的应用”。这是未签名测试版的预期限制，用户需自行确认发布来源后再选择是否继续运行。
- 卸载程序不会默认删除 `%LOCALAPPDATA%\AgentProof\` 下的运行数据。

安装版数据目录：

```text
%LOCALAPPDATA%\AgentProof\
  runs\
  logs\
  temp\
  demo\
  config\
```

可以用 `AGENTPROOF_DATA_DIR` 覆盖默认数据目录。官方 Demo 会在首次运行时复制到用户数据目录，例如 `%LOCALAPPDATA%\AgentProof\demo\0.1.0\`，不会在安装目录或被验收项目中原地写入数据库、截图、报告或临时文件。

安装版仍属于本地 M3 MVP：不包含自动更新、代码签名、托盘、开机启动、macOS/Linux 安装包、GitHub App、云端 Runner 或账号系统。

## 外部项目边界

对于非官方 Demo 项目，AgentProof 当前可以按 RunnerProfile 执行 install/build/test，并保留结构化日志和报告。若项目没有显式配置专属浏览器流程、API 断言和数据库断言，则浏览器/API/数据库阶段会显示 `unverifiable`，最终建议为 `human_review` 或 `indeterminate`，不会因为 install/build/test 通过就自动给出 `recommend_merge`。

## 常用命令

```powershell
npm test
npm run lint
npm run m3:web-smoke
npm run m3:regression
npm run desktop:smoke
npm run desktop:pack
npm run desktop:dist:win
```

这些命令会在本地数据目录下重新生成运行证据。公开导出分支默认不跟踪生成物，只保留 `artifacts/.gitkeep` 作为兼容目录锚点。

## 文档入口

- 总计划与架构：[docs/agentproof-plan.md](docs/agentproof-plan.md)
- 当前里程碑：[docs/milestones/M3.md](docs/milestones/M3.md)
- 威胁模型：[docs/threat-model.md](docs/threat-model.md)
- 支持矩阵：[docs/support-matrix.md](docs/support-matrix.md)
- 决策日志：[docs/decision-log.md](docs/decision-log.md)
- 统一术语与状态：[docs/glossary.md](docs/glossary.md)
- 失败案例数据集：[datasets/failure-cases/README.md](datasets/failure-cases/README.md)

工作区项目记录位于 [requirements.md](requirements.md)、[tech_stack.md](tech_stack.md)、[dev_log.md](dev_log.md)、[pitfalls.md](pitfalls.md)、[sop.md](sop.md) 和 [retrospective.md](retrospective.md)。

## 安全说明

- 不要把真实 `.env`、API Key、Cookie、Token、SSH Key、私有 npm 配置或个人数据放入目标项目。
- Docker 不是绝对安全边界。本地 MVP 用于开发和验证，不应用来运行高风险不可信代码。
- AgentProof 默认禁止目标容器访问 Docker Socket、宿主机个人目录、SSH Key、真实 `.env`、`.npmrc` 和不受限制的网络。
- 公开导出版本不跟踪本地运行报告、截图、trace、数据库和临时日志；这些文件会在本地验证时重新生成。
- 安全问题请参考 [SECURITY.md](SECURITY.md)。不要在公开 Issue 中提交 Token、Cookie、密码、私有仓库代码或个人数据。

## 已知限制

- 当前仍是本地 M3 MVP，不是完整 SaaS 或团队平台。
- 尚未包含 GitHub App、云端 Runner、账号系统、权限后台、Alpha 发布流程或外部项目大规模验证。
- 当前 Web 界面是单机本地入口，不提供多租户或远程队列。
- 当前没有通用自动生成浏览器/API/数据库断言的能力；外部项目完整验收需要项目专属配置。
- 风险检查会给出证据和建议，不直接指控编程 Agent “作弊”。
- Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE).

## 公开状态

本公开副本包含一份全新的 Git 历史，只保留源码、测试、Schema、官方 Demo 和必要文档；本地运行 artifacts、原始 Word 计划书、数据库、trace、截图和含本机路径的生成报告不纳入公开版本。当前仍为 AgentProof 本地 M3 MVP，M4、GitHub App 和云端 Runner 尚未完成。
