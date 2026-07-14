# M0-02 公开失败案例候选池

本目录保存从公开来源发现的**待人工核实候选**。它不是正式案例库，不代表 AgentProof、项目维护者或来源发布者已经确认问题、根因、严重程度或复现结果。正式案例目录仍是 [`../cases/`](../cases/)，当前保持为空。

## 当前快照

- 收集日期：2026-07-11。
- 候选：30 条，连续编号 `candidate-0001` 至 `candidate-0030`。
- 工具：Codex、Claude Code、Aider、Cline、GitHub Copilot，各 6 条。
- 来源：全部为相应项目的官方 GitHub Issue 仓库；页面可访问不等于已经完成项目级人工核实。
- 主分类：12 种；单一工具占 20%，最大单一分类占 16.7%。
- 拒绝线索：5 条，见 [`rejected-leads.json`](rejected-leads.json)。

完整统计和记录映射见 [`index.json`](index.json)。

## 文件与标识

- `records/candidate-NNNN.json` 是 M0-02 临时候选编号，每个文件只含一条记录。
- 记录内的 `id` 使用 Schema 要求的 `fc-YYYY-NNNN` 格式，但在通过 M0-03 人工审核前同样只是预分配标识，不代表正式案例。
- 每条记录遵循 [`../schema.json`](../schema.json) 和 [`../validate.py`](../validate.py)，但 Schema 与语义校验通过不等于人工批准。
- `notes` 明确区分来源陈述、收集者推测、复现步骤可用性、重复风险和待核实问题。

## 固定候选状态

M0-02 写入的所有记录必须保持：

- `review_status=draft`；
- `primary_source.source_verification_status=source_pending`；
- `primary_source.verified=false`；
- `review.reviewer_type/reviewer_role/reviewed_at=null`；
- `reproduction.attempts=0` 且 `successful_reproductions=0`；
- 只能使用 `not_attempted` 或 `steps_available`，不得使用 `reproduced`；
- 不得使用 `approved`。

`steps_available` 只表示公开 Issue 提供了足够形成复现草案的信息，绝不表示 AgentProof 已执行复现。

## 进入候选池的门槛

收集者必须打开原始公开页面并确认：来源直接涉及编程 Agent 或代码 Agent 工具；存在清楚的失败现象；可映射到现有分类；不是单纯“不好用”的意见；没有明显重复 URL；摘要不包含个人信息、凭据或本地绝对路径；仍有后续人工审核价值。

只读页面和整理摘要属于“候选发现”，不能把 `source_pending` 改成 `source_verified`。搜索摘要、二手转述、无法打开的链接和纯功能建议不得进入 `records/`。

## 摘要边界

- `description` 与 `reproduction.actual_behavior` 只保存原始页面明确陈述的必要短摘要。
- `root_cause` 必须标为收集者初步推测，不能伪装为来源结论。
- 分类、严重度、检测方式和优先级都是候选建议，等待人工确认。
- 不复制用户名、邮箱、机器绝对路径、附件原文、长日志或大段评论。
- 公开链接只说明页面可访问，不自动证明报告准确、许可充分或问题仍存在。

## 后续人工流程

M0-03 应按 [`../review-checklist.md`](../review-checklist.md) 逐条完成：重新打开链接、核对正文和关键评论、确认来源许可、执行根因级去重、审查脱敏、决定是否需要隔离复现、修正分类和严重度。只有完成结构校验、语义校验及最终人工审核的记录，才可能成为 `approved`；候选不能由 Codex 自动批准。

本轮 Codex 审核建议已写入 [`../reviews/`](../reviews/README.md)，但所有候选仍保持 `draft/source_pending/verified=false`，等待人工最终确认。
