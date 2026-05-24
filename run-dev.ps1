Write-Host "=== Syncra.NET - Start Dev Environment ===" -ForegroundColor Cyan
Write-Host ""

# 1. Start Docker (PostgreSQL + Redis)
Write-Host "[1/4] Starting PostgreSQL & Redis via Docker..." -ForegroundColor Yellow
docker-compose up -d
Write-Host "  OK" -ForegroundColor Green

# 2. Wait for DB to be ready
Write-Host "[2/4] Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host "  OK" -ForegroundColor Green

# 3. EF Core migrations
Write-Host "[3/4] Running EF Core migrations..." -ForegroundColor Yellow
dotnet ef database update --project be/src/Syncra.Infrastructure --startup-project be/src/Syncra.Api 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Migration may have already been applied or DB schema is up-to-date." -ForegroundColor DarkYellow
} else {
    Write-Host "  OK" -ForegroundColor Green
}

# 4. Start backend + frontend
Write-Host "[4/4] Starting backend (port 5260) + frontend (port 5173)..." -ForegroundColor Yellow

$beJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    dotnet run --project be/src/Syncra.Api
}

$feJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev --prefix fe
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:5260/swagger" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173/Syncra/" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services." -ForegroundColor Gray

# Keep script alive, forward Ctrl+C to both jobs
try {
    while ($true) { Start-Sleep -Seconds 1 }
}
finally {
    Stop-Job $beJob -ErrorAction SilentlyContinue
    Stop-Job $feJob -ErrorAction SilentlyContinue
    Remove-Job $beJob -ErrorAction SilentlyContinue
    Remove-Job $feJob -ErrorAction SilentlyContinue
}
