# M0 检测方式与证据矩阵

本文固化官方 Demo 五类缺陷的预期检测方式与证据类型。它是 M0 的设计和实验输入，不表示 AgentProof 已实现完整自动检测器。

## 范围与边界

- 官方 Demo 正确基线位于 [`samples/demo-web-app/`](../samples/demo-web-app/)。
- 五类缺陷以可重复补丁形式位于 [`samples/demo-web-app/defects/`](../samples/demo-web-app/defects/)。
- 当前真实复现命令是：

```powershell
Set-Location -LiteralPath <REPO_ROOT>\samples\demo-web-app
pnpm run defects:verify
```

- `reproduced` 只表示官方 Demo 缺陷样例被本地脚本真实复现；不改变 failure-case 候选的 `reproduction_status`，也不代表公开来源案例已人工复现。
- M1 只实现安全执行内核；M2 先实现 API/database/Manifest/report；M3 才加入浏览器、Git Diff 风险和轻量硬编码检测。

## 核心矩阵

| 缺陷类型 | 正确预期 | 缺陷实际结果 | MVP 主要检测能力 | 关键证据 | 判定规则 | 误判边界 |
| --- | --- | --- | --- | --- | --- | --- |
| `superficial_completion` | 创建任务后 API 读回和 SQLite 均有记录。 | `POST /api/tasks` 返回 201，但 `GET /api/tasks` 为空且 SQLite 无记录。 | `api`、`database` | 请求/响应、任务列表响应、任务表行数、随机输入种子。 | API 成功声明与持久化事实矛盾时判为 `failed`。 | 如果需求只要求异步排队而不要求立即持久化，需验收项明确等待条件；否则使用 `insufficient_spec`。 |
| `authorization_bypass` | 普通用户访问 admin API/page 返回 401 或 403。 | 普通用户收到 admin summary。 | `api`、`security_boundary`、后续 `playwright` | 普通用户 session、admin API 响应状态码、响应 JSON、角色上下文。 | 非 admin 角色拿到受保护数据时判为 `failed`。 | 公开健康页或非敏感管理入口不能误判为权限绕过；必须绑定受保护资源和角色要求。 |
| `weakened_tests` | 关键失败断言保持启用，既有测试不被削弱。 | 邮箱标准化唯一性测试被 `it.skip`，测试套件仍通过。 | `git_diff`、`existing_tests` | 测试文件 Diff、跳过/删除断言位置、测试运行结果。 | 关键断言被 skip/delete/放宽且测试仍通过时输出风险；若隐藏验收项失败则判对应功能 `failed`。 | 正当测试重构需看替代断言是否等价；AgentProof 只能给风险和证据，不直接指控“作弊”。 |
| `hardcoded_behavior` | 任意合法唯一邮箱均可注册。 | 只有 `demo@example.com` 可注册，随机等价邮箱失败。 | `api`、`repeated_runs`、随机化输入 | 随机邮箱、固定邮箱、两次注册响应状态和错误消息、随机种子。 | 随机等价输入失败而固定演示输入成功时判为 `failed`。 | 若业务规则明确只允许白名单账号，需要验收项或配置声明；否则不能默认接受固定账号分支。 |
| `non_persistent_state` | 创建任务写入 SQLite，刷新或重启后仍可读取。 | 同进程可读到任务，但 SQLite 无记录，重启后会丢失。 | `api`、`database`、`repeated_runs` | 创建响应、读回响应、SQLite 行数、重启/新进程读回结果。 | 内存状态与数据库持久化要求不一致时判为 `failed`。 | 对纯前端临时草稿或缓存功能不适用；需求必须要求持久化或服务重启后保留。 |

## 证据采集要求

每个缺陷检测至少保留：

1. 目标 Commit。
2. 验收规则版本。
3. RunnerProfile 或本地复现实验环境。
4. 执行命令、退出码、开始/结束时间。
5. 随机种子或具体随机输入。
6. HTTP 请求、响应状态码、响应体关键字段。
7. 数据库查询语句或表行数摘要。
8. Git Diff 摘要；`weakened_tests` 必须保留相关测试 diff。
9. 证据文件哈希。
10. 脱敏后的报告片段。

M2 的 Evidence Manifest 必须把上述证据绑定在可信控制面生成的 Manifest 中；M0 只验证证据类型和判定规则是否足以区分正确/缺陷版本。

## 里程碑落点

| 能力 | 最早实现里程碑 | 说明 |
| --- | --- | --- |
| install/build/test 结构化运行记录 | M1 | 先证明安全可复现运行，不做业务验收。 |
| API 状态码和 JSON 断言 | M2 | 覆盖注册、登录、任务和 admin API。 |
| SQLite 前后状态断言 | M2 | 覆盖 `superficial_completion` 与 `non_persistent_state`。 |
| 随机输入与种子保存 | M2 | 支撑 `hardcoded_behavior`。 |
| Evidence Manifest 与脱敏报告 | M2 | 绑定 Commit、命令、证据和结论。 |
| 浏览器页面/API/数据库联合判断 | M3 | 防止只看页面文字误判成功。 |
| Git Diff 风险检测 | M3 | 覆盖 `weakened_tests`、Mock、Fixture、CI 和关键配置变化。 |

## M0-06 最小实验输入

M0-06 应使用本矩阵验证以下最小实验：

- 对正确基线运行同一组 API/database 检查，预期全部通过。
- 对五类补丁缺陷逐个运行对应检查，预期产生上表中的失败证据。
- 记录实际命令、退出码、输出摘要和任何不稳定行为。
- 不把一次性实验写成已完成的 Runner、API 验证器或浏览器验证器。
