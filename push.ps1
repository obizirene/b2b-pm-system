$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   B2B PM 系統 - 自動備份並推送到 GitHub" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Set-Location $PSScriptRoot

# 1. 自動備份本地快照
$backupDir = Join-Path $PSScriptRoot "backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$snapFile = Join-Path $backupDir "index_snapshot_$timestamp.html"
Copy-Item (Join-Path $PSScriptRoot "index.html") $snapFile -Force
Write-Host "[1/3] 本地快照已儲存至: backups/index_snapshot_$timestamp.html" -ForegroundColor Green

# 2. 本地 Git 提交
Write-Host "[2/3] 正在準備提交最新版本..." -ForegroundColor Cyan
git add .
git commit -m "Auto backup and push: $timestamp"
Write-Host "本地提交完成！" -ForegroundColor Green

# 3. 推送到 GitHub
Write-Host "[3/3] 正在推送到 GitHub (https://github.com/obizirene/b2b-pm-system)..." -ForegroundColor Yellow
Write-Host "如果是第一次連線，會跳出 GitHub 登入視窗，請點選授權 (Authorize)..." -ForegroundColor Gray
Write-Host ""

git push -u origin main --force

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  [成功] 專案已成功推送到 GitHub！" -ForegroundColor Green
    Write-Host "  倉庫網址: https://github.com/obizirene/b2b-pm-system" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Red
    Write-Host "  [提示] 推送未完成，請確認是否已完成 GitHub 授權。" -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Red
}

Write-Host ""
Write-Host "請按任意鍵關閉此視窗..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")