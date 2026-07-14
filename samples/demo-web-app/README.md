# AgentProof Demo Web App

This is the official M0 demo app correct baseline. It is a deliberately small Node.js / TypeScript web app that AgentProof can later use for known-good behavior, defect branches, Runner input design, and evidence experiments.

It is not the AgentProof product UI, not a Runner, not a GitHub App, and not a defect branch.

## Stack

- Node.js 20+; current local validation used Node 24
- pnpm
- TypeScript
- Fastify
- SQLite
- Prisma
- Vanilla HTML/CSS/JavaScript

## Correct baseline behavior

- Users can register with email and password.
- Email is required, trimmed, lowercased, and unique.
- Duplicate emails, including case/whitespace variants, are rejected.
- Passwords are stored as salted `scrypt` hashes, never plaintext.
- Successful registration creates a server-side session and logs the user in.
- Users can log in and log out.
- Session cookies persist login state across later requests.
- Admin API and admin page are protected by server-side authorization checks.
- Authenticated users can create, list, and update tasks.
- Tasks are stored in SQLite and remain available after page refresh or service restart.
- API failures return explicit errors; the page only shows success after a successful response.

## Commands

Run these commands from `samples/demo-web-app/`.

```powershell
pnpm install
pnpm run prisma:generate
pnpm run prisma:validate
pnpm run db:init
pnpm run dev
```

Default development URL: `http://127.0.0.1:3000`.

Other useful commands:

```powershell
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
pnpm start
pnpm run db:reset
pnpm run defects:verify
```

## Database

By default the app uses:

```text
DATABASE_URL="file:./prisma/dev.db"
```

With Prisma, this SQLite file is created under `samples/demo-web-app/prisma/dev.db`. The file is ignored by Git.

To reset local data:

```powershell
pnpm run db:reset
```

Tests use a separate temporary SQLite database (`prisma/test.db`) and remove it after the test run.

## Official defect scenarios

The correct baseline is structured so later checks can intentionally inject one defect at a time. The M0 samples are stored as replayable patches under [`defects/`](defects/) rather than Git branches.

| Defect | Intended bug | Evidence target |
| --- | --- | --- |
| `superficial_completion` | UI says task saved, but SQLite write is skipped | UI success text vs missing DB row |
| `authorization_bypass` | Admin link hidden in UI, but backend authorization removed | Normal user receives admin data |
| `weakened_tests` | Remove or relax a failing assertion for duplicate email or admin denial | Test diff and hidden check failure |
| `hardcoded_behavior` | Only one fixed email or task id works | Random equivalent input fails |
| `non_persistent_state` | Task update stored in memory only | Refresh or restart loses data |

Run all defect reproductions:

```powershell
pnpm run defects:verify
```

No defect branches are created; each patch is applied temporarily and reversed by the verifier.
