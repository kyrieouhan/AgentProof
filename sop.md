# AgentProof 项目 SOP

## 开始任务前

1. 先读 `<WORKSPACE_ROOT>` 全局必读文档。
2. 再读本项目 `AGENTS.md`、`README.md`、`requirements.md`、`tech_stack.md`、`dev_log.md`、`pitfalls.md`、`sop.md`、`retrospective.md`。
3. 阅读 `docs/agentproof-plan.md`、安全与支持文档，以及当前里程碑。
4. 检查现有文件和 Git 状态；不回滚用户内容。
5. 确认本次工作不越过当前里程碑门禁。

## 文档与数据变更

1. 先更新单一事实来源，再同步引用文档。
2. 结果状态只使用 `docs/glossary.md` 的枚举。
3. 范围变化写入 `docs/decision-log.md`。
4. failure case 必须有来源类型、核实状态、脱敏与复现状态；示例或模型生成内容不得冒充真实案例。
5. 中文 Markdown 保存为 UTF-8，并检查乱码标记。

## 验证流程

运行仓库内的只读检查：Markdown 相对链接、JSON Schema 与示例、`python datasets/failure-cases/tests/run_tests.py`、状态枚举、里程碑名称、MVP 边界、安全禁项、采访残留、空文件与乱码扫描。当前只有数据规范校验脚本，没有业务代码，因此不应声称运行了产品测试。

## 交付

报告修改文件、命令、测试、通过项、未完成项、安全和兼容性风险；更新 `dev_log.md`。未通过当前里程碑门禁时，只建议下一步，不提前实现下一里程碑。
