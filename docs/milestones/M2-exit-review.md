# M2 退出门禁审计

- 审计日期：2026-07-13
- 审计结论：M2 API-first 垂直验收闭环可以结束，并进入 M3 浏览器验证与防作弊轻量版。
- 下一里程碑：M3 浏览器验证与防作弊轻量版，本地 MVP。
- 下一任务：M3-01 浏览器步骤 Schema 与单流程执行。

## 结论摘要

M2 已完成领域 Schema、验收项版本、API/数据库断言、可重放随机数据、证据 Manifest、字段级脱敏、Markdown/HTML 报告聚合，以及官方 Demo 正确/五类缺陷端到端回归。

M2 的量化退出门禁均已满足：官方 Demo 正确基线与五类缺陷进入自动回归；六个底层状态和四个合并建议与 [glossary.md](../glossary.md) 一致；结论可追溯到请求/响应、数据库观测、Commit、RunnerProfile、镜像 digest、seed 和证据哈希；Token/Cookie/个人数据脱敏有测试覆盖；`infrastructure_error`、`unverifiable` 和阻断级安全问题的聚合规则已由单元测试固定。

该结论不改变 failure-case 数据集状态：正式 `datasets/failure-cases/cases/` 仍为空，公开候选未被设置为 `approved`、`source_verified` 或 `reproduced`。

## 门禁审计

| 门禁 | 结果 | 证据 |
| --- | --- | --- |
| 领域 Schema 单一事实来源 | 通过 | `src/domain/schemas.mjs`、`schemas/domain/`、`npm run schema:generate` |
| 验收项可编辑、确认、版本化 | 通过 | `src/domain/acceptance-versions.mjs`；draft、revision、user_confirmed 测试 |
| API 状态码、JSON、响应头、耗时断言 | 通过 | `src/domain/assertions.mjs`；本地 HTTP server 测试 |
| 数据库状态断言 | 通过 | 数据库快照断言测试；Demo baseline/defect probe 包含 SQLite 观测 |
| 随机数据和 seed 可重放 | 通过 | `src/domain/test-data.mjs`；同 seed 确定性测试 |
| Manifest 绑定上下文与证据哈希 | 通过 | `src/domain/manifest.mjs`、`artifacts/m2-demo-regression/manifest.json` |
| Token/Cookie/个人数据脱敏 | 通过 | `src/domain/redaction.mjs`；authorization、cookie、password、token 测试 |
| 报告按六状态和四建议聚合 | 通过 | `src/domain/report.mjs`；无总分、HTML 转义测试 |
| 官方 Demo API 正确/缺陷路径回归 | 通过 | `npm run m2:demo-regression`；6 个 criterion 均 `passed` |
| M2 不提前进入 M3/M4 | 通过 | 未实现 Playwright 浏览器验证、GitHub App、完整 Web 或外部 Alpha |

## 本次真实校验

| 命令/检查 | 结果 |
| --- | --- |
| `npm run schema:generate` | 通过；生成 6 个领域 JSON Schema |
| `npm run lint` | 通过 |
| `npm test` | 通过；37 tests passed |
| `npm run m2:demo-regression` | 通过；6 个 criterion 均 `passed`，合并建议 `recommend_merge` |
| JSON 解析检查 | 通过 |
| Markdown 本地链接检查 | 通过 |
| failure-case 范围统计检查 | 通过；仍为 `39/19/8/12` |
| 正式 `datasets/failure-cases/cases/` | 通过；仍为空 |
| `git diff --check` | 通过 |

## 已知限制

- M2 报告是最小 HTML/Markdown 输出，不是完整 Web UI。
- M2 Manifest 尚未签名，也不包含长期证据存储、访问控制或密钥轮换。
- M2 的数据库断言核心是快照比较；官方 Demo probe 已观测 SQLite 状态，但通用 SQLite 连接器仍可在后续增强。
- 浏览器流程、截图、网络失败、控制台错误、Trace、测试 Diff 风险模型和轻量硬编码检测属于 M3。
- GitHub App、外部项目 Alpha、真实用户验证和发布流程属于 M4，不属于本地 MVP 当前阶段。

## 进入 M3 的条件

M3 必须延续 M1/M2 边界：

- 不削弱 Docker 隔离、Manifest、seed 和脱敏要求。
- 浏览器上下文必须隔离，禁用任意下载、危险协议和未授权外部导航。
- 页面证据必须与 API/数据库证据联合判断，不能只看 UI 文案。
- 测试/配置 Diff 只输出风险与具体证据，不直接把普通测试修改指控为作弊。
- 不开发 GitHub App、云端 Runner、完整 Web、外部 Alpha 或真实用户研究。
