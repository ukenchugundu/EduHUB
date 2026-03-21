# Start the EduHub development environment (single port via backend)
# This script ensures Node.js is on PATH for this session and uses npm.cmd
# so PowerShell execution policy does not block npm.ps1.
$nodeDir = "C:\Program Files\nodejs"
if (-not (Test-Path $nodeDir)) {
  Write-Error "Node.js installation not found at $nodeDir. Please install Node.js and try again."
  exit 1
}
$env:PATH = "$nodeDir;$env:PATH"
$npmCmd = Join-Path $nodeDir "npm.cmd"

if (-not (Test-Path $npmCmd)) {
  Write-Error "npm.cmd not found at $npmCmd. Please reinstall Node.js and try again."
  exit 1
}

# Run the dev script defined in package.json
& $npmCmd run dev
