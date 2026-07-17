# Security Policy

## Supported versions

The currently supported public line is VeriCrate `0.1.x`, the local M3 MVP.

VeriCrate M4, GitHub App integration, cloud runners, external Alpha workflows, and large-scale real repository compatibility are not complete in this public version.

## Reporting a vulnerability

Please do not disclose exploitable details publicly before the maintainer has had a reasonable chance to review and fix the issue.

Preferred reporting channel:

- Use GitHub Private Vulnerability Reporting for this repository, if it is enabled.
- If private vulnerability reporting is not enabled, contact the repository owner through a private channel they provide.

Do not include Token, Cookie, password, private key, private repository code, production data, or personal data in a public Issue, Discussion, pull request, screenshot, or log.

Helpful reports include:

- Minimal reproduction steps.
- Affected VeriCrate version or commit.
- Operating system, Node.js version, Docker version, and browser version when relevant.
- The smallest necessary evidence, with secrets and personal data removed.
- Impact description and whether the issue requires a malicious target project, a trusted local project, or host-level access.

## Local execution and Docker boundary

VeriCrate runs target projects locally and may execute their install/build/test/start commands inside Docker. Docker improves isolation, but it is not an absolute security boundary.

Do not use VeriCrate to run unknown high-risk malicious projects on a sensitive machine. Avoid mounting private directories, real `.env` files, SSH keys, production credentials, browser profiles, or private package registry tokens into target projects.

VeriCrate evidence, logs, screenshots, and reports may contain project-specific behavior. Review generated files before sharing them publicly.
