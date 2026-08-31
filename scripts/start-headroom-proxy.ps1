# Starts the local Headroom proxy (port 8787) in the background if not already healthy.
# Usage:
#   .\scripts\start-headroom-proxy.ps1
#   .\scripts\start-headroom-proxy.ps1 -RegisterAutostart
#   .\scripts\start-headroom-proxy.ps1 -Restart
# Keep the process running while using Cursor (MCP + proxy).

param(
    [switch]$RegisterAutostart,
    [switch]$Foreground,
    [switch]$Restart,
    [double]$BudgetUsd = 10,
    [ValidateSet("hourly", "daily", "monthly")]
    [string]$BudgetPeriod = "daily"
)

$ErrorActionPreference = "Stop"
$Port = 8787
$HeadroomExe = "C:\Users\DeadW\AppData\Local\Python\pythoncore-3.14-64\Scripts\headroom.exe"
$LogDir = Join-Path $env:USERPROFILE ".headroom"
$LogFile = Join-Path $LogDir "proxy.out.log"
$ErrFile = Join-Path $LogDir "proxy.err.log"
$TaskName = "HeadroomProxy8787"

if (-not (Test-Path $HeadroomExe)) {
    Write-Error "headroom.exe not found at $HeadroomExe. Install with: pip install `"headroom-ai[all]`""
}

[Environment]::SetEnvironmentVariable("HEADROOM_BUDGET", [string]$BudgetUsd, "User")
[Environment]::SetEnvironmentVariable("HEADROOM_BUDGET_PERIOD", $BudgetPeriod, "User")
[Environment]::SetEnvironmentVariable("OPENAI_BASE_URL", "http://127.0.0.1:$Port/v1", "User")
[Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "http://127.0.0.1:$Port", "User")
$env:HEADROOM_BUDGET = [string]$BudgetUsd
$env:HEADROOM_BUDGET_PERIOD = $BudgetPeriod
$env:OPENAI_BASE_URL = "http://127.0.0.1:$Port/v1"
$env:ANTHROPIC_BASE_URL = "http://127.0.0.1:$Port"

function Test-HeadroomHealthy {
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 3
        return ($health.status -eq "healthy" -and $health.ready -eq $true)
    } catch {
        return $false
    }
}

function Get-HeadroomHealth {
    Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 3
}

function Stop-HeadroomProxy {
    Get-Process -Name headroom -ErrorAction SilentlyContinue | ForEach-Object {
        try { Stop-Process -Id $_.Id -Force -ErrorAction Stop } catch { }
    }
    Start-Sleep -Milliseconds 800
}

function Start-HeadroomProxyProcess {
    param([switch]$RunForeground)
    $args = @(
        "proxy",
        "--port", "$Port",
        "--host", "127.0.0.1",
        "--budget", "$BudgetUsd",
        "--budget-period", $BudgetPeriod
    )
    if ($RunForeground) {
        Write-Host "Starting headroom proxy --port $Port (foreground, budget `$$BudgetUsd/$BudgetPeriod)..."
        & $HeadroomExe @args
        exit $LASTEXITCODE
    }

    Write-Host "Starting headroom proxy --port $Port (budget `$$BudgetUsd/$BudgetPeriod)..."
    return Start-Process -FilePath $HeadroomExe -ArgumentList $args -WindowStyle Hidden -RedirectStandardOutput $LogFile -RedirectStandardError $ErrFile -PassThru
}

if ($RegisterAutostart) {
    $scriptPath = $PSCommandPath
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`" -Restart"
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Limited -Force | Out-Null
    Write-Host "Autostart registered: scheduled task '$TaskName' at logon (budget `$$BudgetUsd/$BudgetPeriod)."
}

if ($Restart) {
    Write-Host "Restarting Headroom proxy..."
    Stop-HeadroomProxy
}

if (-not $Restart -and (Test-HeadroomHealthy)) {
    $health = Get-HeadroomHealth
    Write-Host "Headroom proxy already running at http://127.0.0.1:$Port (v$($health.version), uptime $($health.uptime_seconds)s)"
    exit 0
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if ($Foreground) {
    Start-HeadroomProxyProcess -RunForeground
}

$proc = Start-HeadroomProxyProcess

$deadline = (Get-Date).AddSeconds(20)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 500
    if (Test-HeadroomHealthy) {
        $health = Get-HeadroomHealth
        Write-Host "Headroom proxy healthy at http://127.0.0.1:$Port (v$($health.version), pid $($proc.Id), budget `$$BudgetUsd/$BudgetPeriod)"
        exit 0
    }
    if ($proc.HasExited) {
        Write-Error "Proxy process exited with code $($proc.ExitCode). See $LogFile / $ErrFile"
    }
}

Write-Error "Proxy started (pid $($proc.Id)) but /health did not become healthy within 20s. See $LogFile / $ErrFile"
