#!/bin/bash
# Set all files and directories in this tree to 2025-01-01 00:00
set -euo pipefail
timestamp="202501010000"

# `find` includes directories and files by default; we apply the timestamp with `touch`.
find . -print0 | xargs -0 touch -t "$timestamp"
