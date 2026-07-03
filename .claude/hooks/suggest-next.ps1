# suggest-next.ps1
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "../..")
$plansDir = Join-Path $repoRoot ".cursor/plans"
if (-not (Test-Path $plansDir)) { exit 0 }
Get-ChildItem $plansDir -Filter "*.plan.md" | Sort-Object LastWriteTime -Descending | ForEach-Object {
    $c = Get-Content $_.FullName -Raw
    if ($c -match 'status:\s*approved' -and $c -match 'status:\s*pending') {
        Write-Output "Next: /execute .cursor/plans/$($_.Name) — pending tasks remain."
        exit 0
    }
}
exit 0
