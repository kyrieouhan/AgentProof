# Failure Case 分类体系

版本：`1.0.0`。本文件与 [schema.json](schema.json) 中的分类枚举共同构成 M0-01 冻结基线；主次分类的跨字段约束由 [validate.py](validate.py) 检查。下列示例均为抽象说明，不是真实案例、用户反馈或测试结果。

## 选择规则

- 每条记录选择一个 `primary_category`：最直接决定触发条件和预期检测方法的根因。
- `secondary_categories` 只记录同时成立且具有独立检测价值的其他维度，不得与主分类重复。
- 优先选择更具体的分类；宽泛分类可以作为次分类。
- 暂时无法确定时使用 `needs_review`。它不是长期兜底，不能出现在 `approved` 记录中。
- 不使用 `other`；出现现有体系无法覆盖的稳定新类型时，先修订本文件和 Schema。

## 冻结分类

| 中文名称 | 英文标识 | 定义 | 包含条件 | 排除条件 | 抽象示例 |
| --- | --- | --- | --- | --- | --- |
| 漏实现 | `missing_implementation` | 需求中的完整能力或主要步骤没有对应实现。 | 主流程、接口、数据写入或关键验收项完全缺失。 | 主流程已实现但只漏关键边界时用 `incomplete_edge_cases`；实现存在但仅表象成功时用更具体分类。 | 要求导出文件，但项目中没有入口、接口或生成逻辑。 |
| 表面完成 | `superficial_completion` | 可见界面或系统提示成功，但底层目标动作没有真正完成。 | 成功提示与真实状态变化脱节，且没有更具体的 API/持久化主因。 | 明确 API 与 UI 不一致优先 `ui_api_inconsistency`；刷新后丢失优先 `non_persistent_state`；Agent 口头宣称完成用 `false_completion_claim`。 | 点击保存后出现成功提示，但没有任何实际写入动作。 |
| 测试削弱 | `weakened_tests` | 通过删改测试、断言、Mock、Fixture 或 CI 规则降低独立验证强度。 | 断言被放宽、失败用例删除、Mock 绕开真实路径、CI 不再执行关键检查。 | 合理更新过时测试且验证强度不降低；纯业务漏实现归入对应功能分类。 | 把应为 401 的断言改成接受任意 2xx。 |
| 授权绕过 | `authorization_bypass` | 身份认证、角色或资源级权限可被未授权主体绕过。 | 未登录访问、普通角色执行管理员动作、跨用户读取或修改资源。 | 不涉及访问控制的其他安全问题用 `security_regression`；仅前端入口显示错误不等于越权。 | 普通用户直接请求管理接口即可删除记录。 |
| 硬编码行为 | `hardcoded_behavior` | 实现只对固定账号、ID、输入、时间或公开测试数据工作。 | 改变等价输入后失败，代码或数据路径存在针对固定值的特殊分支。 | 合法业务常量或明确配置；一般边界遗漏用 `incomplete_edge_cases`。 | 只有示例账号能登录，其他合法账号全部失败。 |
| 状态不持久 | `non_persistent_state` | 状态只在内存或页面暂时变化，刷新、重启或重新读取后丢失。 | 操作当下可见成功，随后从持久层恢复时消失。 | 数据已保存但字段错误用 `data_integrity_failure`；API 失败而 UI 成功优先 `ui_api_inconsistency`。 | 编辑后页面更新，刷新后恢复旧值。 |
| UI/API 不一致 | `ui_api_inconsistency` | UI 展示的结果与 API 响应、网络状态或服务端结果矛盾。 | API 明确失败但 UI 显示成功，或 UI 与响应状态不一致。 | API 成功但数据随后丢失优先 `non_persistent_state`；没有 API 证据的泛化表象用 `superficial_completion`。 | 接口返回 500，页面仍弹出“提交成功”。 |
| 构建与运行时不一致 | `build_runtime_mismatch` | 静态构建通过，但应用启动、健康检查或真实请求阶段失败。 | 同一版本构建成功，运行时出现缺模块、启动崩溃或请求即失败。 | 由未声明本地条件明确导致时优先 `environment_dependency`；构建本身失败不属于本类。 | 打包成功，但服务启动即因运行时导入错误退出。 |
| 边界条件不完整 | `incomplete_edge_cases` | 主流程可用，但需求隐含或明确的关键边界、异常或并发条件遗漏。 | 空值、重复值、大小写、权限边界、并发或错误恢复等关键条件未处理。 | 主要功能整体缺失用 `missing_implementation`；纯安全越权用 `authorization_bypass`。 | 正常邮箱可注册，但大小写归一化后重复邮箱未被拒绝。 |
| 虚假完成声明 | `false_completion_claim` | 编程 Agent 在未验证、验证失败或仍有已知错误时宣布任务完成。 | 声明与命令输出、未执行验证或已知失败直接矛盾。 | 产品 UI 的成功提示用 `superficial_completion`；正常的有限度说明不算虚假声明。 | 测试未运行且构建日志仍报错，Agent 却声称“全部完成并通过”。 |
| 数据完整性失败 | `data_integrity_failure` | 持久化数据的值、约束、关系、事务或迁移结果不符合需求。 | 错误字段、重复记录、孤儿关系、事务部分提交、错误迁移或数据破坏。 | 仅未保存用 `non_persistent_state`；访问权限问题用 `authorization_bypass`。 | 创建订单后总额与明细之和不一致。 |
| 安全回归 | `security_regression` | 改动引入明确的新安全弱点，且没有更具体分类完整覆盖。 | 凭据泄漏、危险默认配置、注入面扩大、敏感日志、隔离或加密退化。 | 明确身份或资源越权优先 `authorization_bypass`；纯猜测或无证据风险不成为正式案例。 | 新日志把认证 Token 明文写入控制台。 |
| 非确定性结果 | `nondeterministic_result` | 固定代码和记录条件下重复执行得到不一致的核心结果。 | 相同 Commit、环境和种子重复运行出现通过/失败翻转或状态漂移。 | 由明确未声明环境条件稳定触发时用 `environment_dependency`；已知随机设计且不影响验收不算失败。 | 同一版本连续运行三次，两次成功一次失败，输入相同。 |
| 未声明环境依赖 | `environment_dependency` | 功能依赖没有声明或固定的本地环境、缓存、时钟、外部服务或机器状态。 | 只在开发者机器、已有缓存、特定路径或外部状态存在时工作。 | 已声明且在支持矩阵内的依赖；一般运行时编码错误用 `build_runtime_mismatch`。 | 清空本机缓存后功能失败，但文档和配置没有声明该缓存。 |
| 待人工分类 | `needs_review` | 当前证据不足以在冻结分类中做可靠选择。 | 根因未知、多个类别无法区分或来源描述不完整。 | 只要已有充分证据可选择具体分类，就不得使用；不得出现在 `approved` 记录中。 | 只有“有时保存失败”的描述，尚无日志、步骤或根因信息。 |

## 常见边界裁决

- UI 成功、API 失败：`ui_api_inconsistency` 为主，`superficial_completion` 可为次。
- 保存后刷新丢失：`non_persistent_state` 为主；只有数据库值错误时才用 `data_integrity_failure`。
- Agent 宣称完成但产品 UI 无问题：是否属于 `false_completion_claim` 取决于其声明是否与真实验证证据矛盾。
- 越权由本次改动引入：`authorization_bypass` 为主，`security_regression` 可为次。
- 构建成功但缺少未声明环境变量而启动失败：`environment_dependency` 为主，`build_runtime_mismatch` 可为次。
- 同一环境重复运行漂移：`nondeterministic_result`；不同机器因未声明条件稳定产生差异：`environment_dependency`。
