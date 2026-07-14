# 开发记录

## 2026-07-11 - 项目文档与数据规范初始化

- 目标：完整读取总计划，在不开发业务代码的前提下初始化 AgentProof M0。
- 操作：读取并渲染 13 页 DOCX；转换总计划；拆分 M0-M4；建立威胁模型、支持矩阵、ADR、术语表和 failure-case Schema。
- 修改文件：见本次交付清单；原始 DOCX 复制到 `docs/source/`，未修改源文件。
- 验证：渲染并逐页检查 13 页；提取 207 个段落、20 个表格、2 张图；检查 20 个 Markdown 文件中的 35 个本地链接、2 个 JSON、统一状态、里程碑名称、MVP 边界、安全基线、采访残留、空文件、乱码、源 DOCX 哈希和目录禁项。
- 结果：全部检查通过；示例符合 Schema。捆绑 Python 没有 `jsonschema`，未安装依赖，改用一次性标准库校验并带缺失必填字段自检。初始导入时源文件与仓库副本 SHA-256 均为 `2816a879ec819755f33037427a118ebf4bb38e6243aa1a8d4c419b5a51c531b0`。未创建业务源码。
- 后续：执行 M0 的失败案例收集、人工核实、脱敏、去重和复现工作。

## 2026-07-11 - DOCX 元数据清理与 Git 基线准备

- 目标：清除仓库 DOCX 副本中的个人、软件和扩展属性，不改变正文、图片、表格、格式或文件名，并准备本地 Git 初始基线。
- 操作：仅处理 `docs/source/AgentProof_项目阶段开发计划_优化版.docx`；清除 author、last_modified_by、subject、comments、category、keywords、revision、created/modified 时间、修订会话 ID，移除扩展属性部件，并确认不存在自定义属性部件；保留安全的 title。
- 修改文件：DOCX 仓库副本、`.gitignore`、`dev_log.md`；`<PRIVATE_SOURCE_DIR>` 原始 Word 文件未修改。
- 验证：清理前后均为 207 个段落、20 个表格、1 个节、2 张图片；图片哈希一致；13 页渲染 PNG 逐页哈希完全一致并完成目视检查；Markdown、JSON Schema、示例、文档一致性和隐私扫描通过。
- 结果：仓库副本 SHA-256 为 `bc7328848391a376012f002cb007c4e7a5b05ff8d27ff8ac0910b7bf46d1ab2f`；原件仍为 `2816a879ec819755f33037427a118ebf4bb38e6243aa1a8d4c419b5a51c531b0`。未创建业务代码，未进入 M0-01。
- 后续：仅创建用户授权的本地 Git 文档基线 Commit；不配置远程，不推送。

## 2026-07-11 - M0-01 冻结失败案例规范

- 目标：只完成 M0-01，冻结可长期使用的失败案例分类、JSON Schema、状态、来源、复现、证据、严重度、去重、脱敏与人工审核流程。
- 操作：新增 `category-taxonomy.md` 与 `review-checklist.md`；把 failure-case Schema 固定为 Draft 2020-12 / `1.0.0`，使用 `additionalProperties: false`；将来源核实、复现和最终审核拆为独立状态；更新完整合成示例、术语表、M0 状态和 ADR-011。
- 修改文件：`datasets/failure-cases/README.md`、`schema.json`、`example.json`、`category-taxonomy.md`、`review-checklist.md`、`docs/glossary.md`、`docs/milestones/M0.md`、`docs/decision-log.md`、`dev_log.md`。
- 验证：JSON 语法通过；无新增依赖，使用仓库外标准库检查器完成 Schema 关键字/本地引用/正则自检、示例校验、批准门禁负向用例和跨字段语义检查；检查 22 个 Markdown 文件的 53 个本地链接；核对 15 个分类及来源、复现、证据、严重度、审核状态枚举；确认 `cases/` 为 0 个文件、无业务目录，并通过 `git diff --check`。
- 结果：M0-01 退出门禁通过；没有收集或虚构正式案例，没有创建官方 Demo、依赖或业务代码，没有进入 M0-02 或 M1。`approved` 只能由人工作出，且不等于 AgentProof 已实现自动检测。
- 后续：等待用户审核本次 Git Diff；只建议审核并提交 M0-01，不开始 M0-02。

## 2026-07-11 - M0-01 提交前逻辑门禁修正

- 目标：修复审核发现的 approved、合成来源、merged 和路径规则漏洞，并在提交前建立可重复运行的跨字段语义测试。
- 操作：Schema 新增强制非示例 approved、禁止 approved 合成/模型来源、禁止 synthetic_demo approved、merged 至少关联一个案例；移除 `raw_output_location` 复杂正则。新增标准库 `validate.py`、3 个正向输入和 12 个负向测试；测试夹具全部位于 `tests/` 并明确不计入 M0。
- 修改文件：failure-case Schema、README、分类、审核清单、M0/ADR/技术栈/SOP，以及 `validate.py`、`tests/` 和本日志；没有修改 `cases/`，没有创建业务代码。
- 验证：16 个 JSON 语法通过；Schema 关键字/引用/正则自检和 `example.json` 校验通过；3 个有效输入全部通过；12 个无效输入均以预期错误代码与字段路径被拒绝；5 个仅应由语义层拒绝的夹具通过结构层后被语义层拒绝；22 个 Markdown 文件的 58 个本地链接通过；15 个分类及来源、复现、证据、严重度和审核枚举一致；数据集目录外输入返回退出码 2；`cases/` 为 0 个文件；无 Python 缓存产物。
- 结果：M0-01 的结构校验、跨字段语义校验和人工审核三层边界已明确；最终提交前复验全部通过。校验器只读、无网络、不批准案例；没有进入 M0-02 或 M1。
- 提交：按用户授权创建 `feat: freeze M0 failure-case taxonomy and validation rules`，不配置远程、不推送；提交后仍停留在 M0-01。

## 2026-07-11 - M0-02 公开失败案例候选收集

- 目标：只发现和整理公开可访问的 AI 编程 Agent 交付失败候选，不做最终人工批准、真实复现或产品开发。
- 操作：逐条打开 30 个官方 GitHub Issue 原文，整理为 `candidate-0001` 至 `candidate-0030`；覆盖 Codex、Claude Code、Aider、Cline、GitHub Copilot 各 6 条和 12 个主分类；另记录 5 条未达到门槛的拒绝线索。来源事实与收集者推测分开记录。
- 状态：30 条全部保持 `draft/source_pending/verified=false`，复现次数均为 0；23 条仅标记 `steps_available`，7 条为 `not_attempted`；没有 `approved` 或 `reproduced`。两条 Remote SSH 文件操作候选标记为可能重复，等待人工判断是否同根因。
- 修改文件：新增 `datasets/failure-cases/candidates/README.md`、`index.json`、`rejected-leads.json` 和 30 个候选记录；更新 failure-case 总 README 与本日志。正式 `cases/` 未修改且保持为空。
- 验证：JSON Schema Draft 2020-12 自校验与 `example.json` 通过；30 条候选结构校验和语义校验全部通过；M0-01 的 3 个正向、12 个负向测试继续通过；48 个 JSON 语法通过；65 个 Markdown 本地链接无断链；30 个来源 URL 格式正确且无重复；规范化标题无重复且相似度阈值检查未发现高相似标题；7 类敏感信息模式扫描无命中；工具与分类分布满足门槛；`git diff --check` 通过。
- 结果：形成 30 条未核实候选池，单一工具占 20%，最大单一分类占 16.7%，全部来自官方 Issue 仓库。没有创建业务代码、官方 Demo、远程仓库或 Commit，没有进入 M0-03 或 M1。
- 后续：只建议由人工在 M0-03 重新核实来源、评论、许可、根因、去重和脱敏，并决定隔离复现顺序；不得直接批准候选。

## 2026-07-11 - M0-03 候选核实、去重与脱敏建议

- 前置提交：M0-02 通过语法、Schema、语义、状态、隐私、统计和 Git 范围门禁后，提交为 `993b6c9ff7f80030973b2f2f9eb1c71673c64887`（`feat: collect M0 failure-case candidates`）；未配置远程、未推送。
- 目标：逐条重新打开 M0-02 的 30 个公开来源，生成等待人工确认的来源、分类、去重、隐私、严重度和复现信息质量建议；不代替人工批准。
- 来源核查：30/30 个 GitHub Issue 可访问；21 条正文完全支持核心事实，3 条只部分支持，1 条被维护者明确标为外部 Issue 的重复来源，5 条内容真实但建议排除为代码交付范围外；无法访问、内容不匹配和隐私/许可风险均为 0。`human_source_verified_count` 仍为 0。
- 去重：`candidate-0017` 被维护者关闭为外部 `#2901` 的重复来源，等待改用主来源；建议把 `candidate-0026` 合并为 `candidate-0029` 的补充来源，内部合并建议 1 条。没有删除或移动候选。
- 修正：对照当前 Issue 标题和评论，修正 16 条候选的 32 个客观字段，包括精确来源标题、标题、两处事实描述/根因边界；分类、严重度和去重结论只保留在审核建议中，没有写成最终决定。
- 隐私：候选和审核记录未发现需要新增脱敏的个人或凭据信息，仓库未复制外部正文中的用户路径、反馈编号、SSH 配置、附件或长日志；脱敏修改数为 0，仍需人工复核许可和外部附件。
- 分组：A 组 20 条，建议进入最终人工审核；B 组 4 条，需要补证或修正主来源；C 组 6 条，建议排除范围外或合并。复现信息质量为 strong 18、medium 10、weak 2，但全部仍未由 AgentProof 真实复现。
- 交付：新增 `datasets/failure-cases/reviews/`，包含说明、逐条审核 Schema、汇总 Schema、30 个审核记录和 `review-summary.json`；所有 `manual_confirmation_required=true`。
- 边界：30 条候选仍为 `draft/source_pending/verified=false`，执行次数和成功复现次数均为 0；没有 `approved`、`reproduced`、人工审核人或人工审核时间；正式 `cases/` 保持为空。没有创建业务代码、官方 Demo，也没有进入 M0-04。
- 后续：等待人工确认 A/B/C 分组、`candidate-0017` 主来源替换、`candidate-0026`/`candidate-0029` 合并、分类和严重度，再决定正式案例迁移。

## 2026-07-12 - M0-03 补充范围审计

- 目标：只修正 M0-03 的首版范围判断，区分真正适合 AgentProof 首版正式案例池的代码交付失败、次级研究材料和应排除的普通工具/客户端 Bug。
- 操作：重新审查 30 条候选及对应 M0-03 审核记录，新增 `datasets/failure-cases/reviews/scope-audit.json`，并把范围统计同步到 `review-summary.json` 与 `reviews/README.md`；没有修改候选的来源核实、复现或最终审核状态。
- 结果：`core_in_scope` 11 条，`secondary_research` 7 条，`out_of_scope` 12 条；MVP 可检测 8 条、部分可检测 10 条、不可检测 12 条。核心范围候选不足 20 条，缺口为 9 条。
- 缺失类型：现有候选中没有可靠的 `weakened_tests`、`hardcoded_behavior` 或严格意义上的 `build_runtime_mismatch` 核心案例；不得强行为填满类别而改分类，需要回到 M0-02 补充收集。
- 边界：未迁移任何记录到正式 `cases/`，没有 `approved`、`reproduced`、`source_verified` 或人工审核人字段变化；没有创建业务代码、官方 Demo、Runner、API、前端或验证器；没有进入 M0-04。
- 后续：等待人工审查范围审计结果；若接受本次收紧标准，下一步只能补充收集缺失类型和缺口案例。

## 2026-07-12 - M0-03 审核与范围审计固化

- 目标：在进入 M0-02B 前，固化 M0-03 候选核实、去重、脱敏建议和补充范围审计成果。
- 复验：确认 30 个候选均有审核记录，`scope-audit.json` 覆盖 30 个候选，`review-summary.json` 与范围统计一致；候选仍全部为 `draft/source_pending/verified=false`，没有 `approved`、`reproduced`、人工审核人或复现次数变化；正式 `cases/` 为空。
- 校验：30 条候选语义校验通过；M0-01 正负向测试通过；JSON、Schema、审核记录、范围统计、Markdown 本地链接、隐私/绝对路径扫描和 `git diff --check` 均通过。
- 提交：按用户授权创建 `feat: review and scope-audit M0 failure-case candidates`；不配置远程、不推送，不进入 M0-04。

## 2026-07-12 - M0-02B-1 补充测试削弱候选

- 目标：只补充 weakened_tests 类型的公开失败候选；最多 4 条，不进入其他缺失分类。
- 操作：重新筛选公开可访问的代码 Agent 交付记录，仅保留 4 条 likely_core_in_scope 候选，编号为 candidate-0031 至 candidate-0034；新增本批次范围记录 supplement-batch-01.json，明确每条均为测试替换、Mock 路径绕过、无效 Fixture 或 dry-run 短路断言导致的独立验证强度下降。
- 来源边界：所有候选只保留公开 GitHub Issue 链接和必要短摘要；未复制外部完整 Diff、日志、附件、用户名、凭据或本地绝对路径。来源页面可访问不等于已由项目人工核实。
- 状态：4 条均保持 draft/source_pending/verified=false、reproduction_status=not_attempted、复现次数为 0；没有 approved、reproduced、人工审核人或正式案例迁移。cases/ 保持为空。
- 范围：本批次达到用户授权的 4 条上限后停止；未继续搜索或写入其他分类，也没有新增拒绝线索。
- 后续：等待人工按 M0-03 清单核实来源关联 PR、测试 Diff、许可、根因、去重和隔离复现条件。
- 提交：按用户授权准备创建 M0-02B-1 独立本地 Commit；不配置远程、不推送。

## 2026-07-12 - M0-02B-2 补充硬编码行为候选

- 目标：只补充 hardcoded_behavior 类型的公开失败候选；最多 4 条，不进入 build_runtime_mismatch 或 M0-03。
- 操作：从 candidate-0035 开始筛选并新增 3 条 likely_core_in_scope 候选：固定目标分支、固定文件排除集合、固定脚手架路径。因其余已核对来源没有同时满足“直接 Agent 代码交付”和“可观察硬编码行为”门槛，未为凑足数量新增 candidate-0038。
- 拒绝线索：新增 3 条到 rejected-leads.json；分别为仅有可维护性问题而无行为失败证据、关联 PR 为人类作者、以及只证明 Review Agent 漏检而未证明代码 Agent 引入硬编码。
- 状态：3 条均保持 draft/source_pending/verified=false；candidate-0035 为 steps_available，其余为 not_attempted；全部复现次数为 0，没有 approved、reproduced、人工审核人或正式案例迁移。cases/ 保持为空。
- 边界：本批次完成后不创建第二个 Commit，不继续 build_runtime_mismatch，不进入 M0-03 或 M0-04。
- 后续：等待人工按 M0-03 清单核实来源关联 PR、硬编码行为是否可独立复现、去重、脱敏和许可。

## 2026-07-12 - M0-02B-2 提交前复验

- 目标：在提交 hardcoded_behavior 批次前确认候选状态、索引、补充批次、拒绝线索和正式案例边界。
- 复验：candidate-0035 至 candidate-0037 均为 hardcoded_behavior，补充批次中均标记 likely_core_in_scope；三条均保持 draft/source_pending/verified=false，未 approved，未 reproduced，复现成功数为 0。
- 校验：JSON 语法、Schema、语义测试、URL 可达、重复检查、分类边界、隐私与新增绝对路径扫描、Diff 范围和 git diff --check 均通过；正式 cases/ 为空。
- 边界：本次只提交 M0-02B-2 候选、索引、补充批次、拒绝线索和本日志；不配置远程、不推送，不进入 M0-03 或 M0-04。

## 2026-07-12 - M0-02B-3 补充构建运行不匹配候选

- 范围：从 `candidate-0038` 开始继续收集严格意义上的 `build_runtime_mismatch` 候选，仅更新候选池、索引、补充批次、拒绝线索和本日志。
- 新增：`candidate-0038` 记录 Claude Code 生成的 agents-repo fallback 变更在 Go 静态/单元检查通过后破坏 functional-tests；`candidate-0039` 记录 Fullsend code-agent PR 在 pre-commit/tests 通过后因目标运行环境缺少 `skopeo` 导致核心优化路径不可达。
- 边界：仅接收同时具备 Agent 代码交付、构建/静态/测试成功证据、真实运行或关键路径失败证据的公开来源；把缺少构建成功证据、客户端/工具安装问题、纯人工 PR、普通环境问题或来源不可核对的线索加入拒绝列表。
- 状态：两条新增候选均保持 `review_status=draft`、`source_verification_status=source_pending`、`verified=false`、非 `approved`、非 `reproduced`；正式 `datasets/failure-cases/cases/` 目录仍不写入。
- 后续：本批次不创建提交；等待后续 M0-03 时再做人审、来源核实、去重、脱敏和复现决策。

## 2026-07-12 - M0-02B-3 提交前复验

- 目标：在提交 build_runtime_mismatch 批次前确认 candidate-0038 与 candidate-0039 的严格边界、候选状态、索引、补充批次、拒绝线索和正式案例目录边界。
- 复验：两条候选均为 `build_runtime_mismatch`，补充批次中均标记 `likely_core_in_scope`；均保持 `draft/source_pending/verified=false`，未 `approved`，未 `reproduced`，复现尝试数和成功复现数均为 0。
- 严格边界：两条均保存了 Agent 代码交付来源、构建或静态/测试成功证据，以及真实运行或关键路径失败证据；未纳入客户端、安装器、自动更新、模型服务或普通人工提交问题。
- 校验：提交前运行 JSON、Schema、语义、URL、重复、分类边界、隐私与新增绝对路径、Diff 范围、正式 `cases/` 为空和 `git diff --check` 检查；若任一失败则停止提交。
- 交付：准备创建本地提交 `feat: add build-runtime-mismatch failure-case candidates`；不配置远程、不推送，提交后才进入 `candidate-0031` 至 `candidate-0039` 的 M0-03 补充审核。

