let project = null;
let activeRunId = null;
let pollTimer = null;
let criteria = [];

const statusLabels = {
  pending: "未开始",
  queued: "等待中",
  running: "运行中",
  complete: "已完成",
  passed: "通过",
  failed: "失败",
  insufficient_spec: "需求描述不足",
  infrastructure_error: "基础设施错误",
  unverifiable: "无法验证",
  unstable: "结果不稳定",
  indeterminate: "暂时无法判断",
  user_confirmed: "已确认"
};

const mergeLabels = {
  recommend_merge: "建议合并",
  do_not_merge: "不建议合并",
  human_review: "需要人工复核",
  indeterminate: "暂时无法判断"
};

const stageLabels = {
  project: "项目导入",
  docker: "Docker 预检",
  install: "安装依赖",
  build: "构建项目",
  test: "运行测试",
  start: "启动服务",
  api: "API 验证",
  browser: "浏览器验证",
  database: "数据库验证",
  report: "生成报告",
  runner: "Runner"
};

const evidenceLabels = {
  "browser-events.json": "浏览器事件",
  "final-screen.png": "最终页面截图",
  "joined-observation.json": "页面/API/数据库联合证据",
  "manifest.json": "证据 Manifest",
  "summary.json": "运行摘要",
  "report.md": "Markdown 报告"
};

const els = {
  projectPath: document.querySelector("#project-path"),
  inspectProject: document.querySelector("#inspect-project"),
  projectError: document.querySelector("#project-error"),
  projectSummary: document.querySelector("#project-summary"),
  requirement: document.querySelector("#requirement"),
  criteria: document.querySelector("#criteria"),
  loadExample: document.querySelector("#load-example"),
  clearContent: document.querySelector("#clear-content"),
  addCriterion: document.querySelector("#add-criterion"),
  startRun: document.querySelector("#start-run"),
  runError: document.querySelector("#run-error"),
  runPanel: document.querySelector("#run-panel")
};

boot();

async function boot() {
  criteria = [];
  renderCriteria();
  updateStartButton();
}

els.inspectProject.addEventListener("click", async () => {
  els.projectError.textContent = "";
  els.projectSummary.textContent = "正在检查项目……";
  els.startRun.disabled = true;
  try {
    const payload = await postJson("/api/project", { path: els.projectPath.value });
    project = payload.project;
    renderProject(project);
    updateStartButton();
  } catch (error) {
    project = null;
    els.projectSummary.textContent = "";
    els.projectError.textContent = error.message;
    updateStartButton();
  }
});

els.loadExample.addEventListener("click", async () => {
  if (hasDraftContent() && !window.confirm("加载示例将覆盖当前填写的需求和验收项，是否继续？")) return;
  els.runError.textContent = "";
  try {
    const response = await fetch("/api/example");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `请求失败，状态码 ${response.status}`);
    els.requirement.value = data.example.requirement;
    criteria = withUiIds(data.example.criteria);
    renderCriteria();
  } catch (error) {
    els.runError.textContent = `无法加载示例：${error.message}`;
  }
  updateStartButton();
});

els.clearContent.addEventListener("click", () => {
  if (!window.confirm("确定清空当前需求和全部验收项吗？此操作无法撤销。")) return;
  els.requirement.value = "";
  criteria = [];
  renderCriteria();
  updateStartButton();
});

els.addCriterion.addEventListener("click", () => {
  criteria.push(blankCriterion());
  renderCriteria();
  updateStartButton();
});

els.startRun.addEventListener("click", async () => {
  if (!project || activeRunId) return;
  els.runError.textContent = "";
  els.startRun.disabled = true;
  try {
    const payload = await postJson("/api/runs", {
      project_path: els.projectPath.value,
      requirement: els.requirement.value,
      criteria: readCriteria()
    });
    activeRunId = payload.run_id;
    pollRun();
  } catch (error) {
    activeRunId = null;
    updateStartButton();
    els.runError.textContent = error.message;
  }
});

function renderProject(item) {
  const commands = item.runner_profile?.commands ?? {};
  const profileText = item.runner_profile
    ? (item.runner_profile.valid ? "有效" : `无效：${item.runner_profile.errors.join("; ")}`)
    : "未找到";
  els.projectSummary.innerHTML = `
    <h3>项目概览</h3>
    <dl>
      <dt>项目名称</dt><dd data-testid="project-name">${escapeHtml(item.name)}</dd>
      <dt>分支</dt><dd data-testid="project-branch">${escapeHtml(item.branch)}</dd>
      <dt>提交哈希</dt><dd data-testid="project-commit"><code>${escapeHtml(item.short_commit)}</code></dd>
      <dt>工作区状态</dt><dd>${escapeHtml(item.workspace_status === "clean" ? "干净" : "有未提交修改")}</dd>
      <dt>运行配置</dt><dd data-testid="runner-profile">${escapeHtml(profileText)}</dd>
      <dt>安装命令</dt><dd><code>${escapeHtml(commands.install ?? "未配置")}</code></dd>
      <dt>构建命令</dt><dd><code>${escapeHtml(commands.build ?? "未配置")}</code></dd>
      <dt>测试命令</dt><dd><code>${escapeHtml(commands.test ?? "未配置")}</code></dd>
      <dt>启动命令</dt><dd><code>${escapeHtml(commands.start ?? "未配置")}</code></dd>
    </dl>
  `;
}

