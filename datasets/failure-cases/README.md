# AgentProof Failure Case 数据集

本数据集记录可追溯、可去重、可脱敏、可复现的编程 Agent 失败案例，用于 M0 的问题与技术可行性验证。当前规范版本为 `1.0.0`；后续所有 failure case 都必须通过 [schema.json](schema.json)、[validate.py](validate.py) 和 [review-checklist.md](review-checklist.md) 三层门禁。

`cases/` 当前必须保持为空。[example.json](example.json) 是完整的合成格式示例，不是真实案例，不计入 M0 的 20 个案例门禁。

## 文件与规范来源

- [category-taxonomy.md](category-taxonomy.md)：分类定义、包含/排除条件和边界。
- [schema.json](schema.json)：JSON Schema Draft 2020-12，版本 `1.0.0`。
- [validate.py](validate.py)：只读、无网络、仅用 Python 标准库的跨字段语义校验器。
- [example.json](example.json)：明确标记的 `synthetic_demo` 示例。
- [review-checklist.md](review-checklist.md)：人工审核清单和质量门禁。
- `tests/`：隔离的正负向测试夹具与测试入口；无论夹具字段取值如何，均不得计入 M0。
- `cases/`：后续通过审核的案例文件，每个案例一个 JSON；M0-01 不创建案例。

Schema 使用 `additionalProperties: false`。未声明字段一律拒绝，避免不同案例私自扩展出不兼容语义。需要新增字段时，先修订 Schema、本文和审核清单，再迁移已有记录；每条记录必须保存 `schema_version`，破坏性变更升级主版本，兼容性扩展升级次版本。本阶段不创建迁移程序。

## 三层校验门禁

1. **JSON Schema 结构校验**：检查字段、类型、枚举、格式、长度和 Schema 可表达的条件，例如 `approved` 必须非示例、不得使用合成来源，以及 `merged` 必须有关联案例。
2. **语义跨字段校验**：运行 `validate.py`，检查计数关系、自引用、主次分类重复、路径穿越等标准 JSON Schema 难以可靠表达的规则。脚本只报告问题，不修改数据、不批准案例，也不访问网络。
3. **最终人工审核**：按 `review-checklist.md` 核实来源、许可、复现真实性、分类、严重度、去重和脱敏。自动校验全部通过仍不能自动得到 `approved`。

只有三层都通过，案例才可能由人工设置为 `approved`。结构或语义校验失败时不得进入最终批准。

```powershell
python datasets/failure-cases/validate.py datasets/failure-cases/example.json
python datasets/failure-cases/tests/run_tests.py
python datasets/failure-cases/validate.py
```

最后一条命令默认只扫描 `cases/`。校验器也接受明确给出的、位于 `datasets/failure-cases/` 内的 JSON 文件或目录；它拒绝数据集目录外输入、符号链接和越界文件，不会主动搜索仓库其他位置。

## 分类规则

每条案例必须有一个 `primary_category`，可以有多个去重后的 `secondary_categories`。主分类选择最直接决定检测方法的根因；次分类只记录确实独立存在的其他失败维度，不能与主分类重复。

正式分类及边界见 [category-taxonomy.md](category-taxonomy.md)。暂时无法判断时可以使用 `needs_review`，但它只能出现在草稿中；含 `needs_review` 的案例不能成为 `approved`。不得增加 `other` 作为长期兜底。

## 状态模型与流转

为避免把来源、复现和最终审核混成一个状态，Schema 使用三个独立字段：

| 维度 | 字段 | 状态 |
| --- | --- | --- |
| 最终审核 | `review_status` | `draft`、`rejected`、`approved` |
| 主来源核实 | `primary_source.source_verification_status` | `source_pending`、`source_verified` |
| 复现 | `reproduction_status` | `not_attempted`、`steps_available`、`reproduced`、`partially_reproduced`、`failed_to_reproduce`、`environment_unavailable`、`not_applicable` |

标准流转：

1. 新记录以 `draft` 进入，来源通常为 `source_pending`，复现通常为 `not_attempted`。
2. 人工核实主来源；成功后改为 `source_verified`，否则保持 `source_pending` 并记录核实尝试和缺口。
3. 复现从 `not_attempted` 进入 `steps_available`，实际执行后进入一个终态。存在步骤绝不等于已经复现。
4. 结构校验与语义校验通过后，人工按审核清单决定 `approved` 或 `rejected`。Codex、模型或自动脚本不得填写最终批准。
5. 被拒记录如需重新审核，先修正内容并回到 `draft`；必须保留原拒绝原因或在版本控制中可追溯。

