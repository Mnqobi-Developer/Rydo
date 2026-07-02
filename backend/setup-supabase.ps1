param(
    [Parameter(Mandatory = $true)]
    [string] $ConnectionString,

    [switch] $SkipMigrations
)

$ErrorActionPreference = "Stop"

$backendPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiPath = Join-Path $backendPath "Rydo.Api"

Push-Location $apiPath
try {
    dotnet user-secrets set "ConnectionStrings:RydoDb" $ConnectionString *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to save Supabase connection string to Rydo.Api user secrets."
    }

    if (-not $SkipMigrations) {
        dotnet tool restore
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to restore .NET tools."
        }

        dotnet tool run dotnet-ef database update
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to apply EF Core migrations."
        }
    }
}
finally {
    Pop-Location
}

Write-Host "Supabase connection string saved to Rydo.Api user secrets."
if ($SkipMigrations) {
    Write-Host "Migrations were skipped."
}
else {
    Write-Host "Migrations were applied to Supabase."
}
