#!/usr/bin/env bash
set -euo pipefail

# Hosted runners often have all required libraries. Test the actual browser
# before asking apt to install system packages.
"$@" install chromium
probe=$(mktemp -d)
trap 'rm -f "$probe/chromium.png"; rmdir "$probe"' EXIT

if ! "$@" screenshot --browser chromium --timeout 15000 about:blank "$probe/chromium.png"; then
  "$@" install-deps chromium
  "$@" screenshot --browser chromium --timeout 15000 about:blank "$probe/chromium.png"
fi
