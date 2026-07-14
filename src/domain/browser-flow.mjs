import { BrowserFlowSchema } from "./schemas.mjs";

export async function runBrowserFlow(flow, options) {
  const parsed = BrowserFlowSchema.parse(flow);
  const baseUrl = required(options.baseUrl, "baseUrl").replace(/\/$/, "");
  const page = required(options.page, "page");
  const errors = [];

  for (let index = 0; index < parsed.steps.length; index += 1) {
    const step = parsed.steps[index];
    try {
      await runBrowserStep(page, baseUrl, step, parsed.timeout_ms);
    } catch (error) {
      errors.push(`step ${index + 1} ${step.action}: ${error.message}`);
      break;
    }
  }

  return {
    criterion_id: parsed.flow_id,
    status: errors.length ? "failed" : "passed",
    summary: errors.length ? "Browser flow failed" : "Browser flow passed",
    evidence: [],
    errors,
    blocking_security_issue: false
  };
}

export async function runBrowserStep(page, baseUrl, step, timeoutMs = 5000) {
  if (step.action === "goto") {
    await page.goto(new URL(step.path, `${baseUrl}/`).toString());
    return;
  }
  if (step.action === "fill") {
    await locatorFor(page, step.target).fill(step.value);
    return;
  }
  if (step.action === "click") {
    await locatorFor(page, step.target).click();
    return;
  }
  if (step.action === "expect_text") {
    await expectText(locatorFor(page, step.target), step.text, timeoutMs);
    return;
  }
  if (step.action === "expect_url") {
    await expectUrl(page, step.path, timeoutMs);
  }
}

export function locatorFor(page, target) {
  if (target.strategy === "css") return page.locator(target.selector);
  if (target.strategy === "role") return page.getByRole(target.role, { name: target.name });
  throw new Error(`unknown locator strategy: ${target.strategy}`);
}

async function expectText(locator, expected, timeoutMs) {
  const started = Date.now();
  let actual = "";
  do {
    actual = (await locator.textContent()) ?? "";
    if (actual.includes(expected)) return;
    await pause(100);
  } while (Date.now() - started < timeoutMs);
  throw new Error(`expected text "${expected}", got "${actual}"`);
}

async function expectUrl(page, expectedPath, timeoutMs) {
  const started = Date.now();
  let actual = "";
  do {
    actual = page.url();
    if (new URL(actual).pathname === expectedPath) return;
    await pause(100);
  } while (Date.now() - started < timeoutMs);
  throw new Error(`expected URL path "${expectedPath}", got "${actual}"`);
}

function pause(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function required(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}