只有 `approved` 案例才有资格计入 M0 的 20 个案例；同时还必须满足：`is_example=false`，主来源不是 `synthetic_demo` 或 `model_generated_candidate`，来源已核实，分类已确定，去重与脱敏已完成人工复核。`approved` 只说明案例记录达到数据集质量门禁，不代表 AgentProof 已自动检测该问题，也不代表所有 `approved` 记录一定计入 M0。

## 来源核实规则

`source_type` 只使用以下值：

- `public_github_issue`
- `public_bug_report`
- `public_article_or_postmortem`
- `public_forum_or_discussion`
- `project_owned_record`
- `authorized_private_report`
- `personal_experience`
- `synthetic_demo`
- `model_generated_candidate`

每个主来源和补充来源都记录标题、引用或内部编号、日期、核实状态、核实时间、核实方式、核实者角色、许可/授权说明、是否可以公开和来源材料脱敏说明。`source_reference` 可以为 `null`，但此时 `verified` 必须为 `false`，状态必须是 `source_pending`。

- 公开链接不存在、内容与描述不匹配或无法确认时，`verified=false`，不得标为 `source_verified`。
- `model_generated_candidate` 只能作为待调查线索，不能成为 `approved`，不能计入正式案例。
- `synthetic_demo` 只能测试分类、Schema 或官方 Demo，必须明确合成，不能冒充真实事故，也不能计入 20 个案例。
- `personal_experience` 必须由真实人员确认，记录人工核实角色；Codex 不得自行生成或代替确认。
- `authorized_private_report` 的公开字段只保留授权范围内的脱敏摘要；原始材料不进入 Git。
- 多个来源描述同一根因时，以一个主来源加 `additional_sources` 保存，不复制成多个案例。

## 复现规则

需要复现的案例通过 `reproduction` 记录前置条件、仓库或 Demo 版本、Commit、环境、安装命令、启动命令、操作步骤、预期行为、实际行为、执行次数、成功复现次数、随机种子、原始输出相对位置和已知限制。

| 状态 | 含义 |
| --- | --- |
| `not_attempted` | 尚未准备或执行复现。 |
| `steps_available` | 已有可执行步骤，但尚未真实执行。 |
| `reproduced` | 已按记录环境真实执行，目标现象成功出现。 |
| `partially_reproduced` | 只复现了部分核心现象，差异已记录。 |
| `failed_to_reproduce` | 已执行步骤，但在记录条件下未出现目标现象。 |
| `environment_unavailable` | 缺少合法、可用或可重建的环境，尚不能执行。 |
| `not_applicable` | 经人工确认该记录不需要本地复现，并说明理由。 |

`successful_reproductions` 不得大于 `attempts`。`reproduced` 至少执行一次且至少成功一次；`partially_reproduced` 至少执行一次。原始输出位置只能写仓库相对路径或受控证据标识，不得写本地绝对路径，也不得包含独立的 `..` 路径段。这些路径语义由 `validate.py` 处理，Schema 只限制字符串类型和长度，避免复杂正则误伤合法文件名。

## 检测方法与证据

每条案例至少有一个 `expected_detection_methods` 项。每项必须说明方法名称、它能证明什么、不能证明什么，以及是否属于确定性判断。这里描述的是预期检测设计，不代表 M0 已实现检测器。

`expected_evidence` 只使用：`git_diff`、`build_log`、`test_output`、`exit_code`、`api_request`、`api_response`、`database_query`、`database_snapshot`、`browser_screenshot`、`playwright_trace`、`console_log`、`network_log`、`dom_assertion`、`file_hash`、`configuration_diff`、`repeated_run_comparison`、`manual_observation`。

证据能力边界：

| 证据 | 能证明 | 不能单独证明 |
| --- | --- | --- |
| Git/配置 Diff、文件哈希 | 文件或配置发生了什么变化、内容是否一致 | 运行时行为正确 |
| 构建/测试输出、退出码 | 某命令在记录环境中的结果 | 未覆盖需求全部正确 |
| API 请求/响应 | 特定输入下的协议与服务行为 | UI 展示或持久化一定一致 |
| 数据库查询/快照 | 记录时点的数据状态与约束结果 | UI 与业务语义全部正确 |
| 截图、DOM 断言、Trace、控制台/网络日志 | 页面可见状态、DOM 条件和浏览器交互链路 | 未观察路径或长期状态正确 |
| 重复运行对比 | 同一版本在记录条件下是否稳定 | 已定位非确定性的根因 |
| `manual_observation` | 提供上下文和辅助判断 | 单独支撑高置信度自动结论，尤其是高风险或阻断结论 |

