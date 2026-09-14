# B2B PM System - Local Auto Backup Script
$projDir = $PSScriptRoot
Set-Location $projDir

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  B2B PM System 本機自動備份" -ForegroundColor Cyan
Write-Host "  時間: $timestamp" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. 建立本機 HTML 快照備份 (Local backups folder)
$backupDir = Join-Path $projDir "backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

$snapFile = Join-Path $backupDir "index_snapshot_$timestamp.html"
Copy-Item (Join-Path $projDir "index.html") $snapFile -Force
Write-Host "[1/2] 本機快照已儲存: backups/index_snapshot_$timestamp.html" -ForegroundColor Green

# 2. 本機 Git 版本儲存 (不推送到 GitHub 遠端)
$gitCmd = "git"
$gitFound = $false

try {
    $null = Get-Command git -ErrorAction Stop
    $gitFound = $true
} catch {
    $possiblePaths = @(
        "C:\Program Files\Git\cmd\git.exe",
        "C:\Program Files (x86)\Git\cmd\git.exe",
        "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
    )
    foreach ($p in $possiblePaths) {
        if (Test-Path $p) {
            $gitCmd = $p
            $gitFound = $true
            break
        }
    }
}

if ($gitFound) {
    if (-not (Test-Path (Join-Path $projDir ".git"))) {
        & $gitCmd init
        & $gitCmd branch -M main
    }
    & $gitCmd add .
    & $gitCmd commit -m "Local backup: $timestamp"
    Write-Host "[2/2] 本機 Git 版本存檔完成（未推送到遠端）！" -ForegroundColor Green
} else {
    Write-Host "[2/2] 本機檔案快照已安全保存！" -ForegroundColor Green
}

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "本機備份完成！" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan