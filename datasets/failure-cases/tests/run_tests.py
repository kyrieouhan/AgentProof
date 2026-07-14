#!/usr/bin/env python3
"""Run failure-case semantic-validator fixtures through the public CLI."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


TESTS_DIR = Path(__file__).resolve().parent
DATASET_DIR = TESTS_DIR.parent
VALIDATOR = DATASET_DIR / "validate.py"

VALID_INPUTS = [DATASET_DIR / "example.json", *sorted((TESTS_DIR / "valid").glob("*.json"))]
INVALID_EXPECTATIONS = {
    "approved-is-example.json": "[approved_is_example] $.is_example",
    "approved-model-generated-candidate.json": "[approved_source_type] $.primary_source.source_type",
    "approved-needs-review.json": "[approved_needs_review] $.primary_category",
    "approved-synthetic-demo.json": "[approved_source_type] $.primary_source.source_type",
    "duplicate-of-self.json": "[duplicate_of_is_self] $.deduplication.duplicate_of",
    "failed-to-reproduce-with-success.json": (
        "[failed_to_reproduce_with_success] $.reproduction.successful_reproductions"
    ),
    "merged-without-related-case.json": (
        "[merged_without_related_case] $.deduplication.related_cases"
    ),
    "primary-category-repeated.json": "[primary_category_repeated] $.secondary_categories",
    "raw-output-path-traversal.json": (
        "[raw_output_path_traversal] $.reproduction.raw_output_location"
    ),
    "related-case-is-self.json": "[related_case_is_self] $.deduplication.related_cases",
    "reproduced-without-attempt.json": "[reproduced_without_attempt] $.reproduction.attempts",
    "successful-reproductions-exceed-attempts.json": (
        "[successful_reproductions_exceed_attempts] $.reproduction.successful_reproductions"
    ),
}


def run_validator(path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(VALIDATOR), str(path)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
    )


def main() -> int:
    failures: list[str] = []

    for path in VALID_INPUTS:
        result = run_validator(path)
        if result.returncode != 0:
            failures.append(f"valid fixture rejected: {path.name}\n{result.stdout}{result.stderr}")
        else:
            print(f"PASS valid/{path.name}")

    invalid_files = {path.name: path for path in (TESTS_DIR / "invalid").glob("*.json")}
    if set(invalid_files) != set(INVALID_EXPECTATIONS):
        failures.append(
            "invalid fixture set differs from expectations: "
            f"files={sorted(invalid_files)} expected={sorted(INVALID_EXPECTATIONS)}"
        )

    for name, expected in INVALID_EXPECTATIONS.items():
        path = invalid_files.get(name)
        if path is None:
            continue
        result = run_validator(path)
        output = result.stdout + result.stderr
        if result.returncode == 0:
            failures.append(f"invalid fixture accepted: {name}")
        elif expected not in output:
            failures.append(f"unexpected failure reason for {name}: expected {expected!r}\n{output}")
        else:
            print(f"PASS invalid/{name} -> {expected}")

    if failures:
        print("TEST FAILURES:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print(
        f"SUMMARY valid={len(VALID_INPUTS)} invalid={len(INVALID_EXPECTATIONS)} "
        "all_expected_results=PASS"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