## 2026-07-12 - M0-03 补充审核 candidate-0031 至 candidate-0039

- 前置提交：M0-02B-3 通过候选状态、严格分类、索引、补充批次、拒绝线索、正式 `cases/` 为空和 `git diff --check` 等提交前检查后，提交为 `79609812199715626d88f1a2dabd1eea9fab03ac`（`feat: add build-runtime-mismatch failure-case candidates`）；未配置远程、未推送。
- 目标：只审核本轮新增 9 条候选，不重新审核 `candidate-0001` 至 `candidate-0030`，不搜索新案例，不迁移正式 `cases/`，不把任何候选标记为 `approved`、`reproduced` 或 `source_verified`。
- 来源核查：`candidate-0031` 至 `candidate-0039` 的公开 GitHub Issue/PR 均可访问，9 条均建议 `source_check_result=verified_match`；其中 `candidate-0037`、`candidate-0038`、`candidate-0039` 保留额外人工确认点。
- 分类：`candidate-0031` 至 `candidate-0034` 建议保留为 `weakened_tests`；`candidate-0035` 至 `candidate-0037` 建议保留为 `hardcoded_behavior`；`candidate-0038` 至 `candidate-0039` 建议保留为 `build_runtime_mismatch`。没有候选被建议改分类。
- 范围：本轮 9 条在初始补充审核中均曾建议为 `core_in_scope`；MVP 可检测建议为 7 条 `yes`、2 条 `partially`。该初始统计已被后续严格范围修正取代，当前有效门禁统计以下方 `candidate-0035` 修正记录和 `scope-audit.json` 为准。
- 分组：9 条均建议进入 A 组人工最终审核；未发现新增重复、隐私或许可证即时风险，未产生新的拒绝线索。
- 交付：新增 `candidate-0031-review.json` 至 `candidate-0039-review.json`，更新 `review-summary.json`、`scope-audit.json`、`reviews/README.md` 和本日志；为审核记录 Schema 补充范围字段以支持本轮要求。
- 边界：候选仍全部保持 `draft/source_pending/verified=false`；复现次数和成功复现次数仍为 0；没有 `approved`、`reproduced`、人工审核人或正式案例迁移；不创建第二个 Commit，等待人工确认。

## 2026-07-12 - M0-03 严格范围修正 candidate-0035

- 背景：用户要求采用更严格的首版 MVP 范围口径，只修正 `candidate-0035` 的 M0-03 审核结论和关联统计，不重新搜索案例，不迁移正式 `cases/`。
- 调整：`candidate-0035` 从 `core_in_scope` 调整为 `secondary_research`，`detectable_by_mvp` 从 `yes` 调整为 `partially`，最终范围建议改为 `keep_as_secondary_research`。
- 原因：来源能够证明 code-agent delivery workflow 把目标分支硬编码为 `main` 的缺陷，但不足以证明该硬编码工作流本身属于 AI Agent 对目标项目生成的代码交付；完整检测还依赖 GitHub 默认分支 API、PR 创建流程或远程 GitHub Actions 环境，超出 M1-M3 本地 MVP 首批核心案例范围。
- 统计：修正后 `core_in_scope=19`、`secondary_research=8`、`out_of_scope=12`；MVP 可检测性为 `yes=14`、`partially=13`、`no=12`；`hardcoded_behavior` 核心分类数从 3 调整为 2。
- 门禁：M0 的 20 条核心案例门禁尚未达到，缺口为 1；正式 `datasets/failure-cases/cases/` 保持为空。
- 边界：本次是用户指示下的严格范围修正，不记录为 `source_verified`、`approved`、`reproduced` 或正式人工案例批准；下一任务只能补 1 条真实缺口案例。

## 2026-07-12 - M0 核心案例数量门禁例外与官方 Demo 正确基线启动

- 背景：用户决定不再为了达到 20 条而补充低质量案例，要求继续 M0 的下一项工作；仓库 M0 文档确认下一项为 M0-04 官方 Demo。
- 门禁例外：原计划核心案例目标为不少于 20 条；严格审核后如实保留 `core_in_scope=19`、`secondary_research=8`、`out_of_scope=12`。为避免降低来源真实性、AI Agent 交付关联性和本地 MVP 可检测性标准，不再为了数量补第 20 条。
- 决策记录：该决定写入 `docs/milestones/M0.md` 与 `docs/decision-log.md`，作为明确的 M0 门禁例外；不得把统计伪造成 20，也不得把未人工批准候选迁移为正式案例。
- 案例边界：正式 `datasets/failure-cases/cases/` 仍保持为空；本轮不设置 `approved`、`source_verified`、`reproduced`，不搜索新案例。
- 下一工作：进入 M0-04 的官方 Demo 正确基线；本轮只建立正确版本，不创建五类缺陷分支，不进入 M1，不开发 Runner、GitHub App 或完整 AgentProof 前端。

## 2026-07-12 - M0-04 官方 Demo 正确基线完成

- 交付：新增 `samples/demo-web-app/`，作为官方 Demo 的正确基线版本；技术栈为 Node.js、TypeScript、Fastify、SQLite、Prisma Client、vanilla HTML/CSS/JavaScript，不使用 Next.js、Runner、大模型或 GitHub App。
- 功能：实现注册、邮箱 trim/lowercase/唯一性、密码 scrypt 哈希、注册后登录状态、登录/退出、服务端管理员权限控制、SQLite 持久化任务创建/读取/更新，以及 API 错误时页面不显示成功。
- 测试：新增 8 条自动化测试，覆盖正常注册、重复邮箱、大小写/空格唯一性绕过、密码非明文、注册后 session、正确/错误密码登录、普通用户管理员拒绝、任务写入后读取、非法输入清晰错误。
- 后续缺陷注入点：仅在 Demo README 中记录 `superficial_completion`、`authorization_bypass`、`weakened_tests`、`hardcoded_behavior`、`non_persistent_state` 五类未来分支计划；本轮没有创建缺陷分支。
- 校验：`pnpm install`、`pnpm run prisma:generate`、`pnpm run prisma:validate`、`pnpm run db:init`、`pnpm run lint`、`pnpm run typecheck`、`pnpm test`、`pnpm run build` 和构建后 HTTP smoke test 均通过。Prisma CLI `db push` 在本机 schema-engine 阶段返回空错误，因此数据库初始化改为项目内显式 SQLite 初始化脚本，同时保留 Prisma schema 校验和 Prisma Client 运行时访问。
- 边界：正式 `datasets/failure-cases/cases/` 仍为空；没有新增第 20 条候选，没有设置 `approved`、`source_verified`、`reproduced`，没有进入 M1 或开发 Runner。

## 2026-07-12 - 自主执行状态文件初始化

- 背景：长期自主目标要求支持上下文耗尽、会话中断或电脑重启后的恢复，并在 M0-M3 内自动推进。
- 操作：新增 `docs/autonomous-execution.md`、`docs/execution-status.md` 和 `.agent/PLANS.md`，记录事实优先级、自主范围、暂停条件、测试提交规则、安全边界、里程碑推进规则、当前 M0 状态和下一项任务。
- 当前状态：M0 仍未结束；已完成 19 条核心候选门禁例外、威胁模型/支持矩阵初版和官方 Demo 正确基线；下一项为 M0-04 五类官方缺陷样例。
- 边界：本次只建立状态与恢复文件，不创建缺陷样例、不进入 M1、不迁移正式 `cases/`、不设置 `approved`、`source_verified` 或 `reproduced`。

## 2026-07-12 - M0-04 官方缺陷样例完成

- 目标：在官方 Demo 正确基线之上创建五类可重复缺陷样例，并真实复现，不创建长期缺陷分支。
- 实现：新增 `samples/demo-web-app/defects/`，用可重复补丁覆盖 `superficial_completion`、`authorization_bypass`、`weakened_tests`、`hardcoded_behavior` 和 `non_persistent_state`；新增 `scripts/verify-defect-scenarios.mjs` 与 `scripts/probe-defect.mjs` 临时应用补丁、运行场景探针并反向还原。
- 复现结果：`superficial_completion` 返回创建成功但列表和 SQLite 均无任务；`authorization_bypass` 让普通用户拿到 admin summary；`weakened_tests` 在关键邮箱标准化唯一性测试被 skip 后仍通过测试；`hardcoded_behavior` 只有 `demo@example.com` 可注册；`non_persistent_state` 同进程可读但 SQLite 无持久化记录。
- 验证：`pnpm run defects:verify` 真实运行并全部输出 `reproduced`；补丁运行后 `src/` 与 `tests/` 自动还原。
- 边界：本次不创建 Git 缺陷分支、不进入 M1、不开发 Runner、不迁移正式 `cases/`，不设置 `approved`、`source_verified` 或候选 `reproduced`。

## 2026-07-12 - M0-05 检测方式与证据矩阵

