# VeriCrate Agent Rules

## 使命与当前范围

VeriCrate 独立运行并验收 AI 编程 Agent 的交付，以确定性证据证明需求是否实现。当前公开版本已完成 M3 本地 MVP，并明确停止在 M3；未经用户明确授权不得进入 M4。本地 MVP 面向 Node.js / TypeScript Web 项目、本地 Git、Docker Desktop 与 Linux 临时容器，覆盖构建、现有测试、官方 Demo 的 Playwright/API/SQLite 联合验证、Git Diff 风险检查、HTML/Markdown 报告、本地 Web 界面和 Windows x64 桌面安装版。

GitHub App、外部 Alpha、云端 Runner、大规模真实仓库兼容、账号系统和完整多项目 Web 平台尚未完成。Windows 安装包属于 M3 分发增强，当前未签名，Docker Desktop 仍是外部依赖。

## 推进规则

- 顺序固定为 M0 → M1 → M2 → M3 → M4；M3 已完成，但不得在未获用户明确授权时进入 M4。
- 不得擅自扩大 MVP；不得提前创建 Monorepo 支持、模型接入、GitHub App、外部 Alpha、云端 Runner 或完整多项目平台。
- 模型只能建议需求结构、验证计划和失败摘要；模型判断不能作为最终证据。优先使用状态码、JSON、DOM、数据库查询、退出码、文件哈希和 Git Diff。

## 安全不可突破项

从 M1 起控制面与执行面必须分离。被验收容器不得获得 Docker Socket、宿主机个人目录、SSH Key、真实 `.env`、私人凭据或不受限制的网络与计算资源。Docker 不等于绝对安全。

## 每次任务开始前

依次阅读：`AGENTS.md`、`docs/vericrate-plan.md`、`docs/threat-model.md`、`docs/support-matrix.md`、`docs/decision-log.md`、`docs/glossary.md`，以及 `docs/milestones/` 中的当前里程碑。详细计划见 `docs/vericrate-plan.md`。

## 每次任务结束时

报告修改文件、执行命令、运行测试、通过的验收项、未完成内容，以及安全或兼容性风险；同步更新 `dev_log.md`，必要时更新决策、风险和里程碑文档。不得虚构用户反馈、市场数据、案例来源或测试结果。
