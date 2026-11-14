param([ValidateSet(5193, 4173)][int]$Port = 5193)

$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$pidFile = Join-Path $taskRoot ".wrangler\e2e\$Port\server.pid"
$nodes = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'")
$targets = @()

if (Test-Path -LiteralPath $pidFile) {
  $recordedId = [int](Get-Content -LiteralPath $pidFile -Raw)
  $recorded = $nodes | Where-Object { $_.ProcessId -eq $recordedId }
  if ($recorded -and $recorded.CommandLine -match 'scripts[/\\]e2e-server\.mjs') { $targets += $recorded }
}

# Recovery for a test process created before PID recording was introduced.
if ($Port -eq 5193 -and $targets.Count -eq 0) {
  $vitePath = Join-Path $taskRoot 'node_modules\vite\bin\vite.js'
  $viteNodes = $nodes | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($vitePath) -and $_.CommandLine -match '--port\s+5193(?:\s|$)' }
  foreach ($viteNode in $viteNodes) {
    $owner = $nodes | Where-Object { $_.ProcessId -eq $viteNode.ParentProcessId }
    if ($owner -and $owner.CommandLine -match 'scripts[/\\]e2e-server\.mjs') { $targets += $owner }
  }
}

foreach ($target in ($targets | Sort-Object ProcessId -Unique)) {
  Write-Output "Stopping verified isolated test server PID $($target.ProcessId)."
  & taskkill.exe /PID $target.ProcessId /T /F
  if ($LASTEXITCODE -ne 0) { throw 'The test server could not be stopped.' }
}
