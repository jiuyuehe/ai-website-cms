#!/usr/bin/env bash
set -euo pipefail
npm ci
npm run validate
npm run test
npm run build
npm run report