function renderCriteria() {
  els.criteria.innerHTML = "";
  if (!criteria.length) {
    els.criteria.innerHTML = `
      <div class="empty-state" data-testid="criteria-empty">
        还没有验收项。你可以先填写需求并添加验收项，也可以点击“加载示例”体验官方 Demo。
      </div>
    `;
    return;
  }
  for (const [index, item] of criteria.entries()) {
    const uiId = ensureUiId(item);
    const wrapper = document.createElement("div");
    wrapper.className = "criterion";
    wrapper.dataset.criterionId = uiId;
    wrapper.dataset.testid = "criterion-card";
    wrapper.innerHTML = `
      <div class="criterion-top">
        <strong>验收项 ${index + 1}</strong>
        <button type="button" class="danger" data-delete-id="${escapeAttr(uiId)}" data-testid="delete-criterion-${index}" aria-label="删除验收项：${escapeAttr(item.title || "未命名验收项")}">删除验收项</button>
      </div>
      <div class="criterion-grid">
        <div>
          <label>标题</label>
          <input data-field="title" data-id="${escapeAttr(uiId)}" data-testid="criterion-title-${index}" value="${escapeAttr(item.title)}" placeholder="请输入验收项标题">
        </div>
        <div>
          <label>状态</label>
          <select data-field="status" data-id="${escapeAttr(uiId)}" data-testid="criterion-status-${index}">
            <option value="user_confirmed"${item.status === "user_confirmed" ? " selected" : ""}>已确认</option>
            <option value="insufficient_spec"${item.status === "insufficient_spec" ? " selected" : ""}>需求描述不足</option>
          </select>
        </div>
      </div>
      <label>描述</label>
      <textarea data-field="description" data-id="${escapeAttr(uiId)}" data-testid="criterion-description-${index}" placeholder="描述可观察、可验证的预期行为">${escapeHtml(item.description)}</textarea>
    `;
    els.criteria.appendChild(wrapper);
  }
  els.criteria.querySelectorAll("[data-field]").forEach(input => {
    input.addEventListener("input", updateCriterionFromField);
    input.addEventListener("change", updateCriterionFromField);
  });
  els.criteria.querySelectorAll("[data-delete-id]").forEach(button => {
    button.addEventListener("click", event => {
      const deleteId = event.currentTarget.dataset.deleteId;
      criteria = criteria.filter(item => item.ui_id !== deleteId);
      renderCriteria();
      updateStartButton();
    });
  });
}

function readCriteria() {
  return criteria.map(({ criterion_id, title, description, severity, status }) => ({
    criterion_id,
    title,
    description,
    severity,
    status
  }));
}

function updateCriterionFromField(event) {
  const item = criteria.find(entry => entry.ui_id === event.target.dataset.id);
  if (!item) return;
  item[event.target.dataset.field] = event.target.value;
  updateStartButton();
}

function blankCriterion() {
  const uiId = createUiId();
  return {
    ui_id: uiId,
    criterion_id: `manual-${uiId}`,
    title: "",
    description: "",
    severity: "medium",
    status: "insufficient_spec"
  };
}

function withUiIds(items) {
  return (Array.isArray(items) ? items : []).map(item => ({ ...item, ui_id: createUiId() }));
}

function ensureUiId(item) {
  if (!item.ui_id) item.ui_id = createUiId();
  return item.ui_id;
}

