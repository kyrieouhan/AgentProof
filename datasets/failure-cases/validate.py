#!/usr/bin/env python3
"""Read-only cross-field validation for AgentProof failure-case JSON records."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


Issue = tuple[str, str, str]
BASE_DIR = Path(__file__).resolve().parent
DEFAULT_CASES_DIR = BASE_DIR / "cases"
DISALLOWED_APPROVED_SOURCES = {"synthetic_demo", "model_generated_candidate"}


def _is_int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def validate_record(record: Any) -> list[Issue]:
    """Return semantic issues without modifying or approving the record."""
    if not isinstance(record, dict):
        return [("record_type", "$", "record must be a JSON object")]

    issues: list[Issue] = []
    case_id = record.get("id")
    primary_category = record.get("primary_category")
    secondary_categories = record.get("secondary_categories")
    reproduction_status = record.get("reproduction_status")
    reproduction = record.get("reproduction")
    deduplication = record.get("deduplication")
    primary_source = record.get("primary_source")

    if not isinstance(secondary_categories, list):
        secondary_categories = []
    if not isinstance(reproduction, dict):
        reproduction = {}
    if not isinstance(deduplication, dict):
        deduplication = {}
    if not isinstance(primary_source, dict):
        primary_source = {}

    attempts = reproduction.get("attempts")
    successes = reproduction.get("successful_reproductions")
    if _is_int(attempts) and _is_int(successes) and successes > attempts:
        issues.append((
            "successful_reproductions_exceed_attempts",
            "$.reproduction.successful_reproductions",
            "must be less than or equal to $.reproduction.attempts",
        ))

    if primary_category in secondary_categories:
        issues.append((
            "primary_category_repeated",
            "$.secondary_categories",
            "primary_category must not appear in secondary_categories",
        ))

    related_cases = deduplication.get("related_cases")
    if isinstance(related_cases, list) and case_id in related_cases:
        issues.append((
            "related_case_is_self",
            "$.deduplication.related_cases",
            "must not contain the current case id",
        ))

    if case_id is not None and deduplication.get("duplicate_of") == case_id:
        issues.append((
            "duplicate_of_is_self",
            "$.deduplication.duplicate_of",
            "must not equal the current case id",
        ))

    raw_output_location = reproduction.get("raw_output_location")
    if isinstance(raw_output_location, str):
        if ".." in re.split(r"[\\/]+", raw_output_location):
            issues.append((
                "raw_output_path_traversal",
                "$.reproduction.raw_output_location",
                "must not contain an independent '..' path segment",
            ))
        if raw_output_location.startswith(("/", "\\")) or re.match(
            r"^[A-Za-z]:[\\/]", raw_output_location
        ):
            issues.append((
                "raw_output_absolute_path",
                "$.reproduction.raw_output_location",
                "must be a relative path or controlled evidence identifier",
            ))

    if record.get("review_status") == "approved":
        if record.get("is_example") is not False:
            issues.append((
                "approved_is_example",
                "$.is_example",
                "approved cases must set is_example=false",
            ))
        if primary_category == "needs_review":
            issues.append((
                "approved_needs_review",
                "$.primary_category",
                "approved cases cannot use needs_review",
            ))
        for index, category in enumerate(secondary_categories):
            if category == "needs_review":
                issues.append((
                    "approved_needs_review",
                    f"$.secondary_categories[{index}]",
                    "approved cases cannot use needs_review",
                ))
        source_type = primary_source.get("source_type")
        if source_type in DISALLOWED_APPROVED_SOURCES:
            issues.append((
                "approved_source_type",
                "$.primary_source.source_type",
                f"approved cases cannot use {source_type}",
            ))

    if deduplication.get("status") == "merged" and not related_cases:
        issues.append((
            "merged_without_related_case",
            "$.deduplication.related_cases",
            "merged cases require at least one related case",
        ))

    if reproduction_status == "reproduced":
        if not _is_int(attempts) or attempts < 1:
            issues.append((
                "reproduced_without_attempt",
                "$.reproduction.attempts",
                "reproduced requires attempts >= 1",
            ))
        if not _is_int(successes) or successes < 1:
            issues.append((
                "reproduced_without_success",
                "$.reproduction.successful_reproductions",
                "reproduced requires successful_reproductions >= 1",
            ))

    if reproduction_status == "failed_to_reproduce":
        if not _is_int(attempts) or attempts < 1:
            issues.append((
                "failed_to_reproduce_without_attempt",
                "$.reproduction.attempts",
                "failed_to_reproduce requires attempts >= 1",
            ))
        if successes != 0:
            issues.append((
                "failed_to_reproduce_with_success",
                "$.reproduction.successful_reproductions",
                "failed_to_reproduce requires successful_reproductions = 0",
            ))

    return issues


def _collect_json_files(inputs: list[str]) -> list[Path]:
    files: list[Path] = []
    for raw in inputs or [str(DEFAULT_CASES_DIR)]:
        path = Path(raw)
        if not path.exists():
            raise ValueError(f"input does not exist: {path}")
        if path.is_symlink():
            raise ValueError(f"symbolic-link inputs are not allowed: {path}")
        resolved_input = path.resolve()
        try:
            resolved_input.relative_to(BASE_DIR)
        except ValueError as exc:
            raise ValueError(f"input must stay under {BASE_DIR}: {path}") from exc
        if path.is_file():
            if path.suffix.lower() != ".json":
                raise ValueError(f"input is not a JSON file: {path}")
            files.append(resolved_input)
            continue

        root = resolved_input
        for candidate in sorted(path.rglob("*.json")):
            if candidate.is_symlink():
                raise ValueError(f"symbolic-link JSON files are not allowed: {candidate}")
            if not candidate.is_file():
                continue
            resolved = candidate.resolve()
            try:
                resolved.relative_to(root)
            except ValueError as exc:
                raise ValueError(f"JSON file escapes input directory: {candidate}") from exc
            files.append(resolved)
    return files


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Validate cross-field semantics of failure-case JSON files."
    )
    parser.add_argument("inputs", nargs="*", help="JSON files or directories; defaults to cases/")
    args = parser.parse_args(argv)

    try:
        files = _collect_json_files(args.inputs)
    except ValueError as exc:
        print(f"INPUT ERROR: {exc}", file=sys.stderr)
        return 2

    failed = 0
    for path in files:
        try:
            record = json.loads(path.read_text(encoding="utf-8-sig"))
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            print(f"FAIL {path}")
            print(f"  [json_read_error] $: {exc}")
            failed += 1
            continue

        issues = validate_record(record)
        if not issues:
            print(f"PASS {path}")
            continue

        print(f"FAIL {path}")
        for code, field_path, reason in issues:
            print(f"  [{code}] {field_path}: {reason}")
        failed += 1

    print(f"SUMMARY files={len(files)} passed={len(files) - failed} failed={failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