- 目标：把五类官方缺陷的预期检测方式、关键证据、判定规则、误判边界和里程碑落点固化为 M0 设计输入。
- 交付：新增 `docs/m0-detection-evidence-matrix.md`，覆盖 `superficial_completion`、`authorization_bypass`、`weakened_tests`、`hardcoded_behavior` 和 `non_persistent_state`。
- 结论：M2 应优先实现 API、数据库、随机数据、Evidence Manifest 与脱敏报告；M3 再加入浏览器联合判断、Git Diff 风险检测和轻量硬编码检测。
- 边界：该矩阵只定义 M0 检测可行性实验的证据要求，不声称正式 Runner、API 验证器、浏览器验证器或完整产品能力已实现。

## 2026-07-12 - M0-06 最小检测可行性实验

- 目标：用本地脚本验证正确基线和五类官方缺陷能否被计划中的 API、数据库、测试 Diff、随机输入和重复补丁回放证据区分。
- 实现：新增 `pnpm run m0:feasibility`，先验证正确基线注册、任务持久化、admin 拒绝和关键测试未 skip，再调用五类缺陷复现脚本并生成报告。
- 结果：`artifacts/m0-feasibility/summary.json` 与 `report.md` 记录实验结论为 `passed`；正确基线通过，五类缺陷均为 `reproduced`。
- 边界：这是 M0 本地可行性实验，不是 M1 Docker Runner，不生成可信 Manifest，不标记公开 failure-case 候选为 reproduced。

## 2026-07-12 - M0-07 Runner 输入规范与安全/支持评审

- 目标：在不开发正式 Runner 的前提下，固定 M1 可以接收的项目、命令、端口、环境变量、资源、网络、挂载和证据输入边界。
- 交付：新增 `docs/m1-runner-input-spec.md`，定义 RunnerProfile 字段、接受范围、拒绝条件、运行记录和 M1/M2/M3 边界。
- 支持评审：`docs/support-matrix.md` 明确 M1 首版只承诺保守 Node.js Web 项目执行面；Monorepo、Docker Compose、私有 registry、真实 `.env`、多服务编排、外部生产服务和 Windows-only 项目不进入首版承诺。
- 安全评审：`docs/threat-model.md` 明确 M1 不得挂载 Docker Socket、宿主 home、SSH Key、真实 `.env`、Cookie 或控制面密钥；ISO-01 至 ISO-14 必须通过真实 Runner 创建路径验证。
- 边界：本次只完成规范与评审，不开发 CLI Runner、Docker 执行内核、API 验证器、浏览器验证器、GitHub App 或正式产品前端。

## 2026-07-12 - M0-08 退出门禁审计

- 目标：运行 M0 退出审计，确认数量门禁例外、官方 Demo、缺陷样例、检测矩阵、可行性实验、Runner 输入规范和安全/支持评审是否足以进入 M1。
- 结论：M0 在 ADR-012 的核心案例数量门禁例外下结束；真实统计仍为 `candidate_total=39`、`core_in_scope=19`、`secondary_research=8`、`out_of_scope=12`、`shortfall_to_20=1`、`meets_20_final_candidate_target=false`，正式 `cases/` 仍为空。
- 交付：新增 `docs/milestones/M0-exit-review.md`，新增 ADR-013，更新 M0 任务状态和自主执行状态，下一任务为 M1-01 RunnerProfile 与 CLI 契约。
- 校验：failure-case 语义测试、JSON 解析、统计一致性、Demo `pnpm install`/Prisma/lint/typecheck/test/build、五类缺陷回放、`pnpm run m0:feasibility`、Markdown 链接和 `git diff --check` 均通过。
- 边界：本次不搜索第 20 条候选，不迁移正式 `cases/`，不设置 `approved`、`source_verified` 或 `reproduced`，不开发 M1 Runner 代码。

## 2026-07-12 - M1-01 RunnerProfile 与 CLI 契约

- 目标：建立 M1 安全 Runner 的最小输入契约与本地 CLI 校验入口，不启动容器、不运行目标项目命令。
- 实现：新增根 `package.json`、`bin/agentproof.mjs`、`src/runner-profile.mjs`、`schemas/runner-profile.schema.json`、`samples/demo-web-app/agentproof.runner-profile.json` 和 `tests/runner-profile.test.mjs`。
- 能力：`agentproof profile validate` 可校验官方 Demo RunnerProfile，检查必需字段、路径边界、Node 20、npm/pnpm lockfile、健康检查、端口、环境变量、资源限制、默认拒绝网络、挂载策略和证据策略。
- 校验：`npm install --package-lock-only --ignore-scripts`、`npm run lint`、`npm run profile:validate` 和 `npm test` 通过；测试覆盖合法 Demo profile、路径穿越、缺失 pnpm lockfile、放宽网络、Docker Socket 和内联敏感环境值。
- 边界：本次不引入新运行时依赖，不开发 Docker Runner、Manifest、API 验证器、浏览器验证器、GitHub App 或完整 Web。

## 2026-07-12 - M1-02A Docker 前置诊断

- 目标：在实现真实容器生命周期前，给 CLI 增加 Docker CLI/Engine 可用性预检，避免把本机环境缺失误判成项目失败或安全通过。
- 实现：新增 `src/docker-preflight.mjs`、`agentproof docker check [--json]` 和 `tests/docker-preflight.test.mjs`；缺失 Docker CLI 或 Engine 时统一返回 `infrastructure_error`。
- 校验：`npm run lint`、`npm run profile:validate` 和 `npm test` 通过；`npm run docker:check` 在当前机器按预期退出 1，并输出 `docker CLI not found`。
- 阻塞：当前机器没有可调用 Docker CLI/Engine，常见 Docker Desktop 路径未发现，`com.docker.service` 不存在；因此不能真实创建容器、验证最小挂载或执行 ISO 隔离烟测。
- 边界：本次不安装 Docker，不降低安全要求，不把 M1-02 标记为完成。

## 2026-07-13 - M1-02B 容器生命周期与最小挂载

- 背景：用户安装 Docker Desktop 与 WSL 2 后继续 M1。当前 PowerShell PATH 仍没有 `docker`，但只读搜索发现 Docker CLI 可由 Docker Desktop bundled CLI 提供。
- 实现：扩展 Docker 预检以自动发现 Docker Desktop CLI 路径；新增 `src/docker-runner.mjs` 与 `agentproof run --profile <path> --lifecycle-smoke --json`，把目标项目复制到 `.tmp/agentproof-runs/` 临时工作区后启动受限容器。
- 安全参数：lifecycle smoke 使用 `--network none`、`--user 1000:1000`、`--cap-drop ALL`、`--security-opt no-new-privileges`、`--pids-limit 64`、`--memory 256m`、`--cpus 1`、`--read-only`、只读 `/workspace` 挂载和 `/tmp` tmpfs；验证容器内无 Docker Socket、无 `.env`、无 `.npmrc`。
- 真实结果：`npm run smoke:docker` 通过；首次拉取 `node:20-alpine`，digest 为 `sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293`；容器输出 `agentproof-lifecycle-smoke-ok`；临时目录清理结果为 `removed`。
- 校验：`npm run lint`、`npm run profile:validate`、`npm test`、`npm run docker:check` 和 `npm run smoke:docker` 均通过。
- 边界：本次只完成 M1-02 容器生命周期与最小挂载，不声称完成 M1-03 完整资源/网络/权限策略，也不声称 ISO-01 至 ISO-14 隔离烟测通过。

## 2026-07-13 - M1-03 资源/网络/权限策略

- 目标：把 M1-02 的 Docker 安全参数沉淀为可复用策略，并用真实容器 smoke 验证首批资源、网络和权限边界。
- 实现：新增 `src/runner-policy.mjs` 和 `tests/runner-policy.test.mjs`；`docker-runner` 改为从策略模块生成 Docker 参数和生命周期 smoke 脚本。
- 真实结果：`npm run smoke:docker` 通过；容器内验证非 root 用户、无 Docker Socket、未复制 `.env`/`.npmrc`、workspace 和根文件系统只读、向 `1.1.1.1:80` 的网络连接未成功。
- 校验：`npm run lint`、`npm test` 和 `npm run smoke:docker` 均通过。
- 边界：M1-03 不是完整 ISO-01 至 ISO-14 隔离烟测；后续 M1-07 仍需专门保存全量隔离证据。

## 2026-07-13 - M1-04 install/build/test 结构化记录

