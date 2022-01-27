$FONTS = 0x14
$Path="C:\Users\Administrator\Desktop\fonts"
$objShell = New-Object -ComObject Shell.Application
$objFolder = $objShell.Namespace($FONTS)
$Fontdir = dir $Path

foreach($File in $Fontdir) {
    if (!($file.name -match "pfb$")) {
        $try = $true
        $installedFonts = @(Get-ChildItem "$env:USERPROFILE\AppData\Local\Microsoft\Windows\Fonts" | Where-Object {$_.PSIsContainer -eq $false} | Select-Object basename)
        $name = $File.basename

        foreach($font in $installedFonts) {
            $font = $font -replace "_", ""
            $name = $name -replace "_", ""

            if($font -match $name) {
                $try = $false
            }
        }

        if ($try) {
            $objFolder.CopyHere($File.fullname)
        }
    }
}