# scripts/run-report.ps1
#
# Menjalankan k6, menyimpan result.json.gz + summary.json ke folder results/,
# lalu langsung men-generate HTML report ke results/report/.
#
# Pemakaian:
#   ./scripts/run-report.ps1
#   ./scripts/run-report.ps1 -Script "scenarios/authentication/login.js"
#
# Parameter opsional:
#   -Script   path ke file k6 yang dijalankan (default: script.js di root project)

param(
    [string]$Script = "script.js"
)

$ErrorActionPreference = "Stop"

$TS = Get-Date -Format "yyyyMMdd_HHmmss"

$JsonDir    = "results/json"
$SummaryDir = "results/summary"
$ReportDir  = "results/report"

New-Item -ItemType Directory -Force -Path $JsonDir, $SummaryDir, $ReportDir | Out-Null

$ResultFile  = "$JsonDir/result_$TS.json.gz"
$SummaryFile = "$SummaryDir/summary_$TS.json"

Write-Host "Running k6: $Script"
k6 run -e ENV=dev -e USERNAME=admin -e PASSWORD=Poiuy09876% --out influxdb=http://localhost:8086/k6 --out json=$ResultFile --summary-export=$SummaryFile $Script

if ($LASTEXITCODE -ne 0) {
    Write-Host "k6 run selesai dengan exit code $LASTEXITCODE (thresholds mungkin gagal) - tetap lanjut generate report." -ForegroundColor Yellow
}

Write-Host "Generating report..."
node scripts/generate-report.js $ResultFile $SummaryFile $ReportDir

$ReportPath = Get-ChildItem -Path $ReportDir -Filter "report_$TS*.html" | Select-Object -First 1
if ($ReportPath) {
    Write-Host "Report: $($ReportPath.FullName)" -ForegroundColor Green
}
