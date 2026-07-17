# 术语与统一状态

本文件是 VeriCrate 文档中结果状态和合并建议的规范来源。其他文档不得创建同义状态。

## 核心术语

| 术语 | 定义 |
| --- | --- |
| 验收项（Acceptance Criterion） | 从需求中得到、经用户确认、可版本化的逐项预期行为。 |
| 验证运行（Verification Run） | 针对固定 Commit、规则版本和环境执行的一次完整验收。 |
| 确定性证据 | 状态码、JSON、DOM、数据库查询、退出码、文件哈希、Git Diff 等可程序化判断的证据。 |
| 证据 Manifest | 由可信控制面生成，将 Commit、规则版本、环境、镜像摘要、命令、随机种子和证据哈希绑定的记录。 |
| 控制面 | 可信的任务编排、策略、证据签名和容器生命周期管理部分。 |
| 执行面 | 运行被验收仓库及依赖的受限、临时环境。 |
| 官方 Demo | 长期回归基准，包含正确版本与可稳定复现的已知缺陷版本。 |
| 阻断级安全问题 | 会导致凭据、宿主机、隔离边界或证据可信性受到不可接受影响的问题；其结论覆盖普通完成度。 |
| 失败案例（Failure Case） | 对编程 Agent 交付失败的来源、根因、触发条件、复现和预期证据所作的可审核记录。规范见 [failure-cases/README.md](../datasets/failure-cases/README.md)。 |
| 主分类（Primary Category） | 最直接决定失败案例触发条件和预期检测方法的一个分类。 |
| 次分类（Secondary Category） | 同一案例中独立成立的其他失败维度；可以有多个，但不得与主分类重复。 |

## 底层结果状态

| 状态 | 含义 | 处理规则 |
| --- | --- | --- |
| `passed` | 验收条件由所需证据证明通过。 | 只对已执行且证据充分的验收项使用。 |
| `failed` | 功能行为或验收条件失败。 | 不用于基础设施或运行环境故障。 |
| `insufficient_spec` | 需求描述不足，无法形成可执行且无歧义的断言。 | 明确列出需要补充的信息，不得猜测。 |
| `infrastructure_error` | 基础设施、容器、网络、依赖获取或运行环境错误。 | 不能算成功能失败，也不能算通过。 |
| `unverifiable` | 当前能力、权限或证据条件无法验证该项。 | 必须显式显示原因，不得悄悄忽略。 |
| `unstable` | 重复执行的核心结论不一致。 | 保存种子、环境版本和 Trace；需要人工或进一步诊断。 |

## 最终合并建议

| 建议 | 含义 |
| --- | --- |
| `recommend_merge` | 已验证的阻断项通过，且没有阻断级安全问题或未解决的关键不确定性。 |
| `do_not_merge` | 存在关键 `failed` 或阻断级安全问题。 |
| `human_review` | 需要人工判断，例如规格争议、风险变更、部分 `unverifiable` 或不稳定。 |
| `indeterminate` | 因关键 `infrastructure_error`、`insufficient_spec` 或证据缺失而无法给出判断。 |

## 聚合规则

- 不用单一模糊总分替代逐项状态、证据和风险。
- `infrastructure_error` 与 `failed` 必须分开统计。
- `unverifiable` 必须进入报告和最终建议推导。
- 阻断级安全问题优先于普通功能完成度，并通常导向 `do_not_merge`。
- 模型摘要不得改变底层状态；状态必须由确定性验证结果或明确的能力边界产生。

## 失败案例状态

失败案例状态与上面的“验证结果状态”是两个不同命名空间，不得混用。分类、状态流转和人工门禁以 [failure case 数据集规范](../datasets/failure-cases/README.md) 与 [审核清单](../datasets/failure-cases/review-checklist.md) 为准。

| 维度 | 状态 | 含义 |
| --- | --- | --- |
| 最终审核 | `draft` | 刚录入或仍需补充，尚未通过最终人工审核。 |
| 最终审核 | `rejected` | 人工确认记录无效、重复、不相关或不符合质量要求。 |
| 最终审核 | `approved` | 已通过最终人工审核；这是计入 M0 的必要条件，但不代表自动检测已经实现。 |
| 来源核实 | `source_pending` | 主来源尚未成功核实。 |
| 来源核实 | `source_verified` | 主来源已由人工核实，引用和描述相符。 |
| 复现 | `not_attempted` | 尚未尝试复现。 |
| 复现 | `steps_available` | 有复现步骤，但尚未实际执行。 |
| 复现 | `reproduced` | 已真实执行并复现目标现象。 |
| 复现 | `partially_reproduced` | 只复现部分目标现象。 |
| 复现 | `failed_to_reproduce` | 已执行但未复现目标现象。 |
| 复现 | `environment_unavailable` | 所需合法环境当前不可用。 |
| 复现 | `not_applicable` | 经人工确认无需本地复现，并已说明理由。 |

只有人工可以作出 `approved` 或 `rejected` 最终决定。`synthetic_demo` 和 `model_generated_candidate` 不计入 M0 的 20 个正式案例；模型候选不得成为 `approved`。

## 失败案例严重程度

| 严重度 | 含义 |
| --- | --- |
| `informational` | 不直接造成功能失败的观察或低风险偏差。 |
| `low` | 局部轻微影响，有清晰绕过方式。 |
| `medium` | 影响普通功能或数据质量，需要修复。 |
| `high` | 影响关键流程、重要数据或较大用户范围。 |
| `blocking` | 凭据泄漏、明显越权、数据破坏、隔离失效等必须阻断的问题。 |

严重程度与复现状态分离，并由人工最终确认；普通 UI 文案问题不得随意标为 `blocking`。
