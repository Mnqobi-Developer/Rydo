param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("passenger", "driver")]
  [string]$App,

  [ValidateSet("lan", "android", "ios")]
  [string]$Target = "lan",

  [string]$ApiPort = "5090"
)

$ErrorActionPreference = "Stop"

function Get-LanIpAddress {
  $address = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
      $_.IPAddress -notlike "127.*" `
        -and $_.IPAddress -notlike "169.254.*" `
        -and $_.InterfaceAlias -notlike "vEthernet*" `
        -and $_.InterfaceAlias -notlike "*Loopback*"
    } |
    Sort-Object -Property PrefixOrigin |
    Select-Object -First 1 -ExpandProperty IPAddress

  if (-not $address) {
    throw "Could not find a LAN IPv4 address. Connect to Wi-Fi/Ethernet and try again."
  }

  return $address
}

$workspace = Resolve-Path "$PSScriptRoot\.."
$lanIp = Get-LanIpAddress
$workspaceName = if ($App -eq "passenger") { "@rydo/passenger" } else { "@rydo/driver" }

$env:EXPO_NO_TELEMETRY = "1"
$env:EXPO_PUBLIC_RYDO_API_URL = if ($Target -eq "android") {
  "http://10.0.2.2:$ApiPort"
} else {
  "http://$lanIp`:$ApiPort"
}

Write-Host "App: $App"
Write-Host "Target: $Target"
Write-Host "API URL: $env:EXPO_PUBLIC_RYDO_API_URL"

Set-Location $workspace

$isWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform(
  [System.Runtime.InteropServices.OSPlatform]::Windows
)

if ($Target -eq "ios" -and $isWindows) {
  Write-Error "The iOS Simulator requires macOS with Xcode. On Windows, use Expo Go on a physical iPhone or run this command on a Mac."
}

if ($Target -eq "android") {
  npm run android -w $workspaceName -- --clear
} elseif ($Target -eq "ios") {
  npm run ios -w $workspaceName -- --clear
} else {
  npm run start -w $workspaceName -- --lan --clear
}
