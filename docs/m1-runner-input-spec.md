# M1 Runner 输入规范

本规范是 M0-07 的输出，用于限定 M1 只实现安全、可复现、可记录证据的最小 Runner 输入面。它不是正式 Runner 实现，也不承诺支持未列明的项目类型。

## 目标

M1 Runner 只接收能够在受控临时 Linux 容器中非交互执行的 Node.js Web 项目，并输出可审计的运行记录。输入必须足够明确，使控制面不需要猜测如何安装、构建、测试、启动、访问服务或注入配置。

M1 的成功标准是安全执行内核可用：固定目标 Commit、创建隔离执行环境、运行显式命令、限制资源和网络、采集 stdout/stderr 与基础运行证据、受控清理临时资源。

## 接受范围

| 维度 | M1 接受条件 |
| --- | --- |
| 语言/运行时 | Node.js 20 LTS；补丁版本由 Runner 镜像或 RunnerProfile 固定。 |
| 包管理器 | npm + `package-lock.json`；或 pnpm + `pnpm-lock.yaml` 且 `package.json` 固定 `packageManager`。 |
| 项目结构 | 单仓库、单主要服务、单工作目录。 |
| 命令 | install、build、test、start 均必须为非交互、可超时、可记录退出码的显式命令。 |
| 服务 | HTTP 服务必须声明端口和健康检查。 |
| 数据 | SQLite 仅可位于临时工作区；允许测试数据库和一次性种子数据。 |
| 环境变量 | 只注入 RunnerProfile 明确白名单中的非敏感键或控制面生成的短期测试值。 |
| 网络 | 默认拒绝出站；依赖安装阶段如需网络，必须由控制面使用受限依赖源策略。 |
| 文件系统 | 只挂载目标仓库临时副本、只读验收规则和控制面管理的证据采集通道。 |

## 明确拒绝

M1 不接收以下输入。遇到这些条件时应返回结构化拒绝或 `unverifiable`，不得自动放宽边界。

- 缺失 lockfile 或 lockfile 与声明包管理器不一致。
- 需要 Docker Socket、宿主个人目录、SSH Key、真实 `.env`、真实 Git/npm/cloud 凭据。
- 需要私有 registry Token、生产数据库、生产外部服务或用户真实 Cookie。
- 需要 Docker Compose、多服务编排、host network、privileged、宿主设备或管理员权限。
- 需要交互式安装、人工输入、无限制网络、无限制 CPU/内存/磁盘/日志。
- 工作目录路径逃逸仓库根目录，或命令试图直接操作宿主路径。
- 仅支持 Windows 图形界面、桌面应用、移动应用或非 HTTP 关键路径。

## RunnerProfile 字段

RunnerProfile 是 M1 控制面接收的显式输入合同。M1 可以先用 JSON 文件实现，后续 M2/M3 再把它纳入领域 Schema。

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `schema_version` | 是 | RunnerProfile Schema 版本，例如 `1.0.0-m1`。 |
| `repo_path` | 是 | 本地目标仓库路径；控制面复制到临时执行目录，不能直接在原目录运行不可信命令。 |
| `commit` | 是 | 目标 Git Commit；Runner 必须记录并验证工作树状态。 |
| `image` | 是 | Docker 镜像引用；M1 可先接受标签并在运行记录中保存 digest，后续门禁需固定 digest。 |
| `workdir` | 是 | 仓库内相对工作目录，不能包含路径逃逸。 |
| `node_version` | 是 | 只允许 M1 支持矩阵内版本，首版为 Node.js 20。 |
| `package_manager` | 是 | `npm` 或有条件支持的 `pnpm`；必须与 lockfile 一致。 |
| `commands.install` | 是 | 可复现安装命令，例如 `npm ci` 或 `pnpm install --frozen-lockfile`。 |
| `commands.build` | 是 | 构建或类型检查命令；没有构建步骤时必须显式说明并由规则接受。 |
| `commands.test` | 是 | 自动测试命令；可以为空数组但必须显式记录原因。 |
| `commands.start` | 是 | 启动 HTTP 服务的命令。 |
| `healthcheck` | 是 | HTTP 方法、路径、期望状态码、超时和重试次数。 |
| `port` | 是 | 容器内服务端口；不得依赖随机猜测。 |
| `env_allowlist` | 是 | 可注入环境变量键名和来源类型；禁止真实敏感值直接进入配置文件。 |
| `resource_limits` | 是 | CPU、内存、PID、磁盘、文件数、日志大小和命令超时。 |
| `network_policy` | 是 | 默认拒绝；如需依赖安装网络，必须标明阶段和允许目标。 |
| `mount_policy` | 是 | 明确禁止 Docker Socket、宿主 home、SSH、真实 env、可写规则目录。 |
| `evidence_policy` | 是 | stdout/stderr、退出码、版本、日志大小、哈希、脱敏和保留策略。 |

## 示例

```json
{
  "schema_version": "1.0.0-m1",
  "repo_path": "samples/demo-web-app",
  "commit": "HEAD",
  "image": "node:20-bookworm",
  "workdir": ".",
  "node_version": "20",
  "package_manager": "pnpm",
  "commands": {
    "install": "pnpm install --frozen-lockfile",
    "build": "pnpm run prisma:generate && pnpm run build",
    "test": "pnpm test",
    "start": "pnpm start"
  },
  "healthcheck": {
    "method": "GET",
    "path": "/health",
    "expected_status": 200,
    "timeout_ms": 1000,
    "retries": 20
  },
  "port": 3000,
  "env_allowlist": [
    { "name": "NODE_ENV", "source": "runner", "value": "test" },
    { "name": "PORT", "source": "runner", "value": "3000" },
    { "name": "DATABASE_URL", "source": "temporary_file" }
  ],
  "resource_limits": {
    "cpu": "2",
    "memory_mb": 2048,
    "pids": 512,
    "disk_mb": 2048,
    "file_count": 20000,
    "stdout_stderr_mb": 20,
    "command_timeout_ms": 600000,
    "service_start_timeout_ms": 30000
  },
  "network_policy": {
    "default": "deny",
    "install_phase": "restricted_dependency_sources"
  },
  "mount_policy": {
    "docker_socket": "forbidden",
    "host_home": "forbidden",
    "ssh_keys": "forbidden",
    "real_env_files": "forbidden",
    "rules": "read_only",
    "workspace": "temporary_copy"
  },
  "evidence_policy": {
    "capture_stdout_stderr": true,
    "hash_outputs": true,
    "redact_secrets": true,
    "treat_target_outputs_as_untrusted": true
  }
}
```

## 自动识别与不得猜测

M1 可以从 `package.json`、lockfile、`packageManager`、标准 scripts、`PORT` 和 README 中生成建议，但最终执行必须落到 RunnerProfile。缺失字段不得靠启发式猜测。

允许自动建议：

- 包管理器与 lockfile 是否匹配。
- `build`、`test`、`start` script 是否存在。
- README 中是否声明端口或数据库初始化命令。

禁止自动猜测：

- 私有 registry Token、真实 `.env`、生产数据库 URL。
- Docker Socket、宿主目录、SSH Key 或用户 Cookie。
- 未声明的外部服务、管理员权限、host network。
- 多服务启动顺序、未固定端口或交互式安装答案。

## 运行记录

每次 Runner 执行至少产生结构化运行记录：

- 目标 Commit、RunnerProfile 哈希、基础镜像 digest、Node/包管理器版本。
- 工作树清洁状态、临时执行目录、规则版本和随机种子。
- 每条命令、开始/结束时间、退出码、超时状态、stdout/stderr 摘要和哈希。
- 资源限制、网络策略、挂载策略、容器用户和 capabilities 摘要。
- 服务健康检查结果、端口、HTTP 状态码和失败原因。
- 清理结果、残留资源、证据文件哈希和脱敏状态。

状态枚举应至少包含：`passed`、`failed`、`infrastructure_error`、`unverifiable`、`rejected_by_policy`、`timeout`、`cancelled`。

## M1/M2/M3 边界

- M1：只实现安全执行、命令运行、服务启动、健康检查、基础证据和隔离烟测。
- M2：在 M1 之上加入验收 Manifest、API/数据库规则、报告和结构化需求输入。
- M3：在 M2 之上加入 Playwright 浏览器验证、Git Diff 风险检查、轻量硬编码检测和综合本地 MVP 闭环。

M1 不负责判断业务是否“完成”，只负责可信地运行目标项目并产出后续验证器可消费的基础证据。
