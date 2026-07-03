# enforce-orchestrator.ps1
$inputRaw = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($inputRaw)) { exit 0 }
try { $payload = $inputRaw | ConvertFrom-Json } catch { exit 0 }
if ($env:ORCHESTRATOR_OVERRIDE -eq "1") { exit 0 }
$toolName = $payload.tool_name
if ($toolName -notin @("Edit", "Write")) { exit 0 }
$toolInput = $payload.tool_input
$filePath = ""
if ($toolInput -is [PSCustomObject]) {
    if ($toolInput.file_path) { $filePath = $toolInput.file_path }
    elseif ($toolInput.path) { $filePath = $toolInput.path }
}
if ([string]::IsNullOrWhiteSpace($filePath)) { exit 0 }
$normalized = $filePath -replace '\\', '/'
if (-not [string]::IsNullOrWhiteSpace($payload.agent_type)) { exit 0 }
$allowedPatterns = @('\.md$', '\.mdx$', '\.json$', '/\.cursor/plans/', '/\.cursor/specs/', '/\.claude/', '/docs/')
foreach ($pattern in $allowedPatterns) { if ($normalized -match $pattern) { exit 0 } }
$sourceExtensions = @('.ts','.tsx','.js','.jsx','.go','.py','.rs','.java','.rb','.c','.h','.cpp','.hpp','.cs','.kt','.swift','.php','.scala','.lua','.sh','.css','.scss','.sql','.vue','.svelte','.html','.yaml','.yml','.toml')
$ext = [System.IO.Path]::GetExtension($filePath).ToLower()
if ($sourceExtensions -contains $ext) {
    $output = @{ hookSpecificOutput = @{ hookEventName = "PreToolUse"; permissionDecision = "deny"; permissionDecisionReason = "Orchestrator cannot edit source on main thread. Use /execute or say override (ORCHESTRATOR_OVERRIDE=1)." } } | ConvertTo-Json -Compress
    Write-Output $output
}
exit 0
