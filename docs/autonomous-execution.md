# AgentProof 自主执行规则

本文记录 AgentProof 在 M0-M3 的自主推进规则。它是恢复上下文和判断下一步工作的运行手册，不替代 [AGENTS.md](../AGENTS.md)、[agentproof-plan.md](agentproof-plan.md) 或各里程碑文档。

## 自主执行范围

- 当前目标是完成 M0 剩余工作，然后在门禁通过后自动进入 M1、M2、M3。
- M3 是本地 MVP 完成点；M3 门禁通过后生成最终报告并停止。
- 不进入 M4，不创建 GitHub App，不推送远程仓库，不公开发布。
- 不主动搜索新的 failure-case 候选；19 条核心候选是 M0 数量门禁例外，真实统计不得伪造成 20。

## 文件和事实优先级

发生冲突时按以下顺序判断：

1. Git 中的真实代码、Commit、Diff 和测试结果。
2. [AGENTS.md](../AGENTS.md)。
3. [docs/milestones/](milestones/)。
4. [docs/decision-log.md](decision-log.md)。
5. [docs/agentproof-plan.md](agentproof-plan.md)。
6. [dev_log.md](../dev_log.md)。
7. 会话中的用户目标文件或历史对话。

不得只根据文档名或计划文字宣称功能已完成；必须结合源码、自动化测试和真实运行结果。

## 可以自主决定的事项

- 在当前里程碑范围内拆分小任务、实现、测试、修复、更新文档并创建清晰 Commit。
- 对普通编译错误、类型错误、依赖冲突、测试失败、局部设计问题和可控环境问题做最小修复。
- 省略与当前门禁无关的 P2 内容，例如重复文档、纯格式整理、过度抽象、复杂视觉装饰和提前实现后续里程碑能力。
- 在 M0 完成后自动进入 M1；M1 完成后自动进入 M2；M2 完成后自动进入 M3。

## 必须暂停的事项

- 需要修改 AgentProof 核心定位或明显扩大/缩小本地 MVP 范围。
- 需要降低安全隔离标准。
- 需要账号、API Key、信用卡、付费服务、GitHub App、OAuth、Webhook、域名或云服务。
- 需要 push、公开发布或上传代码。
- 需要删除大量现有代码或重写主要架构，且存在明显不可逆风险。
- 存在无法安全隔离的用户未提交修改。
- 关键里程碑门禁连续修复后仍无法通过。
- 需要真实用户、外部仓库、人工审批、法律判断或许可证授权。

## 测试和提交规则

- 一个清晰任务对应一个 Commit。
- Commit 前检查 `git status --short`、相关 diff、相关测试和 `git diff --check`。
- 不使用 `git add .` 盲目提交；只暂存任务相关文件。
- 不使用 `git reset --hard`、不重写历史、不配置远程、不 push。
- LF→CRLF 警告可以记录，但 `git diff --check` 必须真实通过。
- 不通过删除测试、放宽断言或跳过关键检查制造通过。

## 安全边界

- Docker 不是绝对安全边界。
- M1 起控制面与执行面必须分离。
- 被验收容器不得获得 Docker Socket、宿主个人目录、SSH Key、真实 `.env`、私人凭据或不受限制的网络与资源。
- Manifest 必须由可信控制面生成，并绑定 Commit、镜像、RunnerProfile、命令、退出码、随机种子和证据哈希。
- Token、Cookie、密码、个人数据和敏感数据库字段必须脱敏。

## 里程碑自动推进规则

- M0 通过后进入 M1：必须已有官方 Demo 正确/缺陷样例、检测可行性实验、M1 输入规范、安全/支持评审和 M0 门禁报告。
- M1 通过后进入 M2：必须完成安全 CLI Runner、3 个样例、10 次一致性、隔离烟测和 M1 门禁报告。
- M2 通过后进入 M3：必须完成 API-first 验收闭环、Manifest、脱敏、报告和 Demo API 回归。
- M3 通过后停止：必须完成本地 Web MVP、官方缺陷回归、3 次一致性、报告导出、安装使用说明和最终门禁报告。

## 非关键任务省略原则

主线优先，不追求形式完整。当前阶段可以省略：

- 与当前门禁无关的重构。
- 多套同功能实现。
- 复杂动画、视觉装饰和完整 SaaS 体验。
- Post-MVP、M4 或云端能力。
- 无意义的测试数量。

省略项只在阶段报告中简要记录，不作为当前阻塞。

## 会话中断恢复规则

恢复时先读取：

1. [AGENTS.md](../AGENTS.md)
2. 本文件
3. [docs/execution-status.md](execution-status.md)
4. [.agent/PLANS.md](../.agent/PLANS.md)
5. [dev_log.md](../dev_log.md)
6. `git status --short`
7. `git log --oneline -20`

然后从 `docs/execution-status.md` 的“下一项任务”和 `.agent/PLANS.md` 的当前计划继续。上下文即将耗尽时，只提交已经完整完成且验证通过的内容，不把半成品标记为完成。
