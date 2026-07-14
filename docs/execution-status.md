# AgentProof 执行状态

- 最近更新时间：2026-07-13
- 当前里程碑：M3 completed（浏览器验证、防作弊与最小本地 Web 入口 MVP）
- 当前任务：停止，等待用户明确授权是否进入 M4
- 上一个完成任务：M3-07 最小本地 Web 用户入口与 Web 端到端验证
- 最新相关 Commit：见当前文件所在提交
- 是否可以自动继续：是

## 已完成内容

- M0-01：failure-case 分类、Schema、语义校验与审核流程冻结。
- M0-02 / M0-03：39 条候选与审核记录整理完成；严格范围统计为 `core_in_scope=19`、`secondary_research=8`、`out_of_scope=12`。
- M0 数量门禁例外：已在 `docs/milestones/M0.md`、`docs/decision-log.md` 和 `dev_log.md` 记录，不再为凑数主动搜索 candidate-0040。
- 威胁模型初版：`docs/threat-model.md` 已覆盖控制面、执行面、信任边界、网络、宿主资源、依赖脚本、日志证据、脱敏与隔离烟测。
- 支持矩阵初版：`docs/support-matrix.md` 已明确 Node.js 20、npm/pnpm lockfile、install/build/test/start、端口、SQLite、显式配置和不支持范围。
- 官方 Demo 正确基线：`samples/demo-web-app/` 已实现并验证 Node.js / TypeScript / Fastify / SQLite / Prisma 正确版本。
- 官方缺陷样例：`samples/demo-web-app/defects/` 已提供五类可重复补丁式缺陷样例，并通过 `pnpm run defects:verify` 真实复现。
- M0-05 检测矩阵：`docs/m0-detection-evidence-matrix.md` 已定义五类缺陷的检测能力、关键证据、判定规则和误判边界。
- M0-06 可行性实验：`pnpm run m0:feasibility` 已生成 `artifacts/m0-feasibility/summary.json` 和 `artifacts/m0-feasibility/report.md`，结论为 `passed`。
- M0-07 Runner 输入规范：`docs/m1-runner-input-spec.md` 已固定 M1 可接收项目、命令、端口、环境变量、资源限制、网络策略、挂载策略和证据策略；`support-matrix.md` 与 `threat-model.md` 已完成对应评审结论。
- M0-08 退出审计：`docs/milestones/M0-exit-review.md` 确认 M0 在 ADR-012 数量门禁例外下结束，并进入 M1。
- M1-01 RunnerProfile 与 CLI 契约：根 `package.json`、`bin/agentproof.mjs`、`src/runner-profile.mjs`、`schemas/runner-profile.schema.json`、官方 Demo profile 和最小测试已完成。
- M1-02A Docker 前置诊断：`agentproof docker check [--json]` 已实现，可把 Docker CLI/Engine 缺失报告为 `infrastructure_error`。
- M1-02B 容器生命周期与最小挂载：`agentproof run --profile ... --lifecycle-smoke --json` 已实现并真实通过；临时 workspace 被清理，容器无网络、非 root、drop capabilities、只读挂载且无 Docker Socket。
- M1-03 资源/网络/权限策略：`src/runner-policy.mjs` 已固化默认容器策略，并通过真实 Docker smoke 验证非 root、无网络、只读 root/workspace、无 Docker Socket、无 `.env`/`.npmrc`。
- M1-04 install/build/test 结构化记录：`agentproof run --profile ... --commands --json` 已实现；官方 Demo 在临时 workspace 中完成 install/build/test 三阶段容器运行，记录 phase、命令、退出码、stdout/stderr、时间戳和耗时。
- M1-05 取消、超时、清理与诊断：Docker 命令记录现在包含 `timedOut`、`cancelled`、`errorCode` 和 `signal`；timeout/cancelled 会返回对应顶层状态并执行 `docker rm -f` 容器清理，临时目录清理失败会记录 `cleanupError`。
- M1-06 3 个样例与 10 次重复测试：新增三个零依赖 npm 样例和 `npm run m1:repeatability`；三个样例 install/build/test 均通过，`minimal-npm-state` 连续 10 次运行唯一签名数为 1。
- M1-07 14 项隔离烟测与安全评审：新增 `npm run m1:isolation` 和 `artifacts/m1-isolation-smoke/` 证据；ISO-01 至 ISO-14 全部通过，覆盖宿主路径、凭据、Docker Socket、网络、资源、只读挂载、timeout 清理、权限、路径穿越、可信 Manifest 边界、敏感金丝雀、固定镜像重放和清理失败注入。
- M1 退出门禁审计：`docs/milestones/M1-exit-review.md` 确认 M1 量化门禁全部通过，并记录 ADR-014 进入 M2。
- M2-01 领域模型、状态与 Zod Schema：新增 `src/domain/status.mjs`、`src/domain/schemas.mjs`、`scripts/generate-domain-schemas.mjs`、`schemas/domain/` 和领域测试；六个底层状态与四个合并建议以 Zod/代码为单一事实来源。
- M2-02 验收项编辑/确认/版本：新增 `src/domain/acceptance-versions.mjs`、`AcceptanceCriterionVersionSchema` 和版本测试；draft 可修订为独立版本，只有显式 `user_confirmed` 的版本可进入验证运行。
- M2-03 API 与数据库断言：新增 `src/domain/assertions.mjs` 和断言测试；API 断言覆盖状态码、响应头、JSON 字段和耗时，数据库断言覆盖已采集快照字段，验收项可聚合为 CriterionResult 形状。
- M2-04 随机数据与种子：新增 `src/domain/test-data.mjs`、`TestDataSeedSchema` 和测试数据测试；同一 seed 可重放生成 Demo 注册数据，seed 与 values 一起记录。
- M2-05 证据采集、Manifest 与脱敏：新增 `src/domain/manifest.mjs`、`src/domain/redaction.mjs`、`EvidenceManifestSchema` 和测试；证据引用绑定 sha256，Manifest 绑定运行上下文、证据和脱敏摘要。
- M2-06 HTML/Markdown 报告与聚合：新增 `src/domain/report.mjs` 和报告测试；报告按六状态和四建议聚合，不使用总分，并输出 Markdown/HTML，HTML 对不可信内容转义。
- M2-07 Demo 五类需求端到端回归与安全复审：新增 `npm run m2:demo-regression` 和 `artifacts/m2-demo-regression/`；正确基线与五类官方缺陷均进入 M2 report/manifest/seed/hash 证据。
- M2 退出门禁审计：`docs/milestones/M2-exit-review.md` 确认 M2 量化门禁全部通过，并记录 ADR-015 进入 M3。
- M3-01 浏览器步骤 Schema 与单流程执行：新增 `BrowserFlowSchema`、`schemas/domain/browser-flow.schema.json`、`src/domain/browser-flow.mjs`、`npm run m3:browser-smoke` 和 `artifacts/m3-browser-smoke/`；官方 Demo 关键流程可由本机 Chrome 执行。
- M3-02 截图/网络/控制台/Trace 采集和脱敏：新增浏览器事件采集与脱敏、最终截图 DOM 脱敏、browser evidence refs 和 Manifest；Trace 支持显式 opt-in，默认禁用。
- M3-03 页面/API/数据库联合断言：新增 `JoinedAssertionSchema`、`schemas/domain/joined-assertion.schema.json`、`src/domain/joined-assertions.mjs` 和 joined observation artifact；官方 Demo 同一任务可同时由页面、API 和 SQLite 验证。
- M3-04 测试与配置 Diff 风险模型：新增 `DiffRiskReportSchema`、`schemas/domain/diff-risk-report.schema.json`、`src/domain/diff-risk.mjs` 和 `npm run m3:diff-risk`；官方 weakened_tests 补丁可输出具体 high/human_review 风险。
- M3-05 只读规则与随机化硬编码检测：新增 `ReadOnlyRuleReportSchema`、`HardcodedProbeReportSchema`、只读规则检查、随机化硬编码检测和 `npm run m3:hardcoded`；官方 hardcoded_behavior 补丁可输出 human_review 风险。
- M3-06 官方 Demo 缺陷回归、3 次一致性与内部可用性检查：新增 `npm run m3:regression`、`artifacts/m3-regression/`、`docs/milestones/M3-exit-review.md` 和 ADR-016；M3 退出门禁通过。
- M3-07 最小本地 Web 用户入口：新增 `src/web/`、`npm run web:dev`、`npm run web:start` 和 `npm run m3:web-smoke`；界面可导入官方 Demo、显示 Git/RunnerProfile 信息、编辑验收项、启动真实 Runner/M3 验收、显示阶段进度、查看证据并导出 HTML/Markdown 报告。

