param(
  [int]$Port = 8000
)

function Stop-ExistingPythonOnPort {
  param([int]$TargetPort)

  try {
    $listeners = Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction Stop
  } catch {
    $listeners = @()
  }

  if (-not $listeners) {
    return
  }

  $listener = $listeners | Select-Object -First 1
  $pid = $listener.OwningProcess
  if (-not $pid) {
    return
  }

  $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
  if (-not $proc) {
    return
  }

  if ($proc.ProcessName -like "python*") {
    Write-Host "Stopping old Python server on port $TargetPort (PID: $pid)..." -ForegroundColor Yellow
    Stop-Process -Id $pid -Force
    Start-Sleep -Milliseconds 400
  } else {
    Write-Host "Port $TargetPort is already used by process '$($proc.ProcessName)' (PID: $pid)." -ForegroundColor Red
    Write-Host "Please free the port or run: ./start.ps1 -Port 8001" -ForegroundColor Red
    exit 1
  }
}

Stop-ExistingPythonOnPort -TargetPort $Port

Write-Host "Starting Dashboard server on http://localhost:$Port" -ForegroundColor Green
Write-Host "Tip: open http://localhost:$Port/api/health to verify backend version" -ForegroundColor DarkGray
python .\app.py --port $Port
