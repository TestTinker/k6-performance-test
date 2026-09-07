#!/usr/bin/env bash
# scripts/run-report.sh
#
# Menjalankan k6, menyimpan result.json.gz + summary.json ke folder results/,
# lalu langsung men-generate HTML report ke results/report/.
#
# Pemakaian:
#   ./scripts/run-report.sh
#   ./scripts/run-report.sh scenarios/authentication/login.js

set -euo pipefail

SCRIPT_FILE="${1:-script.js}"
TS=$(date +%Y%m%d_%H%M%S)

JSON_DIR="results/json"
SUMMARY_DIR="results/summary"
REPORT_DIR="results/report"

mkdir -p "$JSON_DIR" "$SUMMARY_DIR" "$REPORT_DIR"

RESULT_FILE="$JSON_DIR/result_$TS.json.gz"
SUMMARY_FILE="$SUMMARY_DIR/summary_$TS.json"

echo "Running k6: $SCRIPT_FILE"
k6 run -e ENV=dev -e USERNAME=admin -e PASSWORD=Poiuy09876% --out influxdb=http://localhost:8086/k6 "json=$RESULT_FILE" --summary-export="$SUMMARY_FILE" "$SCRIPT_FILE" || \
  echo "k6 run selesai dengan exit code non-zero (thresholds mungkin gagal) - tetap lanjut generate report."

echo "Generating report..."
node scripts/generate-report.js "$RESULT_FILE" "$SUMMARY_FILE" "$REPORT_DIR"
