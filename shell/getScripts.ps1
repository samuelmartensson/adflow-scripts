Invoke-WebRequest -Headers @{"Cache-Control"="no-cache"} "https://raw.githubusercontent.com/samuelmartensson/adflow-scripts/main/urls.txt" -OutFile "${env:USERPROFILE}\Desktop\scripts\urls.txt"
Get-Content "${env:USERPROFILE}\Desktop\scripts\urls.txt" | ForEach-Object {Invoke-WebRequest $_ -OutFile "${env:USERPROFILE}\Desktop\scripts\$(Split-Path $_ -Leaf)"}