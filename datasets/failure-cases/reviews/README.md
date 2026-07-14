# M0-03 候选审核建议

本目录保存 Codex 对公开失败候选的来源核查、分类边界、去重、隐私、复现信息质量和 AgentProof 首版范围建议。它是等待人工确认的审核辅助材料，不是最终人工审核记录；不会把任何候选改成 `source_verified`、`approved` 或 `reproduced`。

汇总见 [`review-summary.json`](review-summary.json)，逐条记录位于 `records/candidate-NNNN-review.json`。每份记录与 [`../candidates/records/`](../candidates/README.md) 中同编号候选一一对应。结构分别由 [`review-record-schema.json`](review-record-schema.json) 和 [`review-summary-schema.json`](review-summary-schema.json) 约束。

## 核查边界

- `verified_match` 只表示 Codex 能打开公开页面，且页面正文支持候选的核心失败事实；它不等于数据集字段 `source_verified`。
- `verified_partial` 表示核心现象有依据，但候选中的因果、范围或根因只有部分支持。
- `duplicate_source` 表示维护者或来源明确指向另一条原始记录。
- `out_of_scope` 表示页面真实且摘要基本准确，但现象不属于 AI 编程 Agent 的代码交付失败。
- `unverifiable_access`、`unverifiable_content`、`mismatch` 和 `privacy_or_license_risk` 保留为固定枚举。
- GitHub Issue/PR 位于公开仓库不代表维护者已经确认报告、根因或严重度。

## 记录字段

每条记录使用 `review_schema_version=1.0.0`，至少包含：

- 来源可访问性、核查结果、核查 URL、日期、Issue/PR 状态；
- 来源事实摘要、未被来源直接支持的主张；
- 建议主分类、建议次分类、分类调整原因；
- 去重结果、可能重复编号；
- 隐私发现、是否需要脱敏；
- 复现信息质量、建议严重度、缺失信息；
- 建议动作、A/B/C 分组、人工确认门禁；
- AgentProof 范围判断：`agentproof_scope`、`detectable_by_mvp`、`applicable_mvp_capabilities`、交付产物和完成声明是否涉及、范围理由、最终范围建议。

`recommended_action` 只使用：

- `accept_for_manual_review`
- `needs_correction`
- `needs_more_evidence`
- `merge_with_candidate`
- `reject_duplicate`
- `reject_out_of_scope`
- `reject_unverifiable`
- `reject_privacy_or_license_risk`

复现信息质量只使用 `strong`、`medium`、`weak`、`not_applicable`、`unknown`。即使为 `strong`，也只表示来源材料较完整，不表示 AgentProof 已真实复现。

## A/B/C 分组

- A 组：建议进入最终人工审核或人工研究确认；当前 29 条。
- B 组：需要补充证据或修正主来源；当前 4 条。
- C 组：建议排除范围外或合并重复候选；当前 6 条。

这些分组是 Codex 建议。人工可以保留、调整或拒绝，但必须记录理由，并继续执行 [`../review-checklist.md`](../review-checklist.md)。

## 严格范围审计

范围审计见 [`scope-audit.json`](scope-audit.json)。它把来源质量分组和 AgentProof 首版 MVP 范围分开记录：

- `core_in_scope`：建议保留给最终人工审核，仍需人工确认来源、许可、去重、脱敏和复现状态；当前 19 条。
- `secondary_research`：对 Agent 或工具可靠性研究有价值，但不计入 M0 的 20 个正式案例门槛；当前 8 条。
- `out_of_scope`：默认排除于首版正式案例池，除非后续有新证据证明它直接造成 Agent 错误交付且可由 AgentProof 验证；当前 12 条。

本轮严格范围口径对 M0-03 补充审核作出以下调整：

- `candidate-0031`–`candidate-0034`：仍建议作为 `weakened_tests` 核心案例进入最终人工审核。
- `candidate-0035`：降为 `secondary_research`。来源能够证明工作流把目标分支硬编码为 `main`，但不足以证明这段工作流本身是 AI 编程 Agent 对目标项目生成的交付物；完整验证还依赖 GitHub 默认分支 API、PR 创建流程或远程 GitHub Actions 环境。
- `candidate-0036`–`candidate-0037`：仍建议作为 `hardcoded_behavior` 核心案例进入最终人工审核。
- `candidate-0038`–`candidate-0039`：仍建议作为 `build_runtime_mismatch` 核心案例进入最终人工审核。

严格修正后，核心范围候选为 19 条，距离 M0 的 20 条核心候选门禁还差 1 条。正式 `cases/` 仍不得迁移；之后只补实际缺少的 1 条真实核心候选，不继续大批量搜索。

范围审计没有把任何候选设置为 `approved`、`reproduced` 或 `source_verified`，也没有把候选迁移到正式 `cases/`。

## 去重结论

- `candidate-0017` 的维护者评论明确将该 Issue 关闭为外部 Issue `#2901` 的重复来源；需要人工打开 `#2901` 并决定是否改用它作为主来源。
- `candidate-0026` 与 `candidate-0029` 都涉及 GitHub Copilot Remote SSH 文件工具。建议保留 `candidate-0029` 为主候选，把 `candidate-0026` 作为补充来源；最终合并仍需人工确认。
- `candidate-0031` 至 `candidate-0039` 当前没有发现与既有候选重复的 URL 或同事件信号。

## 人工下一步

下一步只能补充 1 条真实核心候选，或由人工确认是否接受 19 条核心候选的阶段性状态。补齐并完成最终人工确认前，不得迁移正式 `cases/`，不得声称已完成正式人工批准或真实复现。