function createUiId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`;
}

function hasDraftContent() {
  return els.requirement.value.trim().length > 0 || criteria.length > 0;
}

function updateStartButton() {
  els.startRun.disabled = Boolean(activeRunId) || !project?.runner_profile?.valid || criteria.length === 0;
}

async function pollRun() {
  if (!activeRunId) return;
  const response = await fetch(`/api/runs/${activeRunId}`);
  const run = await response.json();
  renderRun(run);
  if (["queued", "running"].includes(run.status)) {
    pollTimer = setTimeout(pollRun, 1000);
  } else {
    clearTimeout(pollTimer);
    activeRunId = null;
    updateStartButton();
  }
}

function renderRun(run) {
  els.runPanel.innerHTML = `
    <div class="run-head">
      <p><strong>运行编号：</strong><code>${escapeHtml(run.run_id)}</code></p>
      <p><strong>状态：</strong>${statusBadge(run.status, "run-status")}</p>
      <p><strong>当前阶段：</strong><span data-testid="current-stage">${escapeHtml(stageName(run.current_stage))}</span></p>
    </div>
    <h3>运行进度</h3>
    <div class="stages">${run.stages.map(renderStage).join("")}</div>
    ${run.report ? renderReport(run) : renderEmptyReport()}
    ${renderLogs(run.logs ?? [])}
  `;
  bindLogButtons();
}

function renderStage(stage) {
  const message = escapeHtml(stage.message || "暂无结果。");
  return `
    <article class="stage stage-${escapeAttr(stage.status)}">
      <div class="stage-top">
        <strong>${escapeHtml(stageName(stage.id))}</strong>
        ${statusBadge(stage.status)}
      </div>
      <dl class="stage-meta">
        <dt>耗时</dt><dd>${escapeHtml(formatDuration(stage.duration_ms))}</dd>
        <dt>结果</dt><dd class="stage-message">${message}</dd>
      </dl>
    </article>
  `;
}

function renderReport(run) {
  return `
    <section class="report">
      <h3>验收结果</h3>
      <p><strong>合并建议：</strong><span data-testid="merge-recommendation" data-recommendation="${escapeAttr(run.report.merge_recommendation)}">${escapeHtml(labelMerge(run.report.merge_recommendation))}</span></p>
      <div class="status-counts">
        ${Object.entries(run.report.status_counts).map(([status, count]) => `<span>${statusBadge(status)} × ${escapeHtml(count)}</span>`).join("")}
      </div>
      <ul class="result-list">
        ${run.report.results.map(result => `
          <li>
            <div>${statusBadge(result.status)} <strong>${escapeHtml(result.criterion_id)}</strong></div>
            <p>${escapeHtml(resultSummary(result))}</p>
            ${result.errors.length ? `<p class="error">${escapeHtml(result.errors.join("; "))}</p>` : ""}
          </li>
        `).join("")}
      </ul>
      <div class="links" data-testid="report-links">
        <a href="${run.report_urls.html}" target="_blank" rel="noreferrer">查看 HTML 报告</a>
        <a href="${run.report_urls.markdown}" download>下载 Markdown 报告</a>
        ${run.evidence.map(item => `<a href="${item.url}" target="_blank" rel="noreferrer">${escapeHtml(evidenceLabel(item.file))}</a>`).join("")}
      </div>
    </section>
  `;
}

function renderEmptyReport() {
  return `<section class="report empty"><h3>验收结果</h3><p class="muted">开始验收后，这里会显示逐项结论、失败原因、证据和合并建议。</p></section>`;
}

function renderLogs(logs) {
  if (!logs.length) {
    return `<section class="logs"><h3>完整日志</h3><p class="muted">暂无日志。运行开始后可在这里查看原始 stdout/stderr。</p></section>`;
  }
  return `
    <section class="logs">
      <h3>完整日志</h3>
      <p class="muted">默认只显示阶段摘要；原始 stdout/stderr 保持不变，可按阶段展开。</p>
      ${logs.map((log, index) => {
        const raw = `[${log.phase}] exit=${log.exit_code}\n\nstdout:\n${log.stdout || ""}\n\nstderr:\n${log.stderr || ""}`;
        return `
          <div class="log-item ${log.exit_code === 0 ? "" : "log-error"}">
            <div class="log-summary">
              <span>${escapeHtml(stageName(log.phase))} · 退出码 ${escapeHtml(log.exit_code)} · ${escapeHtml(formatDuration(log.duration_ms))}</span>
              <button type="button" class="secondary" data-log-toggle="${index}" aria-expanded="false">查看完整日志</button>
            </div>
            ${log.exit_code === 0 ? "" : `<p class="error">错误摘要：${escapeHtml(firstLine(log.stderr || log.stdout) || "该阶段返回非零退出码。")}</p>`}
            <pre data-log-panel="${index}" hidden>${escapeHtml(raw)}</pre>
          </div>
        `;
      }).join("")}
    </section>
  `;
}

function bindLogButtons() {
  els.runPanel.querySelectorAll("[data-log-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      const panel = els.runPanel.querySelector(`[data-log-panel="${button.dataset.logToggle}"]`);
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      button.textContent = expanded ? "查看完整日志" : "收起日志";
      panel.hidden = expanded;
    });
  });
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `请求失败，状态码 ${response.status}`);
  return data;
}

function statusBadge(status, testId = "") {
  return `<span ${testId ? `data-testid="${testId}"` : ""} data-status="${escapeAttr(status)}" class="status-badge status-${escapeAttr(status)}">${escapeHtml(labelStatus(status))}</span>`;
}

function labelStatus(status) {
  return statusLabels[status] ?? status;
}

function labelMerge(value) {
  return mergeLabels[value] ?? value;
}

function stageName(id) {
  return stageLabels[id] ?? id;
}

function resultSummary(result) {
  const known = {
    "Browser flow passed": "浏览器流程已通过。",
    "Page, API, and database observations matched": "页面、API 与数据库证据一致。"
  };
  return known[result.summary] ?? result.summary;
}

function evidenceLabel(file) {
  return `${evidenceLabels[file] ?? "证据"}：${file}`;
}

function formatDuration(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  if (value < 1000) return `${Math.max(0, Math.round(value))} ms`;
  return `${(value / 1000).toFixed(value < 10000 ? 1 : 0)} s`;
}

function firstLine(value) {
  return String(value ?? "").split(/\r?\n/).map(line => line.trim()).find(Boolean) ?? "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("\n", " ");
}
