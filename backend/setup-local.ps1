$ErrorActionPreference = "Stop"

$backendPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiPath = Join-Path $backendPath "Rydo.Api"
$docker = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
$dockerDesktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"

if (-not (Test-Path $docker)) {
    throw "Docker Desktop is not installed."
}

& $docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Start-Process -FilePath $dockerDesktop -WindowStyle Hidden

    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Seconds 5
        & $docker info *> $null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            break
        }
    }

    if (-not $ready) {
        throw "Docker Desktop did not become ready. Confirm WSL 2 is enabled and restart Windows."
    }
}

Push-Location $backendPath
try {
    & $docker compose up -d
}
finally {
    Pop-Location
}

Push-Location $apiPath
try {
    dotnet tool restore
    dotnet tool run dotnet-ef database update
}
finally {
    Pop-Location
}

Write-Host "Rydo PostGIS is running on localhost:5433 and migrations are applied."
