# Windows 安装版说明

本文件记录 AgentProof 本地 M3 MVP 的 Windows x64 桌面壳和 NSIS 安装器。该工作是 M3 分发与易用性增强，不是 M4；不包含 GitHub App、云端 Runner、账号系统或外部 Alpha。

## 桌面架构

安装版使用 Electron 作为本地桌面壳：

1. Electron 主进程创建单实例锁。
2. 初始化 AgentProof 用户数据目录。
3. 生成本次会话随机访问令牌。
4. 使用随机空闲端口启动现有 `src/web/server.mjs` 本地服务。
5. `BrowserWindow` 加载 `http://127.0.0.1:<port>`。
6. 用户关闭窗口时停止 Web Server，并终止 AgentProof 自己启动的子进程。

桌面壳不重写 Runner、CLI、验证器或报告模块；它复用现有 Web 服务、Docker Runner、M3 browser smoke、Evidence Manifest 和 HTML/Markdown 报告生成逻辑。

## Electron 安全边界

`BrowserWindow` 使用：

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- `webSecurity: true`

preload 只暴露一个最小 IPC：选择项目文件夹。renderer 不能直接访问 `fs`、`child_process`、环境变量或任意宿主文件。

桌面模式下所有 `/api/`、报告和证据接口都要求 `x-agentproof-session` 会话令牌。令牌由主进程每次启动随机生成，页面加载后从地址栏移除，不写入日志、报告、Manifest 或持久化文件。静态资源仍公开于当前本地服务，API 和证据受令牌保护。

窗口导航只允许当前本地 AgentProof 地址、`about:` 和用户点击生成的 `blob:` 报告窗口。远程 HTTP/HTTPS 链接交给系统默认浏览器；其他新窗口和跳转被拒绝。

## 子进程方案

安装版不要求系统 Node.js。安装包随应用携带受控 Node.js 运行时，用于执行 AgentProof 子脚本和官方 Demo：

- 统一由 `desktop/process-launcher.mjs` 启动。
- 打包环境优先使用 `resources/app/node_modules/node/bin/node.exe`。
- 仅在找不到便携 Node 时才回退到 `ELECTRON_RUN_AS_NODE=1`。
- `shell: false`，不拼接 shell 字符串。
- 跟踪 AgentProof 自己启动的子进程，退出时统一终止。

官方 Demo 依赖的 SQLite/Prisma 原生模块使用普通 Node ABI，不再要求 Electron ABI。后续若引入新的原生依赖，需要继续验证便携 Node 版本与打包依赖的 ABI 一致性。

## 用户数据目录

安装目录可能在 `Program Files`、C 盘或 D 盘，不能假设可写。所有运行数据写入：

```text
%LOCALAPPDATA%\AgentProof\
  runs\
  logs\
  temp\
  demo\
  config\
```

仍支持：

```powershell
$env:AGENTPROOF_DATA_DIR = "D:\AgentProofData"
```

运行报告、SQLite、截图、Trace、缓存和临时文件不得写入安装目录、`app.asar`、用户桌面或被验收项目仓库。

## 官方 Demo

官方 Demo 随安装包提供，但不在安装目录原地运行。首次启动时，桌面应用会把 `samples/demo-web-app` 复制到：

```text
%LOCALAPPDATA%\AgentProof\demo\0.1.0\
```

复制过程可重复；如果目标版本目录已存在且用户修改过，不覆盖用户副本。桌面 Web 页面中的“使用官方 Demo”使用这份可写副本。

## Docker 与浏览器依赖

Docker Desktop 不进入安装包。AgentProof 每次验收前仍执行 Docker preflight；Docker 不可用时返回 `infrastructure_error`，不能误判为目标项目失败。

浏览器验证使用本机 Chrome 或 Microsoft Edge。找不到浏览器时，用户可设置：

```powershell
$env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

本轮不捆绑 Playwright 浏览器，以控制安装包体积。

## 构建命令

```powershell
npm ci
npm run lint
npm test
npm run desktop:smoke
npm run desktop:pack
npm run desktop:dist:win
```

如果 Electron 二进制下载受网络影响，可临时使用镜像补齐本地构建依赖：

```powershell
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
node node_modules\electron\install.js
```

该命令只影响当前 shell，不写入仓库配置。

## 打包资源

安装包包含：

- Electron desktop 入口。
- `src/`、`bin/`、`scripts/` 中的现有 AgentProof 运行逻辑。
- 官方 Demo 和其运行所需依赖。
- `README.md` 与 `LICENSE`。

安装包不应包含：

- `.git`
- `tests/`
- `datasets/failure-cases/`
- 开发 artifacts
- coverage
- 原始计划文档
- 本地数据库、trace、日志和临时文件

## 安装器

NSIS 配置：

- Windows x64
- `oneClick: false`
- `perMachine: false`
- `allowToChangeInstallationDirectory: true`
- 创建桌面快捷方式
- 创建开始菜单快捷方式
- 支持卸载
- 安装结束后可选择启动 AgentProof
- 不删除用户数据目录

输出文件：

```text
dist-installer\AgentProof-Setup-0.1.0-x64.exe
```

当前安装包未签名，可能触发 Windows SmartScreen。不要提供绕过系统安全检查的脚本；用户应确认来源后再自行决定是否运行。

## 安装测试

自动化已覆盖：

- Electron 安全配置。
- 会话令牌保护 API、报告和证据接口。
- 默认/覆盖数据目录。
- 官方 Demo 复制与版本管理。
- 开发态桌面 smoke。
- `win-unpacked\AgentProof.exe --smoke`。
- 安装包存在、非空和 SHA-256 可计算。

人工安装验证建议使用包含空格的目录，例如：

```text
D:\AgentProof Test Install
```

检查：

1. 安装器允许选择目录。
2. 桌面快捷方式和开始菜单快捷方式存在。
3. 双击桌面图标能启动中文界面。
4. 能选择官方 Demo。
5. 能加载示例验收项并发起一次真实验收。
6. 能打开 HTML 报告并下载 Markdown 报告。
7. 关闭软件后没有残留 AgentProof/Electron 进程或监听端口。
8. 卸载后安装目录移除，用户数据默认保留。

## 未实现功能

- 自动更新
- 代码签名
- 自定义图标
- 托盘
- 开机启动
- macOS/Linux 安装包
- GitHub App
- 云端 Runner
- 账号系统
- 通用外部项目浏览器/API/数据库断言自动生成
