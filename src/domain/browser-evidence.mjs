const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const SECRET_PAIR = /\b(password|token|secret|api[_-]?key|authorization|cookie)=([^&\s]+)/gi;

export function startBrowserEvidenceRecorder(page) {
  const events = {
    console: [],
    page_errors: [],
    failed_requests: [],
    failed_responses: []
  };
  const handlers = {
    console: message => events.console.push({
      type: valueFrom(message, "type"),
      text: valueFrom(message, "text")
    }),
    pageerror: error => events.page_errors.push({ message: error.message }),
    requestfailed: request => events.failed_requests.push({
      method: valueFrom(request, "method"),
      url: sanitizeUrl(valueFrom(request, "url")),
      failure: request.failure?.()?.errorText ?? "request failed"
    }),
    response: response => {
      const status = valueFrom(response, "status");
      if (status >= 400) {
        const request = response.request();
        events.failed_responses.push({
          method: valueFrom(request, "method"),
          url: sanitizeUrl(valueFrom(response, "url")),
          status
        });
      }
    }
  };

  for (const [event, handler] of Object.entries(handlers)) page.on(event, handler);

  return {
    stop() {
      for (const [event, handler] of Object.entries(handlers)) page.off?.(event, handler);
      return redactBrowserEvents(events);
    }
  };
}

export function redactBrowserEvents(events) {
  const redactedPaths = [];
  const value = redactNode(events, [], redactedPaths);
  return {
    value,
    summary: {
      redacted_count: redactedPaths.length,
      redacted_paths: redactedPaths
    }
  };
}

export function sanitizeUrl(value) {
  try {
    const url = new URL(value);
    return redactText(`${url.origin}${url.pathname}`);
  } catch {
    return redactText(value);
  }
}

function redactNode(value, path, redactedPaths) {
  if (Array.isArray(value)) return value.map((entry, index) => redactNode(entry, [...path, String(index)], redactedPaths));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redactNode(entry, [...path, key], redactedPaths)]));
  }
  if (typeof value !== "string") return value;
  const redacted = redactText(value);
  if (redacted !== value) redactedPaths.push(path.join("."));
  return redacted;
}

function redactText(value) {
  return String(value)
    .replace(EMAIL, "[REDACTED_EMAIL]")
    .replace(SECRET_PAIR, "$1=[REDACTED]");
}

function valueFrom(object, method) {
  return typeof object?.[method] === "function" ? object[method]() : undefined;
}