## 严重程度

严重程度与来源核实、复现状态和审核状态相互独立，只能由人工最终确认。

| 值 | 判断依据 |
| --- | --- |
| `informational` | 不直接造成功能失败，用于记录观察或低风险偏差。 |
| `low` | 局部轻微影响，有清晰绕过方式，不影响关键流程。 |
| `medium` | 影响普通功能或数据质量，需要修复但不立即阻断交付。 |
| `high` | 影响关键流程、重要数据或较大用户范围，通常不应带问题发布。 |
| `blocking` | 凭据泄漏、明显越权、数据破坏、隔离失效等必须阻断的风险。 |

普通 UI 文案、样式或轻微可用性问题不得随意标为 `blocking`。模型可以提出严重度建议，但不得作最终决定。

## 去重规则

- 相同链接、相同 Issue、相同内部编号或同一事故的转述，直接判为重复。
- 不同来源描述同一根因时，合并为一个主案例并保留多个来源。
- 表面现象相同但根因不同，可以保留为不同案例。
- 同一根因出现在不同技术栈时，只有存在独立检测价值、触发条件或证据差异才分别保留。
- 使用 `normalized_title`、`root_cause`、`trigger_condition` 和 `expected_detection_methods` 辅助比较。
- 自动相似度只能生成重复候选，最终 `unique`、`duplicate` 或 `merged` 必须由人工确认。
- `duplicate` 记录填写 `duplicate_of` 并进入 `rejected`；`merged` 记录保留 `related_cases` 和来源合并说明。

## 脱敏规则

- 删除姓名、邮箱、手机号、账号、地址、Token、Cookie、密钥、凭据和真实业务数据。
- 仓库名、组织名和客户名是否保留取决于来源许可；没有明确许可时替换为中性标识。
- 截图、日志和 Trace 的敏感内容必须在原文件副本中遮挡或替换，不能只删除文字说明。
- 脱敏不得改变根因、触发条件或复现条件。
- `privacy_redaction` 记录处理内容、方法、执行者角色、时间、复核状态和说明。
- 原始未脱敏材料不得默认进入 Git 仓库；需要保留时使用仓库外受控存储。
- 公开记录、日志、命令和证据位置不得包含本地绝对路径。

## 人工审核与质量门禁

审核者逐项执行 [review-checklist.md](review-checklist.md)。Schema 与语义校验只证明机器可检查的约束满足，不能代替来源授权、根因、严重度、去重和脱敏的人工判断。

批准前至少确认：来源真实且核实状态一致；分类边界明确；复现状态与次数真实；每种检测方法说明能力边界；证据类型合理；去重完成；脱敏原文件已处理；严重度合理；没有模型伪造的事实。最终 `approved` 必须记录 `reviewer_type=human`、审核角色、时间和结论说明。

## 文件命名与统计

正式文件名使用 `<id>.json`，例如 `fc-2026-0001.json`。M0 统计分别报告：总记录数、`approved` 且可计入数、来源已核实数、已/部分复现数、各主分类数、去重排除数、未完成脱敏数和被拒数；不得只报一个总数。

M0-02 公开候选池位于 [`candidates/`](candidates/README.md)。候选文件使用 `candidate-NNNN.json` 临时编号，固定保持 `draft/source_pending/verified=false`，不计入 M0 的 20 个正式案例；正式 `cases/` 只能接收后续完成人工核实、去重、脱敏和审核的记录。

M0-03 的 Codex 审核建议位于 [`reviews/`](reviews/README.md)。其中的 `verified_match`、A/B/C 分组和建议动作不改变候选的正式来源或审核状态，全部要求人工确认。

## 禁止事项

- 不虚构来源、复现、用户意愿、影响、严重度或审核结论。
- 不把合成示例或模型候选计入正式案例门禁。
- 不把未核实引用写成已核实。
- 不保存真实密钥、Cookie、Token、个人数据、绝对本地路径或未经授权的仓库内容。
- 不声称 M0 已实现任何检测器。
