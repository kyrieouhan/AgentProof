# Official defect scenarios

These are M0 official defect samples for the demo app. They are stored as replayable patches instead of Git branches so later Runner work can apply one defect at a time without branch management.

Run all scenarios from `samples/demo-web-app/`:

```powershell
pnpm run defects:verify
```

Run one scenario:

```powershell
pnpm run defects:verify -- superficial_completion
```

The verifier temporarily applies each patch, runs a real probe, records the observed defective behavior, and then reverses the patch.

## Scenario summary

| Defect | Patch | Reproduction command | Correct expectation | Actual defective result | MVP detection method |
| --- | --- | --- | --- | --- | --- |
| `superficial_completion` | `superficial_completion/defect.patch` | `pnpm run defects:verify -- superficial_completion` | Creating a task writes to SQLite and appears in later reads. | Create API returns 201 but no task is listed and SQLite has no row. | API + database |
| `authorization_bypass` | `authorization_bypass/defect.patch` | `pnpm run defects:verify -- authorization_bypass` | Normal users receive 403 for admin API and page. | Normal user receives admin summary data. | API + role context |
| `weakened_tests` | `weakened_tests/defect.patch` | `pnpm run defects:verify -- weakened_tests` | Critical duplicate-normalized-email assertion remains active. | Test suite passes while that assertion is skipped. | Git Diff + existing tests |
| `hardcoded_behavior` | `hardcoded_behavior/defect.patch` | `pnpm run defects:verify -- hardcoded_behavior` | Any valid unique email can register. | Only `demo@example.com` works; equivalent random email fails. | Randomized API input |
| `non_persistent_state` | `non_persistent_state/defect.patch` | `pnpm run defects:verify -- non_persistent_state` | Created task is stored in SQLite and survives restart. | Task appears during the same process but SQLite has no row. | API + database + restart/readback |

These patches are intentionally defective. Do not merge them into the correct baseline.