- 目标：在受限 Docker 容器内执行 RunnerProfile 的 install/build/test 命令，并输出后续验证器可消费的结构化命令记录。
- 实现：新增 `agentproof run --profile <path> --commands [--json]` 和根脚本 `npm run run:demo`；Runner 复用临时 workspace，分别运行 install、build、test 三个容器阶段，并记录 phase、完整命令、退出码、stdout/stderr、开始/结束时间和耗时。
- Demo 调整：官方 Demo RunnerProfile 改用 `node:20-bookworm`、`pnpm@10.17.1`、`onlyBuiltDependencies`、`pids=512` 和 `command_timeout_ms=600000`；build 阶段显式运行 `pnpm run prisma:generate && pnpm run build`，避免断网 build 阶段再下载 Corepack 或缺 Prisma Client。
- 真实结果：`npm run run:demo` 通过，runId 为 `m1-smoke-mriskluq`，镜像 digest 为 `sha256:8f693eaa7e0a8e71560c9a82b55fd54c2ae920a2ba5d2cde28bac7d1c01c9ba5`；install 使用 `--network bridge`，build/test 使用 `--network none`，三阶段退出码均为 0，官方 Demo 测试 8 passed，临时目录清理为 `removed`。
- 校验：`npm install --package-lock-only --ignore-scripts`、`npm run lint`、`npm run profile:validate`、`npm test`、`npm run smoke:docker` 和 `npm run run:demo` 均通过。
- 边界：M1-04 不等于 M1 完成；依赖源细粒度白名单、取消/超时诊断、3 个样例、10 次重复运行和 ISO-01 至 ISO-14 全量隔离烟测仍是后续 M1 任务。

## 2026-07-13 - M1-05 取消、超时、清理与诊断

- 目标：让 Runner 在命令超时或取消时返回明确状态，并清理可能遗留的已命名 Docker 容器和临时 workspace。
- 实现：Docker 命令记录新增 `errorCode`、`signal`、`timedOut` 和 `cancelled` 字段；timeout/cancelled 不再笼统归为 `failed`，而是返回顶层 `timeout` 或 `cancelled`。
- 清理：当容器命令 timeout 或 cancelled 时，Runner 会执行 `docker rm -f <container>`，并把该清理命令记录到原命令的 `containerCleanup` 字段；临时目录删除失败会保留 `cleanupError`。
- 自动测试：`npm test` 新增 timeout 与 cancelled 两条路径，覆盖状态分类、错误原因、容器强制清理和临时 workspace 清理。
- 真实结果：临时 timeout profile 将 install 命令设为 10 秒睡眠并把 `command_timeout_ms` 设为 1000ms；真实 Docker run 返回 `timeout`，错误为 `install command timed out`，`containerCleanup.exitCode=0`，`docker ps -a` 确认 `agentproof-m1-smoke-mrit40pz-install` 无遗留。
- 校验：`npm run lint`、`npm test`、`npm run profile:validate`、`npm run smoke:docker` 和真实 Docker timeout smoke 均通过。
- 边界：本次不实现 M1-06 的 3 个样例和 10 次重复测试，不进入 M2/M3，不开发浏览器验证器、GitHub App 或完整 Web。

## 2026-07-13 - M1-06 3 个样例与 10 次重复测试

- 目标：验证 Runner 能在支持矩阵内的多个规范 Node.js 项目上重复运行，并记录一致性证据。
- 样例：新增 `samples/minimal-npm-api/`、`samples/minimal-npm-state/` 和 `samples/minimal-npm-files/`；三者均为 Node.js 20、npm lockfile、零外部依赖、显式 install/build/test/start 和 HTTP `/health`。
- 实现：新增 `scripts/run-m1-repeatability.mjs` 与根脚本 `npm run m1:repeatability`，顺序运行三个样例的 RunnerProfile，并对 `minimal-npm-state` 连续运行 10 次，生成 `artifacts/m1-repeatability/summary.json` 和 `report.md`。
- 真实结果：`npm run m1:repeatability` 通过；三个样例均 `passed`，install/build/test 三阶段退出码均为 0，临时 workspace 均清理为 `removed`；repeat target 为 `minimal-npm-state`，repeat count 为 10，unique repeat signatures 为 1。
- 调整：官方 Demo 仍保留为 M1-04 的复杂 pnpm/SQLite/Prisma 样例；M1-06 重复稳定性改用零外部依赖样例，避免 native dependency 在 install 阶段重新拉取 Node headers 时引入网络波动。
- 边界：本次不实现 ISO-01 至 ISO-14 隔离烟测，不进入 M2/M3，不开发 API 验收、浏览器验证器、GitHub App 或完整 Web。

## 2026-07-13 - M1-07 14 项隔离烟测与安全评审

- 目标：用真实 Docker 路径或同等 Runner 策略验证 `docs/threat-model.md` 中 ISO-01 至 ISO-14 的隔离要求，并保存可复查证据。
- 实现：新增 `scripts/run-m1-isolation-smoke.mjs` 与根脚本 `npm run m1:isolation`；生成 `artifacts/m1-isolation-smoke/summary.json` 和 `artifacts/m1-isolation-smoke/report.md`。
- Runner 调整：`src/docker-runner.mjs` 在命令阶段结束后检查 stdout/stderr 字节数、workspace 文件数和 workspace 字节数，超过 RunnerProfile 限额时返回受控 `failed` 并记录 `resourceLimitExceeded`；临时目录清理支持注入失败以验证 `cleanupError`。
- 真实结果：`npm run m1:isolation` 通过，runId 为 `m1-isolation-smoke-mriu27bv`；14 项 ISO smoke 均为 `passed`；Docker server 为 `29.6.1`；镜像 digest 为 `sha256:8f693eaa7e0a8e71560c9a82b55fd54c2ae920a2ba5d2cde28bac7d1c01c9ba5`。
- 覆盖范围：宿主路径不可见、SSH/Git/npm/env 凭据不复制、Docker Socket 不存在、只读 workspace、默认无网络、内存/PID/CPU 限制可观测、文件数配额受控失败、timeout 后容器清理、非 root/no-new-privileges/drop capabilities、路径穿越边界、目标代码不能写可信 Manifest、敏感金丝雀不进入容器环境、repeatability digest 证据可查、清理失败注入可见可重试。
- 校验：`npm run lint`、`npm test`、`npm run profile:validate`、三个最小样例 profile 校验、`npm run docker:check`、`npm run smoke:docker`、`npm run m1:repeatability`、`npm run m1:isolation`、JSON 解析、Markdown 本地链接、`cases/` 为空和 `git diff --check` 均通过。
- 边界：本次不宣称 Docker 是绝对安全边界，不进入 M2/M3，不开发 API 验收、浏览器验证器、GitHub App 或完整 Web。下一步是 M1 退出门禁审计。

## 2026-07-13 - M1 退出门禁审计

- 目标：确认 M1 安全执行内核与 CLI POC 是否满足进入 M2 的量化门禁。
- 结论：M1 可以结束并进入 M2；新增 `docs/milestones/M1-exit-review.md`，并在 `docs/decision-log.md` 记录 ADR-014。
- 证据：3 个支持矩阵内样例 install/build/test 通过；`minimal-npm-state` 连续 10 次运行唯一签名数为 1；ISO-01 至 ISO-14 全部 `passed`；Docker Socket、宿主路径、凭据和敏感金丝雀均未暴露；timeout/cancel/cleanup 路径有自动测试或烟测覆盖。
- 状态更新：`README.md`、`tech_stack.md`、`docs/execution-status.md` 和 `.agent/PLANS.md` 已切换到 M2-01。
- 边界：M1 退出不代表已实现 API 验收、Evidence Manifest、浏览器验证器、GitHub App 或完整 Web；M2 必须继续沿用 M1 隔离边界。

## 2026-07-13 - M2-01 领域模型、状态与 Zod Schema

- 目标：建立 M2 API-first 验收闭环的领域 Schema 单一事实来源，并确保状态/合并建议与 `docs/glossary.md` 一致。
- 实现：新增 `src/domain/status.mjs`、`src/domain/schemas.mjs`、`scripts/generate-domain-schemas.mjs`、`tests/domain-schema.test.mjs`，并引入锁定版本的 `zod@4.4.3`。
- 生成物：`npm run schema:generate` 从 Zod 生成 `schemas/domain/acceptance-criterion.schema.json`、`verification-run.schema.json` 和 `verification-report.schema.json`。
- 规则：六个底层状态为 `passed`、`failed`、`insufficient_spec`、`infrastructure_error`、`unverifiable`、`unstable`；四个合并建议为 `recommend_merge`、`do_not_merge`、`human_review`、`indeterminate`；`status_counts` 必须包含六个状态键，不使用模糊总分。
- 校验：`npm run schema:generate`、`npm run lint` 和 `npm test` 均通过；测试总数为 21。
- 边界：本次不实现验收项持久化版本、API 执行、数据库检查、Evidence Manifest、脱敏、报告渲染、浏览器验证器、GitHub App 或完整 Web。下一步是 M2-02 验收项编辑/确认/版本。

## 2026-07-13 - M2-02 验收项编辑/确认/版本

- 目标：让验收项在进入验证运行前具备可审计版本与显式用户确认边界。
- 实现：新增 `src/domain/acceptance-versions.mjs` 和 `tests/acceptance-versions.test.mjs`；`src/domain/schemas.mjs` 新增 `AcceptanceCriterionVersionSchema` 与确认状态 Schema。
- 能力：可创建 draft v1、从上一版本生成独立 draft 修订、显式确认版本，并阻止未确认版本进入验证运行；修订不得改变 `criterion_id`。
- 生成物：`npm run schema:generate` 现在生成 4 个 JSON Schema，新增 `schemas/domain/acceptance-criterion-version.schema.json`。
- 校验：`npm run schema:generate`、`npm run lint` 和 `npm test` 均通过；测试总数为 25。
- 边界：本次不实现 UI、数据库持久化、API 执行、Evidence Manifest、脱敏、报告渲染、浏览器验证器、GitHub App 或完整 Web。下一步是 M2-03 API 与数据库断言。

