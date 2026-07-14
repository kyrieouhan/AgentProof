# Failure Case 人工审核清单

版本：`1.0.0`。本清单用于决定案例能否从 `draft` 变为 `approved` 或 `rejected`。自动校验、Codex 和模型只能提供检查结果或建议，不能代替最终人工批准。

## 1. 结构与身份

- [ ] JSON 通过 [schema.json](schema.json) 校验，`schema_version` 正确。
- [ ] JSON 通过 [validate.py](validate.py) 的跨字段语义校验。
- [ ] `id` 与文件名一致，且未与现有记录重复。
- [ ] `is_example=false`；若为示例，确认它不会进入正式统计。
- [ ] 文件不位于 `tests/`；测试夹具无论字段状态如何都不得进入正式统计。
- [ ] 内容没有把规划中的检测器写成已实现能力。

## 2. 分类

- [ ] 主分类符合 [category-taxonomy.md](category-taxonomy.md) 的包含条件。
- [ ] 已检查主分类的排除条件和相邻类别边界。
- [ ] 次分类确实独立成立、已去重，且不与主分类重复。
- [ ] 主次分类均不含 `needs_review`。

## 3. 来源与授权

- [ ] 来源类型、标题、引用/内部编号和日期与原始材料一致。
- [ ] 链接或内部记录真实存在，内容能支持案例描述。
- [ ] `source_verified`、`verified`、核实时间、方式和核实者角色一致。
- [ ] `personal_experience` 已由真实人员确认；不是 Codex 或模型生成的叙述。
- [ ] `model_generated_candidate` 未被批准；`synthetic_demo` 未冒充真实事故。
- [ ] 许可/授权和 `can_publish` 已核对；不可公开材料只保留获准的脱敏摘要。

## 4. 复现

- [ ] `reproduction_status` 与实际执行情况一致；有步骤不等于已复现。
- [ ] 需要复现时，前置条件、版本、Commit、环境、命令和步骤足以重放。
- [ ] 预期行为与实际行为可观察、可区分，不是主观评价。
- [ ] `attempts` 与 `successful_reproductions` 合理，成功次数不大于执行次数。
- [ ] `raw_output_location` 是相对路径或受控证据标识，不含绝对路径或独立的 `..` 路径段。
- [ ] 随机种子、原始输出相对位置和已知限制如实记录。
- [ ] `not_applicable`、`environment_unavailable` 或 `failed_to_reproduce` 有明确理由。

## 5. 检测设计与证据

- [ ] 至少定义一种检测方法，并说明能证明什么、不能证明什么。
- [ ] 能使用状态码、JSON、DOM、数据库、退出码、哈希或 Diff 时，优先确定性方法。
- [ ] `expected_evidence` 与检测方法和失败现象匹配。
- [ ] `manual_observation` 仅为辅助证据，没有单独支撑高置信度自动结论。
- [ ] 文档没有暗示 M0 已实现这些检测器。

## 6. 严重程度

- [ ] 严重度与复现状态分开判断。
- [ ] 严重度由人工最终确认，没有直接采纳模型结论。
- [ ] `blocking` 仅用于凭据泄漏、明显越权、数据破坏、隔离失效等阻断风险。
- [ ] 普通 UI 文案或轻微样式问题未被标为 `blocking`。

## 7. 去重

- [ ] 已比较相同链接、Issue、内部编号和事故记录。
- [ ] 已比较 `normalized_title`、`root_cause`、`trigger_condition` 和检测方法。
- [ ] 多来源同根因已合并并保留补充来源。
- [ ] 同现象不同根因或跨技术栈记录具有独立检测价值。
- [ ] 自动相似度只作为候选；最终结果已由人工确认并记录。
- [ ] `merged` 至少关联一个其他案例，且 `duplicate_of=null`；关联和重复字段都不引用当前案例自身。

## 8. 脱敏与仓库安全

- [ ] 姓名、邮箱、手机号、账号、地址、Token、Cookie、密钥、凭据和真实业务数据已处理。
- [ ] 仓库名、组织名和客户名的保留符合许可。
- [ ] 截图、日志、Trace 等原文件副本已实际脱敏，不是只改文字说明。
- [ ] 脱敏没有改变根因、触发条件或复现条件。
- [ ] 原始未脱敏材料不在 Git 仓库中。
- [ ] 记录、命令和证据位置不含本地绝对路径。
- [ ] 脱敏内容、方法、执行者角色和人工复核信息完整。

## 9. 最终决定

只有 Schema 结构校验、语义跨字段校验和以上适用人工检查都通过后，人工审核者才能设置最终状态：

- `approved`：必须 `is_example=false`，主来源不是 `synthetic_demo` 或 `model_generated_candidate`，并记录 `reviewer_type=human`、审核者角色、审核时间、清单版本和决定说明。
- `rejected`：记录人工审核信息和 `rejection_reason`；重复记录同时填写 `duplicate_of`。
- 保持 `draft`：信息仍不足，但记录值得继续调查。

M0 20 个案例的计数还要排除 `is_example=true`、`synthetic_demo` 和 `model_generated_candidate`。批准代表数据集记录合格，不代表 AgentProof 已完成自动检测。
