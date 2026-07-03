# verify-task.ps1
$inputRaw = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($inputRaw)) { exit 0 }
try { $payload = $inputRaw | ConvertFrom-Json } catch { exit 0 }
$taskDesc = if ($payload.task_description) { $payload.task_description } elseif ($payload.tool_input.task_description) { $payload.tool_input.task_description } else { "" }
if ([string]::IsNullOrWhiteSpace($taskDesc)) { exit 0 }
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "../..")
Set-Location $repoRoot
$failed = $false
if ($taskDesc -match 'frontend') {
    Push-Location frontend
    & pnpm exec tsc --noEmit 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { $failed = $true; Write-Error "TypeScript check failed in frontend" }
    Pop-Location
}
if ($taskDesc -match '\bgo\b|backend') {
    Push-Location backend
    & go vet ./... 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { $failed = $true; Write-Error "go vet failed in backend" }
    Pop-Location
}
if ($failed) { exit 2 }
exit 0