## 2026-07-13 - M2-03 API 与数据库断言

- 目标：实现 API-first 闭环的最小断言判断能力，让状态码、JSON 字段、响应头、耗时和数据库快照可以产生确定性结果。
- 实现：新增 `src/domain/assertions.mjs` 和 `tests/assertions.test.mjs`；`ApiAssertionSchema` 增加 `expected_headers`。
- 能力：`runApiAssertion` 使用 Node 内置 `fetch` 调用本地 HTTP API；`evaluateApiAssertion` 可判断已采集响应；`evaluateDatabaseAssertion` 判断已采集数据库快照字段；`evaluateCriterionAssertions` 聚合为 CriterionResult 形状。
- 校验：`npm run schema:generate`、`npm run lint` 和 `npm test` 均通过；测试总数为 29。
- 边界：本次不启动官方 Demo 服务，不直接连接 SQLite，不生成 Evidence Manifest，不做脱敏或报告渲染；真实数据库连接、证据哈希和报告链路留给后续 M2 任务。下一步是 M2-04 随机数据与种子。

## 2026-07-13 - M2-04 随机数据与种子

- 目标：为 API-first 验证提供可重放的随机测试数据，并把 seed 与生成值绑定记录。
- 实现：新增 `src/domain/test-data.mjs` 和 `tests/test-data.test.mjs`；`src/domain/schemas.mjs` 新增 `TestDataSeedSchema`。
- 能力：`createSeededRng` 对同一 seed 生成稳定整数和 token；`demoRegistrationData` 生成可重放 Demo 注册邮箱、密码和显示名；`seedRecord` 保留 `seed`、`purpose` 与 `values`。
- 生成物：`npm run schema:generate` 现在生成 5 个 JSON Schema，新增 `schemas/domain/test-data-seed.schema.json`。
- 校验：`npm run schema:generate`、`npm run lint` 和 `npm test` 均通过；测试总数为 32。
- 边界：该生成器不是密码学随机数；本次不实现 Evidence Manifest、脱敏、报告渲染、数据库持久化、浏览器验证器、GitHub App 或完整 Web。下一步是 M2-05 证据采集、Manifest 与脱敏。

## 2026-07-13 - M2-05 证据采集、Manifest 与脱敏

- 目标：建立本地 MVP 的证据哈希、Manifest 结构和字段级脱敏基础。
- 实现：新增 `src/domain/manifest.mjs`、`src/domain/redaction.mjs` 和 `tests/manifest-redaction.test.mjs`；`src/domain/schemas.mjs` 新增 `EvidenceManifestSchema` 与 `RedactionSummarySchema`。
- 能力：`evidenceRef` 生成证据路径与 sha256；`createEvidenceManifest` 绑定 run_id、commit、runner_profile、image_digest、seed、evidence 和 redaction；`redactSensitive` 递归脱敏 authorization、cookie、password、token、secret、api key 等敏感键。
- 生成物：`npm run schema:generate` 现在生成 6 个 JSON Schema，新增 `schemas/domain/evidence-manifest.schema.json`。
- 校验：`npm run schema:generate`、`npm run lint` 和 `npm test` 均通过；测试总数为 34。
- 边界：本次不实现签名密钥、长期证据存储、访问控制、报告渲染、浏览器 Trace、GitHub App 或完整 Web。下一步是 M2-06 HTML/Markdown 报告与聚合。

## 2026-07-13 - M2-06 HTML/Markdown 报告与聚合

- 目标：把逐项 CriterionResult 聚合为 M2 报告，不使用模糊总分，并确保不可信输出在 HTML 中被转义。
- 实现：新增 `src/domain/report.mjs` 和 `tests/report.test.mjs`。
- 能力：`createVerificationReport` 计算六状态计数和四类合并建议；`renderMarkdownReport` 输出文本报告；`renderHtmlReport` 输出转义后的最小 HTML 报告。
- 校验：`npm run schema:generate`、`npm run lint` 和 `npm test` 均通过；测试总数为 37。
- 边界：本次不实现完整 Web UI、样式系统、证据文件落盘、签名、访问控制、浏览器 Trace、GitHub App 或完整 Web。下一步是 M2-07 官方 Demo 五类需求端到端回归与安全复审。

## 2026-07-13 - M2-07 Demo 五类需求端到端回归与安全复审

- 目标：把官方 Demo 正确基线和五类官方缺陷串入 M2 report、Manifest、seed 与证据哈希链路。
- 实现：新增 `scripts/run-m2-demo-regression.mjs` 和根脚本 `npm run m2:demo-regression`；生成 `artifacts/m2-demo-regression/` 下的 baseline、defects、seed、manifest、summary、Markdown 报告和 HTML 报告。
- 结果：`npm run m2:demo-regression` 通过；6 个 criterion 均 `passed`，合并建议为 `recommend_merge`；正确基线通过，五类缺陷均被区分。
- Demo 脚本调整：缺陷验证改为调用本地 `node_modules/.bin/tsx`，weakened_tests 探针改为 `node scripts/test.mjs`，避免 `pnpm exec` 在回归时触发 build-approval 状态检查。
- 安全复审：Manifest 绑定 commit、RunnerProfile、M1 镜像 digest、seed 和证据 sha256；脱敏摘要纳入 Manifest；正式 `cases/` 仍为空，公开候选未设置 `approved`、`source_verified` 或 `reproduced`。
- 边界：本次不开发浏览器验证器、GitHub App、完整 Web 或 M3/M4 能力。下一步是 M2 退出门禁审计。

## 2026-07-13 - M2 退出门禁审计

- 目标：确认 M2 API-first 垂直验收闭环是否满足进入 M3 的量化门禁。
- 结论：M2 可以结束并进入 M3；新增 `docs/milestones/M2-exit-review.md`，并在 `docs/decision-log.md` 记录 ADR-015。
- 证据：领域 Schema、验收项版本、API/数据库断言、随机数据与 seed、Manifest、脱敏、报告聚合和官方 Demo 正确/五类缺陷回归均有测试或 artifact；`npm run m2:demo-regression` 结果为 `recommend_merge`。
- 状态更新：`README.md`、`tech_stack.md`、`docs/execution-status.md` 和 `.agent/PLANS.md` 已切换到 M3-01。
- 边界：M2 退出不代表已实现浏览器验证器、测试 Diff 风险模型、轻量硬编码检测、GitHub App、完整 Web、外部 Alpha 或真实用户验证；M3 必须继续沿用 M1/M2 隔离、Manifest、seed 和脱敏边界。

## 2026-07-13 - M3-01 浏览器步骤 Schema 与单流程执行

- 目标：在不进入 M4、不开发完整 Web/GitHub App 的前提下，完成一条官方 Demo 关键浏览器流程的结构化定义和真实执行。
- 实现：新增 `BrowserFlowSchema`、`schemas/domain/browser-flow.schema.json`、`src/domain/browser-flow.mjs`、`tests/browser-flow.test.mjs` 和 `scripts/run-m3-browser-smoke.mjs`；根项目新增 `playwright-core`，复用本机 Chrome/Edge，不下载 Playwright 浏览器包；新增 `npm run m3:browser-smoke` 和 `artifacts/m3-browser-smoke/`。
- Demo 修复：真实浏览器 smoke 暴露官方 Demo 任务表单在异步提交后读取 `event.currentTarget` 为 `null`，页面显示 JS 错误而不是保存成功；已在 `samples/demo-web-app/static/app.js` 中先保存 `form` 引用，维持正确基线。
- 验证：`npm run schema:generate` 通过，生成 7 个领域 JSON Schema；`npm run lint` 通过；`npm test` 通过，40 个测试全部通过；`npm run m3:browser-smoke` 通过，runId 为 `m3-browser-mrizyiam`，本机 Chrome 版本为 `150.0.7871.101`，注册、登录态确认、任务写入和普通用户管理员接口拒绝检查均通过。
- 边界：本轮不采集截图、网络、控制台或 Trace，不做页面/API/数据库联合断言，不做测试 Diff 风险或硬编码检测，不进入 M4，不迁移正式 `cases/`，不设置 `approved`、`source_verified` 或 `reproduced`。
- 后续：进入 M3-02，只在现有浏览器单流程基础上增加截图、网络、控制台和可选 Trace 证据采集与脱敏。

## 2026-07-13 - M3-02 浏览器证据采集与脱敏

