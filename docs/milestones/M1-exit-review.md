# M1 退出门禁审计

- 审计日期：2026-07-13
- 审计结论：M1 安全执行内核与 CLI POC 可以结束，并进入 M2 API-first 垂直验收闭环。
- 下一里程碑：M2 API-first 垂直验收闭环。
- 下一任务：M2-01 领域模型、状态与 Zod Schema。

## 结论摘要

M1 已完成 RunnerProfile/CLI 契约、Docker 前置诊断、容器生命周期、默认隔离策略、install/build/test 结构化运行、timeout/cancel 清理诊断、三样例 repeatability，以及 ISO-01 至 ISO-14 隔离烟测。

M1 的量化退出门禁均已满足：三个支持矩阵内样例可以在临时 Docker workspace 中完成 install/build/test；同一样例连续 10 次运行结果一致；14 项隔离烟测全部通过并保存证据；目标容器无法读取宿主个人目录、SSH/Git/npm/env 凭据或 Docker Socket；timeout、取消、失败和清理路径均有自动测试或烟测证据。

该结论不改变 M0 的 failure-case 状态：正式 `datasets/failure-cases/cases/` 仍为空，候选记录未被设置为 `approved`、`source_verified` 或 `reproduced`。M2 可以基于官方 Demo、RunnerProfile、结构化命令记录和 M1 隔离证据继续做 API-first 验收闭环。

## 门禁审计

| 门禁 | 结果 | 证据 |
| --- | --- | --- |
| 最小 CLI 与 RunnerProfile Schema | 通过 | `bin/vericrate.mjs`、`schemas/runner-profile.schema.json`、`src/runner-profile.mjs` |
| Docker CLI/Engine 前置诊断 | 通过 | `vericrate docker check --json`；Docker server `29.6.1` |
| 容器生命周期与最小挂载 | 通过 | `npm run smoke:docker`；临时 workspace 清理为 `removed` |
| 默认资源/网络/权限策略 | 通过 | `src/runner-policy.mjs`；非 root、drop capabilities、no-new-privileges、默认无网络、只读 root/workspace |
| install/build/test 结构化记录 | 通过 | `vericrate run --profile ... --commands --json`；官方 Demo 三阶段退出码为 0 |
| timeout/cancel/failure/cleanup 可诊断 | 通过 | `tests/docker-runner.test.mjs`；真实 timeout smoke；ISO-08、ISO-14 |
| 3 个支持矩阵内样例 install/build/test | 通过 | `artifacts/m1-repeatability/summary.json`；`sample_count=3` |
| 同一 Commit 连续 10 次运行一致 | 通过 | `artifacts/m1-repeatability/summary.json`；`repeat_count=10`、`unique_repeat_signatures=1` |
| ISO-01 至 ISO-14 隔离烟测 | 通过 | `artifacts/m1-isolation-smoke/summary.json`；14 条记录均 `passed` |
| 宿主目录、凭据和 Docker Socket 不暴露 | 通过 | ISO-01、ISO-02、ISO-03、ISO-12 |
| Docker 非绝对安全边界已记录 | 通过 | `docs/threat-model.md`、`docs/milestones/M1.md` |
| M1 不扩展到 M2/M3/GitHub App | 通过 | 本阶段未实现 API 验收、浏览器验证器、GitHub App 或完整 Web |

## 本次真实校验

| 命令/检查 | 结果 |
| --- | --- |
| `npm run lint` | 通过 |
| `npm test` | 通过；16 tests passed |
| `npm run profile:validate` | 通过；官方 Demo RunnerProfile 有效 |
| 三个最小样例 RunnerProfile 校验 | 通过 |
| `npm run docker:check` | 通过；Docker CLI 自动解析为 `<DOCKER_CLI_PATH>` |
| `npm run smoke:docker` | 通过；生命周期 smoke 输出 `vericrate-lifecycle-smoke-ok`，清理为 `removed` |
| `npm run m1:repeatability` | 通过；3 个样例，10 次重复，唯一签名数为 1 |
| `npm run m1:isolation` | 通过；ISO-01 至 ISO-14 全部 `passed` |
| JSON 解析检查 | 通过 |
| Markdown 本地链接检查 | 通过 |
| failure-case 范围统计检查 | 通过；仍为 `39/19/8/12` |
| 正式 `datasets/failure-cases/cases/` | 通过；仍为空 |
| `git diff --check` | 通过 |

## 已知限制

- Docker 不是绝对安全边界；高风险仓库仍可能需要一次性 VM、远程隔离主机或更强沙箱。
- M1 只生成结构化命令记录和隔离证据，不生成 M2 所需的最终 Evidence Manifest。
- M1 不做 API 断言、数据库前后状态验收、报告聚合、浏览器流程、Git Diff 风险检查或轻量防作弊。
- 官方 Demo 的复杂 pnpm/SQLite/Prisma 路径已在 M1-04 跑通；M1-06 repeatability 使用零外部依赖 npm 样例以避免外部网络波动污染一致性结论。

## 进入 M2 的条件

M2 必须保持 M1 的隔离边界，并按 [glossary.md](../glossary.md) 使用统一底层状态和合并建议：

- 以 Zod 作为领域 Schema 单一事实来源，并生成 JSON Schema。
- API 响应、日志、数据库内容和报告字段继续视为不可信输入。
- `infrastructure_error` 不得混为 `failed`；`unverifiable` 不得被静默忽略。
- Evidence Manifest 必须由可信控制面生成，绑定 Commit、规则、镜像、命令、环境、种子和证据哈希。
- 不开发 GitHub App；浏览器验证属于 M3，GitHub 工作流属于 M4。
