#!/bin/sh
# Installs the repo's git hooks. Run once after cloning.
#
# Hooks live in .git/hooks/, which git does not track — so they do not arrive
# with a clone and have to be installed deliberately.

set -e
root=$(git rev-parse --show-toplevel)
cp "$root/scripts/pre-commit" "$root/.git/hooks/pre-commit"
chmod +x "$root/.git/hooks/pre-commit"
echo "Installed pre-commit hook -> .git/hooks/pre-commit"
echo "It blocks log files, .env, databases, private keys, and common API-key patterns."
