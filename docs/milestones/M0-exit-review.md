# M0 退出门禁审计

- 审计日期：2026-07-12
- 审计结论：M0 可以在明确记录的核心案例数量门禁例外下结束，并进入 M1。
- 下一里程碑：M1 安全执行内核与 CLI POC。
- 下一任务：M1-01 RunnerProfile 与 CLI 契约。

## 结论摘要

M0 已完成问题基准、官方 Demo 正确基线、五类官方缺陷样例、检测证据矩阵、最小可行性实验、Runner 输入规范、安全评审和支持范围评审。

唯一未按原始数量门禁满足的是“至少 20 个核心失败案例”。严格审核后的真实统计仍为 19 条 `core_in_scope`、8 条 `secondary_research`、12 条 `out_of_scope`，正式 `datasets/failure-cases/cases/` 为空。根据 [ADR-012](../decision-log.md)，本项目接受该门禁例外，不伪造统计，不为凑数补低质量案例，也不把候选迁移成未批准正式案例。

该例外不削弱 M1 的前置条件：M1 需要的是问题分类、官方 Demo、缺陷样例、检测思路、安全边界和 Runner 输入规范，而这些交付物已可支持安全执行内核开发。

## 门禁审计

| 门禁 | 结果 | 证据 |
| --- | --- | --- |
| failure-case 分类、Schema 与审核流程冻结 | 通过 | `datasets/failure-cases/schema.json`、`category-taxonomy.md`、`review-checklist.md`、`tests/run_tests.py` |
| 不少于 20 个核心失败案例 | 例外接受 | 真实统计为 19/8/12；见 [ADR-012](../decision-log.md) 与 `scope-audit.json` |
| 不伪造来源、批准或复现状态 | 通过 | 候选仍为 draft/source_pending/verified=false；正式 `cases/` 为空 |
| 官方 Demo 正确基线 | 通过 | `samples/demo-web-app/`；注册、登录、权限、SQLite 持久化和错误处理均有测试 |
| 至少 5 类官方缺陷样例 | 通过 | `samples/demo-web-app/defects/`；五类补丁均可重复回放 |
| 每类缺陷有检测方式和证据类型 | 通过 | [m0-detection-evidence-matrix.md](../m0-detection-evidence-matrix.md) |
| 最小检测可行性实验 | 通过 | `pnpm run m0:feasibility`，结果为 `passed` |
| 威胁模型初版 | 通过 | [threat-model.md](../threat-model.md) |
| 支持矩阵初版 | 通过 | [support-matrix.md](../support-matrix.md) |
| M1 Runner 输入规范 | 通过 | [m1-runner-input-spec.md](../m1-runner-input-spec.md) |
| 不进入 M1 业务实现 | 通过 | M0 阶段未开发正式 Runner、API 验证器、浏览器验证器或 GitHub App |

## 当前 failure-case 统计

| 指标 | 值 |
| --- | ---: |
| candidate_total | 39 |
| core_in_scope | 19 |
| secondary_research | 8 |
| out_of_scope | 12 |
| shortfall_to_20 | 1 |
| meets_20_final_candidate_target | false |
| 正式 cases/ | 0 |

## 本次真实校验

| 命令/检查 | 结果 |
| --- | --- |
| `python datasets/failure-cases/tests/run_tests.py` | 通过；3 个有效夹具和 12 个无效夹具结果符合预期 |
| JSON 解析检查 | 通过；`scope-audit.json`、`review-summary.json`、`summary.json` 可解析 |
| scope 统计一致性 | 通过；`scope-audit.json` 与 `review-summary.json` 关键统计一致 |
| `pnpm install` | 通过；依赖已是最新 |
| `pnpm run prisma:generate` | 通过 |
| `pnpm run prisma:validate` | 通过 |
| `pnpm run db:init` | 通过；初始化 dev/test SQLite 数据库 |
| `pnpm run lint` | 通过 |
| `pnpm run typecheck` | 通过 |
| `pnpm test` | 通过；8 tests passed |
| `pnpm run build` | 通过 |
| `pnpm run defects:verify` | 通过；五类缺陷均 `reproduced` |
| `pnpm run m0:feasibility` | 通过；结论 `passed` |
| Markdown 本地链接检查 | 通过 |
| `git diff --check` | 通过 |

## 已知限制

- 19 条公开候选仍未迁移为正式案例；来源最终批准、复现确认和正式 case 迁移仍需人工环节。
- M0 可行性实验由本地脚本产生，不是 M1 可信 Docker Runner，也不生成最终 Evidence Manifest。
- 浏览器验证、Git Diff 风险检查、轻量硬编码检测和完整报告链路属于 M2/M3，不属于 M0。
- M1 仍必须真实实现隔离执行，并通过威胁模型中的 ISO-01 至 ISO-14 烟测；不能把 M0 脚本视为安全 Runner。

## 进入 M1 的条件

M1 必须严格使用 M0 固定的边界：

- 只接收 [support-matrix.md](../support-matrix.md) 与 [m1-runner-input-spec.md](../m1-runner-input-spec.md) 支持的 Node.js 项目。
- 不挂载 Docker Socket、宿主个人目录、SSH Key、真实 `.env`、Cookie、私有凭据或控制面密钥。
- 先实现 RunnerProfile 与 CLI 契约，再实现容器生命周期、资源/网络/权限限制和结构化运行记录。
- 不开发 GitHub App、完整 Web、浏览器验证器或大模型判断。
