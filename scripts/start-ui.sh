#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
if [[ $# -eq 0 ]]; then
    exec python3 app.py --open
else
    exec python3 app.py "$@"
fi
