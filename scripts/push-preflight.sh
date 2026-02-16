#!/usr/bin/env bash
set -euo pipefail

EXPECTED_GH_USER="${EXPECTED_GH_USER:-federicodeponte}"
EXPECTED_REMOTE="${EXPECTED_REMOTE:-https://github.com/federicodeponte/opendraft.git}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== OpenDraft push preflight =="
echo "Repository: $ROOT_DIR"

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: gh CLI is not installed." >&2
  exit 1
fi

current_remote="$(git remote get-url origin)"
if [[ "$current_remote" != "$EXPECTED_REMOTE" ]]; then
  echo "ERROR: origin remote mismatch." >&2
  echo "expected: $EXPECTED_REMOTE" >&2
  echo "actual:   $current_remote" >&2
  exit 1
fi

helpers="$(git config --local --get-all credential.helper || true)"
if ! grep -Fqx "!gh auth git-credential" <<<"$helpers"; then
  echo "ERROR: repo-local gh credential helper is missing." >&2
  echo "Run the following from repo root:" >&2
  echo "  gh auth setup-git" >&2
  echo "  git config --local --replace-all credential.helper ''" >&2
  echo "  git config --local --add credential.helper '!gh auth git-credential'" >&2
  exit 1
fi

auth_output="$(gh auth status -h github.com 2>&1 || true)"
if ! grep -q "Active account: true" <<<"$auth_output"; then
  echo "ERROR: gh is not authenticated for github.com." >&2
  echo "$auth_output" >&2
  exit 1
fi

active_user="$(
  awk '/Logged in to github.com account /{candidate=$7} /Active account: true/{print candidate; exit}' \
    <<<"$auth_output"
)"
if [[ -z "$active_user" ]]; then
  echo "ERROR: unable to detect active gh account." >&2
  echo "$auth_output" >&2
  exit 1
fi

if [[ "$active_user" != "$EXPECTED_GH_USER" ]]; then
  echo "ERROR: active gh account mismatch." >&2
  echo "expected: $EXPECTED_GH_USER" >&2
  echo "actual:   $active_user" >&2
  echo "Run: gh auth switch -h github.com -u $EXPECTED_GH_USER" >&2
  exit 1
fi

git fetch origin master --quiet

status_line="$(git status -sb | head -n1)"
head_sha="$(git rev-parse HEAD)"
origin_sha="$(git rev-parse origin/master)"

echo "Auth account: $active_user"
echo "Status: $status_line"
echo "HEAD: $head_sha"
echo "origin/master: $origin_sha"
echo "Preflight OK"
