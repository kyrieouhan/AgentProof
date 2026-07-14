# AgentProof Agent Rules

## 使命与当前范围

AgentProof 独立运行并验收 AI 编程 Agent 的交付，以确定性证据证明需求是否实现。当前处于 M0；本地 MVP 仅面向 Node.js / TypeScript Web 项目、本地 Git、Docker Desktop 与 Linux 临时容器，覆盖构建、现有测试、API-first、一条关键 Playwright 流程、基础数据库检查、Git Diff 和 HTML/Markdown 报告。

## 推进规则

- 顺序固定为 M0 → M1 → M2 → M3 → M4；未通过当前里程碑退出门禁，不得进入下一里程碑。
- 不得擅自扩大 MVP；不得提前创建业务源码、Monorepo、Runner、API、前端、模型接入、验证器或 GitHub App。
- 模型只能建议需求结构、验证计划和失败摘要；模型判断不能作为最终证据。优先使用状态码、JSON、DOM、数据库查询、退出码、文件哈希和 Git Diff。

## 安全不可突破项

从 M1 起控制面与执行面必须分离。被验收容器不得获得 Docker Socket、宿主机个人目录、SSH Key、真实 `.env`、私人凭据或不受限制的网络与计算资源。Docker 不等于绝对安全。

## 每次任务开始前

依次阅读：`AGENTS.md`、`docs/agentproof-plan.md`、`docs/threat-model.md`、`docs/support-matrix.md`、`docs/decision-log.md`、`docs/glossary.md`，以及 `docs/milestones/` 中的当前里程碑。详细计划见 `docs/agentproof-plan.md`。

## 每次任务结束时

报告修改文件、执行命令、运行测试、通过的验收项、未完成内容，以及安全或兼容性风险；同步更新 `dev_log.md`，必要时更新决策、风险和里程碑文档。不得虚构用户反馈、市场数据、案例来源或测试结果。
