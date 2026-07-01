$env:EXPO_NO_TELEMETRY = "1"
Set-Location "$PSScriptRoot\.."
npm run passenger:web -- --clear *> "$PSScriptRoot\..\passenger-web.log"
