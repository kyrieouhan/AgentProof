# M3 退出门禁审计

- 日期：2026-07-13
- 结论：M3 浏览器验证、防作弊与最小本地 Web 入口 MVP 通过退出门禁。
- 边界：本审计不进入 M4，不创建 GitHub App，不发布 Alpha，不运行外部项目，不迁移正式 `datasets/failure-cases/cases/`。

## 门禁结果

| 门禁 | 结果 | 证据 |
| --- | --- | --- |
| 官方缺陷稳定发现 | 通过 | `artifacts/m3-regression/summary.json` 中 5/5 官方缺陷均 `reproduced`。 |
| 正确版本不误判 | 通过 | `npm run m3:browser-smoke` 连续 3 次均 `passed`，每次 2 个 criterion 均通过。 |
| 3 次一致性 | 通过 | M3 regression 的 browser repeatability 为 3/3，`consistent=true`。 |
| 浏览器证据 | 通过 | `artifacts/m3-browser-smoke/` 包含 browser events、脱敏截图、joined observation、Manifest 和报告。 |
| 页面/API/数据库联合断言 | 通过 | `joined-observation.json` 显示页面、API 与 SQLite 对同一任务一致。 |
| Diff 风险模型 | 通过 | `artifacts/m3-diff-risk/summary.json` 对 weakened_tests 补丁输出 high `weakened_tests` 风险和 `human_review` 建议。 |
| 随机化硬编码检测 | 通过 | `artifacts/m3-hardcoded-randomization/summary.json` 对 hardcoded_behavior 补丁输出 human_review 风险。 |
| 隔离与基础回归 | 通过 | `npm run docker:check` 与 `npm run smoke:docker` 通过；M3 不放宽 M1/M2 安全边界。 |
| 最小本地 Web 入口 | 通过 | `npm run m3:web-smoke` 从浏览器导入官方 Demo、确认验收项、启动真实 Runner/M3 验收、打开 HTML/Markdown 报告和证据；连续 3 次均 `passed` / `recommend_merge`。 |

## 已执行验证

- `npm run schema:generate`
- `npm run lint`
- `npm test`
- `npm run docker:check`
- `npm run smoke:docker`
- `npm run m3:browser-smoke`
- `npm run m3:diff-risk`
- `npm run m3:hardcoded`
- `npm run m3:regression`
- `npm run web:dev`
- `npm run m3:web-smoke`
- JSON / Markdown 本地链接 / failure-case 禁用状态 / `cases/` 空目录 / `git diff --check`

## 风险与保留项

- Trace 支持为显式 opt-in，默认禁用；后续如果需要默认保存 Trace，必须先补更强的 Trace 脱敏和体积控制策略。
- Diff 风险与 hardcoded 检测只输出风险和证据，不直接指控作弊。
- 本地 Web 入口只监听 `127.0.0.1`，不包含账号系统、云端部署、外部 Alpha、GitHub App 或完整多项目平台。
- Docker 仍不是绝对安全边界；M4 前仍不得把不可信外部项目接入真实用户工作流。

## 下一步

停止在 M3。只有在用户明确授权进入 M4 后，才能开始 Alpha 发布、外部项目验证或 GitHub App 工作流。
