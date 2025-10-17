#!/bin/bash

# Script to reproduce the ESM + yjs-binding bug

echo "========================================="
echo "Testing mobx-bonsai ESM + yjs-binding"
echo "========================================="
echo ""
echo "This test will attempt to use the yjs-binding"
echo "in an ESM environment (type: module)"
echo ""

cd "$(dirname "$0")/.."
yarn workspace esm-test start

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Test PASSED - No require() error!"
else
  echo "❌ Test FAILED - require() error detected"
fi

exit $EXIT_CODE
