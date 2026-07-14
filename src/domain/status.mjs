export const RESULT_STATUSES = Object.freeze([
  "passed",
  "failed",
  "insufficient_spec",
  "infrastructure_error",
  "unverifiable",
  "unstable"
]);

export const MERGE_RECOMMENDATIONS = Object.freeze([
  "recommend_merge",
  "do_not_merge",
  "human_review",
  "indeterminate"
]);

export function summarizeStatuses(results) {
  const counts = Object.fromEntries(RESULT_STATUSES.map(status => [status, 0]));
  for (const result of results) {
    if (!RESULT_STATUSES.includes(result.status)) {
      throw new Error(`unknown result status: ${result.status}`);
    }
    counts[result.status] += 1;
  }
  return counts;
}

export function recommendMerge(results) {
  if (results.some(result => result.blocking_security_issue || result.status === "failed")) return "do_not_merge";
  if (results.some(result => ["infrastructure_error", "insufficient_spec"].includes(result.status))) return "indeterminate";
  if (results.some(result => ["unverifiable", "unstable"].includes(result.status))) return "human_review";
  return "recommend_merge";
}
