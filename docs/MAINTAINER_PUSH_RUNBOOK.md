# Maintainer Push Runbook

Date: 2026-02-16

This runbook standardizes push hygiene for `federicodeponte/opendraft` and prevents account/credential drift.

## 0) Commit hygiene standard

- Keep each commit single-purpose (runtime, tests, docs, CI) for external reviewability.
- Include related tests in the same commit when behavior changes.
- Update `CHANGELOG.md` before tagging/publishing.

## 1) Confirm GitHub CLI account

```bash
gh auth status -h github.com
gh auth switch -h github.com -u federicodeponte
```

Expected: `Active account: true` for `federicodeponte`.

## 2) Force repo-local credential helper to GitHub CLI

From repo root:

```bash
gh auth setup-git
git config --local --replace-all credential.helper ''
git config --local --add credential.helper '!gh auth git-credential'
git config --local --get-all credential.helper
```

Expected local helper list contains `!gh auth git-credential`.

## 3) Run push preflight

```bash
./scripts/push-preflight.sh
```

Expected output ends with `Preflight OK`.

## 4) Push and verify sync

```bash
git push origin master
git fetch origin master --quiet
git status -sb
git rev-parse HEAD
git rev-parse origin/master
```

Expected:
- `git status -sb` shows `## master...origin/master`
- `HEAD` equals `origin/master`

## 5) Required quality checks before publishing code changes

```bash
python3 -W error::SyntaxWarning -m compileall -q engine tests
python3 -m pytest tests -q
```

If integration tests are needed:

```bash
python3 -m pytest tests/test_factcheck_live.py -q -m integration
```

## 6) Live validation execution paths

- Local (requires configured API key + outbound network):
  - `python3 tests/test_live_crafter.py`
  - `python3 tests/audit_output.py`
- CI (secret-gated): `.github/workflows/live-validation.yml`
  - Runs on manual trigger and weekly schedule.
  - Executes live checks only when `GOOGLE_API_KEY` or `GEMINI_API_KEY` is configured in repository secrets.
