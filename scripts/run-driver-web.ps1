$env:EXPO_NO_TELEMETRY = "1"
Set-Location "$PSScriptRoot\.."
npm run driver:web -- --clear *> "$PSScriptRoot\..\driver-web.log"
