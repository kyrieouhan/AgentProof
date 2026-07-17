import { VerificationReportSchema, DOMAIN_SCHEMA_VERSION } from "./schemas.mjs";
import { recommendMerge, summarizeStatuses } from "./status.mjs";

export function createVerificationReport({ run_id, results }) {
  return VerificationReportSchema.parse({
    schema_version: DOMAIN_SCHEMA_VERSION,
    run_id,
    results,
    status_counts: summarizeStatuses(results),
    merge_recommendation: recommendMerge(results)
  });
}

export function renderMarkdownReport(report) {
  const parsed = VerificationReportSchema.parse(report);
  const rows = parsed.results.map(result => `| ${cell(result.criterion_id)} | ${cell(displayStatus(result.status))} | ${cell(displaySummary(result.summary))} | ${cell(result.errors.join("; "))} |`).join("\n");
  return `# VeriCrate 验收报告

- 运行编号：${parsed.run_id}
- 合并建议：${displayMerge(parsed.merge_recommendation)}

## 状态统计

${Object.entries(parsed.status_counts).map(([status, count]) => `- ${displayStatus(status)}：${count}`).join("\n")}

## 验收标准

| 验收项 | 状态 | 摘要 | 错误 |
| --- | --- | --- | --- |
${rows}
`;
}

export function renderHtmlReport(report) {
  const parsed = VerificationReportSchema.parse(report);
  const counts = Object.entries(parsed.status_counts).map(([status, count]) => `<li>${escapeHtml(displayStatus(status))}：${count}</li>`).join("");
  const rows = parsed.results.map(result => `<tr><td>${escapeHtml(result.criterion_id)}</td><td>${escapeHtml(displayStatus(result.status))}</td><td>${escapeHtml(displaySummary(result.summary))}</td><td>${escapeHtml(result.errors.join("; "))}</td></tr>`).join("");
  return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>VeriCrate 验收报告</title></head>
<body>
<h1>VeriCrate 验收报告</h1>
<p><strong>运行编号：</strong>${escapeHtml(parsed.run_id)}</p>
<p><strong>合并建议：</strong>${escapeHtml(displayMerge(parsed.merge_recommendation))}</p>
<h2>状态统计</h2>
<ul>${counts}</ul>
<h2>验收标准</h2>
<table>
<thead><tr><th>验收项</th><th>状态</th><th>摘要</th><th>错误</th></tr></thead>
<tbody>${rows}</tbody>
</table>
</body>
</html>
`;
}

function cell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function displayStatus(status) {
  const labels = {
    passed: "通过",
    failed: "失败",
    insufficient_spec: "需求描述不足",
    infrastructure_error: "基础设施错误",
    unverifiable: "无法验证",
    unstable: "结果不稳定"
  };
  return labels[status] ? `${labels[status]} (${status})` : status;
}

function displayMerge(value) {
  const labels = {
    recommend_merge: "建议合并",
    do_not_merge: "不建议合并",
    human_review: "需要人工复核",
    indeterminate: "暂时无法判断"
  };
  return labels[value] ? `${labels[value]} (${value})` : value;
}

function displaySummary(summary) {
  const labels = {
    "Browser flow passed": "浏览器流程已通过。",
    "Page, API, and database observations matched": "页面、API 与数据库证据一致。"
  };
  return labels[summary] ?? summary;
}
