@echo off
setlocal

echo Updating inside-file text in root folder only...

for %%f in (*.js *.css *.html *.json *.txt *.lrc) do (
  echo Fixing: %%f
  powershell -NoLogo -NoProfile -Command ^
    "$p='%%f';" ^
    "$t = Get-Content -Raw $p;" ^
    "$t = $t -replace 'Vinly','Vinyl' -replace 'vinly','vinyl';" ^
    "Set-Content -Path $p -Value $t"
)

echo Done.
pause