## 未完成内容

- M4：GitHub App、Alpha 发布、外部项目验证、真实用户工作流、账号系统、云端部署和完整多项目 Web 平台尚未实现；未获用户授权前不得进入。

## 实际验证结果

- `git status --short`：M3-01 提交前会复验。
- `git diff --check`：通过。
- failure-case 统计：`candidate_total=39`，`core_in_scope=19`，`secondary_research=8`，`out_of_scope=12`，`cases/` 为空。
- Demo 正确基线最近验证：`pnpm install`、`prisma:generate`、`prisma:validate`、`db:init`、`lint`、`typecheck`、`test`、`build` 和 HTTP smoke test 通过，记录于 `dev_log.md`。
- 官方缺陷样例验证：`pnpm run defects:verify` 通过，五类缺陷均输出 `reproduced` 和实际观测值。
- M0-05 文档验证：Markdown 本地链接检查和 `git diff --check` 通过。
- M0-06 实验验证：`pnpm run m0:feasibility` 通过；正确基线 `passed`，五类缺陷均 `reproduced`。
- M0-07 文档验证：Runner 输入规范、安全评审和支持范围评审已完成，尚未开发正式 Runner。
- M0-08 审计验证：failure-case 语义测试、JSON 解析、统计一致性、Demo install/prisma/lint/typecheck/test/build、五类缺陷回放、M0 feasibility、Markdown 链接和 `git diff --check` 均通过。
- M1-01 验证：`npm install --package-lock-only --ignore-scripts`、`npm run lint`、`npm run profile:validate` 和 `npm test` 通过。
- M1-02 验证：`npm run lint`、`npm run profile:validate`、`npm test`、`npm run docker:check` 和 `npm run smoke:docker` 通过；Docker CLI 自动解析为 Docker Desktop bundled CLI；容器 smoke 输出 `agentproof-lifecycle-smoke-ok`，临时目录清理为 `removed`。
- M1-03 验证：`npm run lint`、`npm test` 和 `npm run smoke:docker` 通过；smoke 中验证 `id -u=1000`、workspace/root FS 只读、网络连接未成功、Docker Socket 缺失。
- M1-04 验证：`npm install --package-lock-only --ignore-scripts`、`npm run lint`、`npm run profile:validate`、`npm test`、`npm run smoke:docker` 和 `npm run run:demo` 通过。`run:demo` 的 runId 为 `m1-smoke-mriskluq`，镜像 digest 为 `sha256:8f693eaa7e0a8e71560c9a82b55fd54c2ae920a2ba5d2cde28bac7d1c01c9ba5`；install/build/test 三阶段退出码均为 0，test 输出 8 passed，临时目录清理为 `removed`。
- M1-05 验证：`npm run lint`、`npm test`、`npm run profile:validate`、`npm run smoke:docker` 和真实 Docker timeout smoke 通过；timeout smoke 返回 `timeout`、错误为 `install command timed out`，记录 `docker rm -f`，并确认无遗留容器。
- M1-06 验证：`npm run m1:repeatability` 通过并生成 `artifacts/m1-repeatability/summary.json` 与 `report.md`；三个样例均 `passed`，repeat target 为 `minimal-npm-state`，repeat count 为 10，unique repeat signatures 为 1。
- M1-07 验证：`npm run m1:isolation` 通过并生成 `artifacts/m1-isolation-smoke/summary.json` 与 `report.md`；14 项 ISO smoke 均 `passed`，Docker server 为 `29.6.1`，镜像 digest 为 `sha256:8f693eaa7e0a8e71560c9a82b55fd54c2ae920a2ba5d2cde28bac7d1c01c9ba5`。
- M1 退出审计验证：M1 全部量化门禁均有证据；当时未进入 M3/M4，也未创建 GitHub App。
- M2-01 验证：`npm run schema:generate`、`npm run lint` 和 `npm test` 通过；测试总数为 21。
- M2-02 验证：`npm run schema:generate`、`npm run lint` 和 `npm test` 通过；测试总数为 25。
- M2-03 验证：`npm run schema:generate`、`npm run lint` 和 `npm test` 通过；测试总数为 29。
- M2-04 验证：`npm run schema:generate`、`npm run lint` 和 `npm test` 通过；测试总数为 32。
- M2-05 验证：`npm run schema:generate`、`npm run lint` 和 `npm test` 通过；测试总数为 34。
- M2-06 验证：`npm run schema:generate`、`npm run lint` 和 `npm test` 通过；测试总数为 37。
- M2-07 验证：`npm run lint` 和 `npm run m2:demo-regression` 通过；Demo 回归报告 6 个 criterion 均 `passed`，合并建议为 `recommend_merge`。
- M2 退出审计验证：M2 全部量化门禁均有证据；当前仍未进入 M4，也未创建 GitHub App。
- M3-01 验证：`npm run schema:generate`、`npm run lint`、`npm test` 和 `npm run m3:browser-smoke` 通过；测试总数为 40；浏览器 smoke runId 为 `m3-browser-mrizyiam`，本机 Chrome 版本为 `150.0.7871.101`，1 个 browser criterion 为 `passed`，合并建议为 `recommend_merge`。
- M3-02 验证：`npm run schema:generate`、`npm run lint`、`npm test` 和 `npm run m3:browser-smoke` 通过；测试总数为 43；浏览器 smoke runId 为 `m3-browser-mrj13e5y`，生成 `browser-events.json`、`final-screen.png`、`manifest.json`、`summary.json` 和 `report.md`；截图中邮箱/密码已替换为脱敏值，artifact 脱敏扫描无邮箱/密码/token 明文。
- M3-03 验证：`npm run schema:generate`、`npm run lint`、`npm test` 和 `npm run m3:browser-smoke` 通过；测试总数为 45；领域 JSON Schema 数量为 8；浏览器 smoke runId 为 `m3-browser-mrj1osq3`，2 个 criterion 均 `passed`，`joined-observation.json` 显示页面、API 和数据库对同一任务一致。
- M3-04 验证：`npm run schema:generate`、`npm run lint`、`npm test` 和 `npm run m3:diff-risk` 通过；测试总数为 48；领域 JSON Schema 数量为 9；`artifacts/m3-diff-risk/summary.json` 对官方 weakened_tests 补丁输出 1 条 high `weakened_tests` 风险，建议 `human_review`。
- M3-05 验证：`npm run schema:generate`、`npm run lint`、`npm test` 和 `npm run m3:hardcoded` 通过；测试总数为 54；领域 JSON Schema 数量为 11；`artifacts/m3-hardcoded-randomization/summary.json` 显示只读规则通过，官方 hardcoded_behavior 补丁触发 1 条 human_review 风险。
- M3-06 验证：`npm run m3:regression` 通过；浏览器正确基线 3/3 一致，五类官方缺陷 5/5 `reproduced`，Diff 风险与 hardcoded 随机化检查通过，内部可用性检查通过。
- M3-07 验证：`npm run m3:web-smoke` 通过；从真实浏览器打开 AgentProof Web UI，错误路径检查通过，导入官方 Demo，编辑/确认验收项，点击开始验收，真实执行 Docker Runner install/build/test 与 M3 browser/API/database/report，打开 HTML/Markdown 报告和截图/日志/Manifest 证据；连续 3 次均 `passed` / `recommend_merge`，Docker 不可用场景显示 `infrastructure_error`。

## 阻塞事项

无当前阻塞。

## 下一项任务

停止在 M3 完成状态。下一步只有在用户明确授权时才能进入 M4；不得自动开发 GitHub App、完整多项目 Web 平台、外部 Alpha 或 M4 能力。

第一条恢复命令：

```powershell
Set-Location -LiteralPath <repo-root>
git status --short
Get-Content -Raw -Encoding UTF8 -LiteralPath docs\execution-status.md
Get-Content -Raw -Encoding UTF8 -LiteralPath .agent\PLANS.md
```
