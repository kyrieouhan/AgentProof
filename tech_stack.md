# 技术栈与阶段约束

## 当前阶段

M1 安全执行内核与 CLI POC 已完成退出审计。当前包含 Node.js 标准库实现的 RunnerProfile 校验 CLI、JSON Schema、Docker 前置诊断、容器生命周期 smoke、基础隔离策略、官方 Demo profile、官方 Demo 的 install/build/test 结构化运行记录、timeout/cancel 清理诊断、三样例 repeatability 证据，以及 ISO-01 至 ISO-14 隔离烟测证据。

M2 API-first 垂直验收闭环已完成退出审计。M2 已引入 Zod 4.4.3，建立领域模型、状态、合并建议、JSON Schema 生成、验收项版本/确认模型、最小 API/数据库断言引擎、可重放随机测试数据、Manifest/脱敏基础、Markdown/HTML 报告聚合，以及官方 Demo 端到端回归。

当前 M3 浏览器验证、防作弊与最小本地 Web 入口 MVP 已完成。M3-01 至 M3-07 已新增 `playwright-core`，复用本机 Chrome/Edge 执行一条官方 Demo 浏览器流程，采集浏览器事件日志、脱敏截图和 evidence Manifest，把页面、同会话 API 与 SQLite 观察结果联合断言，输出测试/CI/Mock/Fixture/断言 Diff 风险，通过随机等价输入检测固定账号类硬编码风险，并提供 `src/web/` 下的本地 Web UI。Trace 支持为显式 opt-in，默认禁用以降低 DOM/输入泄密风险。当前停止在 M3 完成状态，未进入 M4。

## 后续规划（尚未实现）

| 能力 | 规划技术 | 最早里程碑 |
| --- | --- | --- |
| 控制面与 CLI | Node.js 标准库起步；必要时引入 TypeScript | M1 |
| 执行隔离 | Docker Engine API、临时 Linux 容器 | M1 |
| 领域 Schema 与 API | Zod、Fastify | M2 |
| 本地持久化 | SQLite；ORM 待实现前确认 | M2 |
| 浏览器验证 | `playwright-core` + 本机 Chrome/Edge | M3 |
| 最小本地 Web 入口 | Node.js `http` 本地服务、vanilla HTML/CSS/JS | M3 |
| 完整界面 | Next.js、Tailwind CSS、shadcn/ui | M4 或更晚，需另行授权 |
| GitHub 工作流 | GitHub App、PR Check | M4 |

规划不等于支持承诺；实际支持范围以 [docs/support-matrix.md](docs/support-matrix.md) 为准，重要技术选择以 [docs/decision-log.md](docs/decision-log.md) 为准。

## 当前验证命令

当前运行文档链接、JSON Schema、failure-case 语义测试、状态枚举、范围一致性、编码和敏感内容扫描；M1/M2/M3 本地验证还运行 `npm run schema:generate`、`npm run lint`、`npm test`、`npm run docker:check`、`npm run smoke:docker`、`npm run m3:browser-smoke`、`npm run m3:regression` 和 `npm run m3:web-smoke` 等。具体流程见 [sop.md](sop.md)。
