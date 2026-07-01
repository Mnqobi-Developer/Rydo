$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:ASPNETCORE_URLS = "http://localhost:5090"
Set-Location "$PSScriptRoot\..\backend\Rydo.Api"
dotnet run --no-build *> "$PSScriptRoot\..\api.log"
