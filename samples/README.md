# Samples

此目录保存 M0 之后的官方 Demo 与兼容性样例说明。

当前已有样例：

- [`demo-web-app/`](demo-web-app/)：Node.js / TypeScript / Fastify / SQLite / Prisma 小型 Web 应用，包含正确基线和五类可重复补丁式缺陷样例。
- [`minimal-npm-api/`](minimal-npm-api/)：零外部依赖 npm HTTP 样例，用于快速验证 install/build/test 容器运行。
- [`minimal-npm-state/`](minimal-npm-state/)：零外部依赖 npm 状态样例，用于验证重复运行签名稳定性。
- [`minimal-npm-files/`](minimal-npm-files/)：零外部依赖 npm 文件清单样例，用于 M1 repeatability 的第三个稳定样例。

官方 Demo 不创建长期缺陷分支；缺陷样例通过 `demo-web-app/defects/` 中的补丁和 `pnpm run defects:verify` 临时复现。M1 repeatability 证据由根目录 `npm run m1:repeatability` 生成。