- 目标：在 M3-01 单流程浏览器执行基础上采集可审计证据，同时最小化敏感内容落盘。
- 实现：新增 `src/domain/browser-evidence.mjs` 和 `tests/browser-evidence.test.mjs`；`npm run m3:browser-smoke` 现在写入 `browser-events.json`、`final-screen.png`、`manifest.json`、`summary.json` 和 `report.md`，并把 browser event log 与 screenshot 作为 evidence refs 挂入 report。
- 脱敏：事件日志会移除 URL query 并脱敏 email/token/password 等文本；截图前主动把 DOM 中的邮箱和密码输入替换为脱敏值。Trace 支持通过 `AGENTPROOF_BROWSER_TRACE=1` 显式启用，默认禁用以避免保存 DOM/输入快照。
- 验证：`npm run schema:generate` 通过，仍生成 7 个领域 JSON Schema；`npm run lint` 通过；`npm test` 通过，43 个测试全部通过；`npm run m3:browser-smoke` 通过，runId 为 `m3-browser-mrj13e5y`，1 个 browser criterion 为 `passed`，合并建议为 `recommend_merge`；已目检截图确认邮箱/密码明文不出现在截图中，artifact 脱敏扫描无邮箱/密码/token 明文。
- 边界：本轮不做页面/API/数据库联合断言，不做测试 Diff 风险或硬编码检测，不进入 M4，不迁移正式 `cases/`，不设置 `approved`、`source_verified` 或 `reproduced`。
- 后续：进入 M3-03，联合页面、API 与数据库证据判断同一验收项。

## 2026-07-13 - M3-03 页面/API/数据库联合断言

- 目标：验证同一浏览器操作结果是否同时反映在页面、同会话 API 和 SQLite 持久化层，避免只看页面或只看 API 的单点误判。
- 实现：新增 `JoinedAssertionSchema`、`schemas/domain/joined-assertion.schema.json`、`src/domain/joined-assertions.mjs` 和 `tests/joined-assertions.test.mjs`；`npm run m3:browser-smoke` 现在写入 `joined-observation.json`，并把 joined observation 作为 evidence ref 纳入 report 与 Manifest。
- 验证：`npm run schema:generate` 通过，生成 8 个领域 JSON Schema；`npm run lint` 通过；`npm test` 通过，45 个测试全部通过；`npm run m3:browser-smoke` 通过，runId 为 `m3-browser-mrj1osq3`，2 个 criterion 均 `passed`，合并建议为 `recommend_merge`。joined observation 显示页面可见、API 200 返回同一任务、SQLite 中存在同一任务。
- 边界：本轮不做测试 Diff 风险或硬编码检测，不进入 M4，不迁移正式 `cases/`，不设置 `approved`、`source_verified` 或 `reproduced`。
- 后续：进入 M3-04，比较测试、CI、Mock、Fixture 和断言变化，只输出风险与具体 Diff。

## 2026-07-13 - M3-04 测试与配置 Diff 风险模型

- 目标：比较测试、CI、Mock、Fixture 和断言变化，输出具体风险与 Diff 证据，但不直接指控作弊。
- 实现：新增 `DiffRiskReportSchema`、`schemas/domain/diff-risk-report.schema.json`、`src/domain/diff-risk.mjs`、`tests/diff-risk.test.mjs` 和 `scripts/run-m3-diff-risk-smoke.mjs`；新增 `npm run m3:diff-risk` 与 `artifacts/m3-diff-risk/`。
- 能力：可识别测试 skip/only、测试断言删除、CI 忽略失败、测试配置排除和 Mock/Fixture 变化；风险记录包含类别、严重度、文件、行号、摘要和具体证据文本。
- 验证：`npm run schema:generate` 通过，生成 9 个领域 JSON Schema；`npm run lint` 通过；`npm test` 通过，48 个测试全部通过；`npm run m3:diff-risk` 通过，对官方 `weakened_tests` 补丁输出 1 条 high `weakened_tests` 风险，建议为 `human_review`。
- 边界：本模型只提示风险和证据，不直接判定作弊；本轮不做硬编码检测，不进入 M4，不迁移正式 `cases/`。
- 后续：进入 M3-05，增加只读规则与随机化硬编码检测。

## 2026-07-13 - M3-05 只读规则与随机化硬编码检测

- 目标：固定验收规则目录只读边界，并用随机等价输入发现固定账号/固定输入类硬编码风险。
- 实现：新增 `ReadOnlyRuleReportSchema`、`HardcodedProbeReportSchema`、`schemas/domain/readonly-rule-report.schema.json`、`schemas/domain/hardcoded-probe-report.schema.json`、`src/domain/readonly-rules.mjs`、`src/domain/hardcoded-detection.mjs`、对应测试和 `scripts/run-m3-hardcoded-smoke.mjs`；新增 `npm run m3:hardcoded` 与 `artifacts/m3-hardcoded-randomization/`。
- 能力：只读规则检查确认官方 RunnerProfile 中规则目录为 `read_only`、workspace 为临时副本、Docker Socket/宿主 home/SSH/真实 env 禁止、目标输出不可信；硬编码检测比较固定 demo 输入和随机等价输入，只输出 human_review 风险。
- 验证：`npm run schema:generate` 通过，生成 11 个领域 JSON Schema；`npm run lint` 通过；`npm test` 通过，54 个测试全部通过；`npm run m3:hardcoded` 通过，官方 `hardcoded_behavior` 补丁触发 1 条随机化硬编码风险，且补丁运行后已还原 Demo 源码。
- 边界：本模型不直接指控作弊；本轮不做 M3 退出审计，不进入 M4，不迁移正式 `cases/`。
- 后续：进入 M3-06，做官方 Demo 缺陷回归、3 次一致性和内部可用性检查。

## 2026-07-13 - M3-06 官方 Demo 回归、3 次一致性与退出审计

- 目标：完成 M3 最终回归与退出门禁审计，并停止在 M3 完成状态，不自动进入 M4。
- 实现：新增 `scripts/run-m3-regression.mjs`、`npm run m3:regression`、`artifacts/m3-regression/summary.json`、`artifacts/m3-regression/report.md` 和 `docs/milestones/M3-exit-review.md`；在 `docs/decision-log.md` 记录 ADR-016。
- 结果：`npm run m3:regression` 通过；浏览器正确基线连续 3 次均 `passed` 且 2 个 criterion 全部通过；五类官方缺陷 5/5 `reproduced`；Diff 风险和 hardcoded 随机化检查通过；内部可用性检查通过。
- 验证边界：M3 完成不代表已经实现 GitHub App、Alpha 发布、外部项目验证、真实用户工作流或完整 Web；这些属于 M4 或更晚阶段。
- 后续：停止等待用户是否明确授权进入 M4；不得自动推送、发布、配置远程或创建 GitHub App。

## 2026-07-13 - M3-07 最小本地 Web 用户入口

- 背景：用户实际核查后指出 M3-06 的 `m3:regression`、静态报告和官方 Demo 页面不能等同于 AgentProof 可操作 Web 界面；本轮不进入 M4，只补齐 M3 本地 Web 入口。
- 实现：新增 `src/web/` 本地服务和 vanilla HTML/CSS/JS 页面，新增 `scripts/start-web.mjs`、`npm run web:dev`、`npm run web:start` 和 `scripts/run-m3-web-smoke.mjs`。Web 后端复用现有 Docker preflight、Runner CLI、M3 browser smoke、领域状态、Evidence Manifest 和报告渲染模块，不复制第二套验收引擎。
- 用户流程：页面可输入本地 Git 仓库路径、显示仓库名/分支/Commit/工作区状态、展示 RunnerProfile install/build/test/start 命令、编辑或标记验收项、点击开始验收、防止重复创建相同运行、显示 install/build/test/API/browser/database/report 阶段、展示逐项状态/失败原因/证据/merge recommendation，并打开 HTML 或下载 Markdown 报告。
- Runner 稳定性修复：容器命令增加 `npm_config_nodedir=/usr/local`，避免 native SQLite fallback 编译时重新下载 Node headers；官方 Demo RunnerProfile 文件数上限从 20000 调整为 30000，以匹配当前依赖实际安装文件数。
- 验证：`npm run run:demo` 通过，Docker 内 install/build/test 均成功；`npm run m3:web-smoke` 通过，真实浏览器连续 3 次从页面导入官方 Demo 并发起验收，三次均 `passed` / `recommend_merge`，错误路径和 Docker 不可用错误显示均通过。
- 边界：本地 Web 入口只监听 `127.0.0.1`，不包含账号系统、GitHub App、Alpha 发布、外部项目验证、云端部署或完整多项目平台；仍停止在 M3，等待用户是否明确授权进入 M4。

## 2026-07-13 - M3-08 本地 Web 原生中文化与基础可用性优化

