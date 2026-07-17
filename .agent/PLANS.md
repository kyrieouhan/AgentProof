# VeriCrate M0 内部计划

## 当前计划状态

- 当前里程碑：M3 completed
- 当前主线：浏览器步骤 Schema → 单流程 Playwright 执行 → 页面/API/数据库联合断言 → 测试 Diff 风险 → 随机化硬编码检测 → 3 次一致性 → 最小本地 Web 入口
- 最新基线 Commit：见当前文件所在提交
- 当前状态：M3 最小本地 Web 入口已补齐；停止等待用户授权 M4

## 任务列表

| 编号 | 目标 | 依赖 | 预计修改文件 | 验证命令 | 完成条件 | 当前状态 |
| --- | --- | --- | --- | --- | --- | --- |
| M0-04A | 建立自主执行状态文件 | 已读仓库真实状态 | `docs/autonomous-execution.md`、`docs/execution-status.md`、`.agent/PLANS.md`、`dev_log.md` | `git diff --check` | 状态文件存在且能指向下一项任务 | completed |
| M0-04B | 创建五类官方缺陷样例 | Demo 正确基线 | `samples/demo-web-app/` 下缺陷补丁/fixtures/说明与验证脚本 | `pnpm run defects:verify`、Demo 测试、`git diff --check` | 五类缺陷均有真实复现结果和检测方法 | completed |
| M0-05 | 定义预期检测方式与证据矩阵 | M0-04B | `docs/m0-detection-evidence-matrix.md` | Markdown 链接与一致性检查 | 每类缺陷有证据类型、MVP 能力和误判边界 | completed |
| M0-06 | 最小检测可行性实验 | M0-04B、M0-05 | `samples/demo-web-app/scripts/run-m0-feasibility.mjs`、`artifacts/m0-feasibility/` | `pnpm run m0:feasibility` | API、数据库、Diff、刷新/重启、权限上下文至少覆盖核心路径 | completed |
| M0-07 | Runner 输入规范与安全/支持评审 | M0-06、现有威胁模型/支持矩阵 | M1 输入规范、M0 文档更新 | 文档一致性和安全边界检查 | M1 可接收项目、命令、资源、网络和环境字段固定 | completed |
| M0-08 | M0 退出门禁审计 | M0-04 至 M0-07 | M0 门禁报告、`docs/execution-status.md`、`dev_log.md` | 全部 M0 验证命令 | 证明 M0 可进入 M1，或记录未通过项并留在 M0 | completed |

## 当前 M0-04B 设计约束

- 不使用复杂前端框架。
- 不创建 GitHub App，不进入 M1 Runner。
- 不迁移正式 `datasets/failure-cases/cases/`。
- 不设置 `approved`、`source_verified`、`reproduced`。
- 五类缺陷至少覆盖：
  - `superficial_completion`
  - `authorization_bypass`
  - `weakened_tests`
  - `hardcoded_behavior`
  - `non_persistent_state`

## 下一步

M3 已完成并停止。下一步只能在用户明确授权后进入 M4；不得自动开发 GitHub App、完整多项目 Web 平台、外部 Alpha 或 M4 能力。

## M1 任务列表

| 编号 | 目标 | 依赖 | 预计修改文件 | 验证命令 | 完成条件 | 当前状态 |
| --- | --- | --- | --- | --- | --- | --- |
| M1-01 | RunnerProfile 与 CLI 契约 | M0-08 | `package.json`、`bin/`、`src/`、`schemas/`、Demo profile、测试与文档 | `npm run lint`、`npm run profile:validate`、`npm test` | CLI 可校验官方 Demo RunnerProfile，并拒绝关键越界/放宽安全策略 | completed |
| M1-02A | Docker 前置诊断 | M1-01 | CLI docker check、预检测试、状态文档 | `npm run lint`、`npm test`、`npm run docker:check` | Docker CLI/Engine 缺失能被结构化记录为 `infrastructure_error` | completed |
| M1-02B | 容器生命周期与最小挂载 | M1-02A + 可用 Docker CLI/Engine | Runner 控制面、临时目录、容器创建/销毁、最小挂载 | `npm run smoke:docker` | 能创建临时执行环境并清理；不挂载 Docker Socket/宿主 home/真实 env | completed |
| M1-03 | 资源/网络/权限策略 | M1-02B | Runner 策略与烟测 | `npm run smoke:docker` | 非 root、无特权、资源/网络限制可观测 | completed |
| M1-04 | install/build/test 结构化记录 | M1-02B | 命令执行与 run record | Demo profile run | 记录退出码、耗时、stdout/stderr 摘要和失败分类 | completed |
| M1-05 | 取消、超时、清理与诊断 | M1-02B | 超时/取消/清理逻辑 | timeout/cancel tests | 超时与失败可清理、可诊断 | completed |
| M1-06 | 3 个样例与 10 次重复测试 | M1-04 | 样例与重复运行脚本 | repeatability test | 支持矩阵内样例可重复运行 | completed |
| M1-07 | 14 项隔离烟测与安全评审 | M1-03 至 M1-05 | ISO smoke tests 与报告 | ISO-01..ISO-14 | 隔离烟测全部通过并记录证据 | completed |

