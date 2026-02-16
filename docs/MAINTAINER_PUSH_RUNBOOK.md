# Maintainer Push Runbook

Date: 2026-02-16

This runbook standardizes push hygiene for `federicodeponte/opendraft` and prevents account/credential drift.

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
