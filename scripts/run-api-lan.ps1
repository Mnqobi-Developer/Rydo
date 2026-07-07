param(
  [string]$Port = "5090"
)

$ErrorActionPreference = "Stop"

$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:ASPNETCORE_URLS = "http://0.0.0.0:$Port"
$env:ConnectionStrings__RydoDb = "Host=localhost;Port=5433;Database=rydo;Username=rydo;Password=rydo_dev_password"

Set-Location "$PSScriptRoot\..\backend\Rydo.Api"
Write-Host "Rydo API listening on http://0.0.0.0:$Port"
dotnet run --no-build