## M2 任务列表

| 编号 | 目标 | 依赖 | 预计修改文件 | 验证命令 | 完成条件 | 当前状态 |
| --- | --- | --- | --- | --- | --- | --- |
| M2-01 | 领域模型、状态与 Zod Schema | M1 exit review | `src/domain/`、`schemas/`、测试与文档 | schema/unit tests | 领域对象、六个底层状态和四个合并建议有单一事实来源并可生成 JSON Schema | completed |
| M2-02 | 验收项编辑/确认/版本 | M2-01 | 验收项存储与版本模型 | unit tests | 验收项可保存独立版本并保留用户确认边界 | completed |
| M2-03 | API 与数据库断言 | M2-01 | API 验证器、SQLite 检查 | integration tests | 状态码、JSON、响应头、错误信息和数据库前后状态可验证 | completed |
| M2-04 | 随机数据与种子 | M2-03 | seed/test-data helpers | repeat tests | 随机化测试数据可重放 | completed |
| M2-05 | 证据采集、Manifest 与脱敏 | M2-03 | manifest、hash、redaction | unit/integration tests | Manifest 绑定 Commit/规则/镜像/命令/种子/证据哈希，敏感字段脱敏 | completed |
| M2-06 | HTML/Markdown 报告与聚合 | M2-05 | report renderer、aggregation | snapshot/unit tests | 六状态和四建议按 glossary 聚合，不使用总分 | completed |
| M2-07 | Demo 五类需求端到端回归与安全复审 | M2-06 | Demo regression scripts、M2 exit docs | e2e regression | 官方 Demo 正确/缺陷路径进入自动回归，M2 门禁可审计 | completed |

## M3 任务列表

| 编号 | 目标 | 依赖 | 预计修改文件 | 验证命令 | 完成条件 | 当前状态 |
| --- | --- | --- | --- | --- | --- | --- |
| M3-01 | 浏览器步骤 Schema 与单流程执行 | M2 exit review | browser step schema、single-flow runner | unit/smoke tests | 可执行一条官方 Demo 关键 Playwright 流程 | completed |
| M3-02 | 截图/网络/控制台/Trace 采集和脱敏 | M3-01 | browser evidence capture | smoke tests | 失败证据可采集且敏感内容最小化 | completed |
| M3-03 | 页面/API/数据库联合断言 | M3-01 + M2 assertions | browser/API/db join checks | integration tests | 页面状态与 API/数据库证据一致 | completed |
| M3-04 | 测试与配置 Diff 风险模型 | M2 report | diff risk model | unit tests | 输出具体风险和 Diff，不直接指控作弊 | completed |
| M3-05 | 只读规则与随机化硬编码检测 | M3-03 | readonly rules、randomized reruns | repeat tests | 固定账号/ID/输入风险可被轻量发现 | completed |
| M3-06 | 官方 Demo 缺陷回归、3 次一致性与内部可用性检查 | M3-05 | M3 regression artifacts、exit docs | e2e regression | 官方缺陷稳定发现，正确版本不误判，M3 可审计 | completed |
| M3-07 | 最小本地 Web 用户入口 | M3-06 + existing CLI/Runner/domain modules | `src/web/`、Web smoke、README 和状态文档 | `npm run m3:web-smoke` | 用户可从浏览器导入官方 Demo、确认验收项、发起真实验收、查看证据并导出报告 | completed |