- 背景：用户确认 M3 本地 Web 功能可用，但界面存在浏览器自动翻译痕迹，需要改为原生简体中文并优化普通用户阅读日志的体验；本轮仍不进入 M4。
- 实现：`src/web/static/index.html` 设置 `lang="zh-CN"`；`src/web/static/app.js` 增加状态和合并建议的中文显示映射，项目导入、需求、验收标准、运行配置、运行进度、验收结果、证据、报告链接、错误提示和空状态均改为中文；`src/web/static/styles.css` 修复顶部标题裁切、中文换行、按钮对齐和状态徽章样式；`src/domain/report.mjs` 将 HTML/Markdown 报告标题和表头改为中文，同时保留原始状态枚举值。
- 日志展示：Web 后端继续保留原始 stdout/stderr，不翻译命令、路径、Commit、JSON 字段或运行日志；页面默认显示“安装依赖、构建项目、运行测试、启动服务、API 验证、浏览器验证、数据库验证、生成报告”等阶段摘要、状态、耗时和简短结果，完整日志按阶段折叠，通过“查看完整日志 / 收起日志”切换。
- 测试更新：`scripts/run-m3-web-smoke.mjs` 现在验证中文界面标签、中文状态、中文报告链接、中文验收项填写、日志折叠/展开、HTML 与 Markdown 报告打开，以及非法路径和 Docker 不可用错误路径。
- 验证：`npm run web:start` 启动后真实浏览器导入 `samples/demo-web-app` 并完成一次验收，状态显示“通过”、合并建议显示“建议合并”，日志可展开/收起，报告可打开；`npm test`、`npm run lint`、`npm run m3:web-smoke` 和 `npm run m3:regression` 均通过。
- 边界：本轮只改 Web 显示、用户文案、阶段摘要和 Web smoke 验证，不重写 Runner、CLI、验证器、证据逻辑，不创建 GitHub App，不进入 M4。

## 2026-07-13 - M3-09 需求与验收标准编辑控件完善

- 背景：M3 本地 Web MVP 已可用，但“需求与验收标准”区域缺少基础编辑控制；用户要求只优化前端交互和必要接口，不修改 Runner、CLI、验证器、领域状态枚举或证据逻辑。
- 实现：页面初始不再自动填入官方 Demo 需求或验收项；新增“加载示例”和“清空内容”次要按钮；官方 Demo 示例需求和验收项集中由 `/api/example` 提供，只有用户主动点击才加载。已有内容时加载示例会用中文确认覆盖，清空内容会用中文确认且不影响已导入项目路径和仓库检查结果。
- 验收项编辑：新增每项“删除验收项”危险操作按钮，允许删除任意项和最后一项；删除后显示空状态，不自动重建“手动验收项”。新增验收项使用稳定唯一 ID，标题和描述默认为空，仅通过 placeholder 引导填写，状态默认 `insufficient_spec` 并在页面显示“需求描述不足”。
- 测试更新：`scripts/run-m3-web-smoke.mjs` 覆盖初始空状态、加载示例、覆盖确认、清空确认、添加多个验收项、删除中间项不串位、删除全部后空状态、新增项 placeholder、真实验收、报告导出和 Docker 不可用错误路径。
- 验证：`npm test`、`npm run lint`、`npm run m3:web-smoke`、`npm run m3:regression` 和 `git diff --check` 均通过；仍不进入 M4。

## 2026-07-14 - 公开安全导出分支准备

- 背景：用户要求保留 `master` 和完整本地历史，同时另建公开安全导出分支；本轮不得添加远程、不得 push、不得重写 `master` 历史。
- 分支：从干净的 `master` 创建 `chore/public-upload-safety`。
- 清理：公开分支从 Git 跟踪中移除本地生成的 `artifacts/` 运行报告、截图、Manifest、trace 类证据和原始 Word 计划书；保留 `artifacts/.gitkeep` 作为目录锚点。
- 忽略规则：`.gitignore` 改为默认忽略所有生成 artifacts、数据库、trace、日志、依赖、密钥和 `docs/source/*.docx`，公开仓库只保留可重新生成的源码、测试、Schema、Demo 和文档。
- 脱敏：公开文档中的本机路径替换为 `<REPO_ROOT>`、`<WORKSPACE_ROOT>`、`<DOCKER_CLI_PATH>`、`<PRIVATE_SOURCE_DIR>` 等占位符；测试和 smoke 脚本中的个人用户名或硬编码本机路径改为占位符或环境变量拼接。
- 兼容：`scripts/run-m3-browser-smoke.mjs` 和 `scripts/run-m3-regression.mjs` 不再依赖已跟踪的旧 artifacts；公开导出后可从空 `artifacts/` 重新生成验证结果。
- 许可证：当前没有 `LICENSE` 文件；本轮不自行选择许可证，公开上传前需要用户确认许可证类型。
- 验证：`npm test`、`npm run lint`、`git diff --check`、`npm run m3:web-smoke` 和 `npm run m3:regression` 已在本分支运行；安全扫描未发现高置信真实密钥、Token、Cookie、密码或私钥。

## 2026-07-14 - 公开仓库 M3 范围与运行产物修正

- 背景：用户要求继续完善 `AgentProof-public`，但不进入 M4、不开发 GitHub App、不 push；本轮重点是让公开描述与真实 M3 能力一致，并避免验收过程污染被验收项目。
- 范围修正：README、支持矩阵、M3 文档和执行状态明确说明：RunnerProfile、Docker、install/build/test 可用于符合支持矩阵的本地 Node.js 项目；完整 Playwright/API/SQLite 联合验收当前以官方 Demo 为参考实现，外部项目需要专属流程和断言配置，不能声称自动理解任意项目。
- 产物隔离：新增统一运行数据路径模块，默认把 Web 验收、browser smoke、M3 回归、Runner 临时目录和 Runner 缓存写入 AgentProof 数据目录（Windows 为 `%LOCALAPPDATA%\AgentProof`，macOS/Linux 为 `~/.agentproof`，可用 `AGENTPROOF_DATA_DIR` 覆盖），不再默认写入被验收仓库的 `artifacts/` 或 `.tmp/`。
- 稳定性：Runner 使用 AgentProof 自有 `cache/runner/` 挂载复用 Corepack/pnpm 缓存；当 Docker tag inspect 异常但本地镜像列表仍能匹配 tag 时，Runner 可回退到本地镜像 ID，避免不必要的 Docker Hub pull。
- 行为边界：非官方项目未配置专属验证流程时，浏览器、API、数据库阶段返回 `unverifiable`；仅 install/build/test 通过不会自动给出 `recommend_merge`。官方 Demo 仍按既有 M3 流程执行完整联合验收。
- 状态文档：`AGENTS.md` 从旧的“当前处于 M0”修正为公开版本已完成并停止在 M3；`docs/execution-status.md` 明确是否可以自动继续为“否”，下一步 M4 规划或真实项目兼容验证均需用户确认。
- 公开工程：新增基础 GitHub Actions CI（Node.js 20、`npm ci`、`npm run lint`、`npm test`）和 `SECURITY.md`；CI 不运行 Docker、完整 M3 browser regression 或需要本机 Chrome 的测试。
- 边界：本轮不修改原始开发仓库，不进入 M4，不创建 GitHub App，不配置云服务，不推送远程。

## 2026-07-14 - M3 Windows 桌面安装版

- 背景：用户要求把当前本地 Web MVP 打包为可安装的 Windows 桌面软件；本轮仍属于 M3 分发与易用性增强，不进入 M4，不开发 GitHub App，不配置云端服务，不 push。
- 实现：新增 Electron 桌面壳、单实例启动、随机空闲端口、本次启动随机会话令牌、最小 preload IPC 文件夹选择、桌面日志、官方 Demo 用户数据目录副本、统一子进程启动器、桌面 smoke 和 electron-builder NSIS 配置。
- 安全边界：桌面窗口禁用 Node integration，启用 context isolation、sandbox 和 webSecurity；renderer 不能直接访问 `fs`、`child_process` 或环境变量；桌面模式下 API、报告和证据接口均校验 `x-agentproof-session`，令牌不写入日志、报告或 Manifest。
- 数据目录：安装版默认写入 `%LOCALAPPDATA%\AgentProof\` 下的 `runs/`、`logs/`、`temp/`、`demo/`、`config/`，继续支持 `AGENTPROOF_DATA_DIR`；官方 Demo 首次复制到 `%LOCALAPPDATA%\AgentProof\demo\0.1.0\`，不在安装目录或被验收项目原地写数据库、报告、截图或临时文件。
- 打包：新增 `npm run desktop:dev`、`npm run desktop:smoke`、`npm run desktop:pack`、`npm run desktop:dist:win`；生成 `dist-installer\AgentProof-Setup-0.1.0-x64.exe`，安装包未签名，可能触发 Windows SmartScreen，Docker Desktop 仍需单独安装。
- 验证：`npm ci`、`npm run lint`、`npm test`、`npm run desktop:smoke`、`npm run desktop:pack`、打包后 `win-unpacked\AgentProof.exe --smoke` 和 `npm run desktop:dist:win` 已通过；Electron 二进制下载曾因网络问题临时使用 `ELECTRON_MIRROR` 补齐，未写入仓库配置。
- 边界：不做自动更新、代码签名、自定义图标、托盘、开机启动、macOS/Linux 安装包、GitHub App、云端 Runner 或账号系统。安装/卸载的完整人工验证步骤已记录在 `docs/windows-installer.md`。
