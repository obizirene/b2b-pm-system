$port = 8080
$H = New-Object System.Net.HttpListener
$H.Prefixes.Add("http://127.0.0.1:$port/")
$H.Prefixes.Add("http://localhost:$port/")
try {
    $H.Start()
    Write-Host "Local HTTP Server listening on http://127.0.0.1:$port/ and http://localhost:$port/"
    while ($H.IsListening) {
        $context = $H.GetContext()
        $req = $context.Request
        $res = $context.Response

        $rawPath = $req.Url.AbsolutePath.TrimStart('/')
        if ([string]::IsNullOrEmpty($rawPath)) { $rawPath = "index.html" }
        $filePath = Join-Path $PSScriptRoot $rawPath
        if (-not (Test-Path $filePath -PathType Leaf)) {
            $filePath = Join-Path "C:\Users\cheer\.gemini\antigravity\scratch\b2b-pm-system-main" $rawPath
        }

        if (-not (Test-Path $filePath -PathType Leaf)) {
            $leafName = [System.IO.Path]::GetFileName($rawPath)
            if (-not [string]::IsNullOrEmpty($leafName)) {
                $candidate = Join-Path $PSScriptRoot $leafName
                if (Test-Path $candidate -PathType Leaf) {
                    $filePath = $candidate
                }
            }
        }

        if (-not (Test-Path $filePath -PathType Leaf)) {
            # SPA Fallback to index.html for clean routing (e.g. /gantt, /board, /issues)
            $filePath = Join-Path $PSScriptRoot "index.html"
            if (-not (Test-Path $filePath)) {
                $filePath = "C:\Users\cheer\.gemini\antigravity\scratch\b2b-pm-system-main\index.html"
            }
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($ext) {
                ".html" { $res.ContentType = "text/html; charset=utf-8" }
                ".css"  { $res.ContentType = "text/css; charset=utf-8" }
                ".js"   { $res.ContentType = "application/javascript; charset=utf-8" }
                ".json" { $res.ContentType = "application/json; charset=utf-8" }
                ".svg"  { $res.ContentType = "image/svg+xml" }
                ".png"  { $res.ContentType = "image/png" }
                default { $res.ContentType = "application/octet-stream" }
            }
            $buf = [System.IO.File]::ReadAllBytes($filePath)
            $res.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            $res.Headers.Add("Pragma", "no-cache")
            $res.Headers.Add("Expires", "0")
            $res.ContentLength64 = $buf.Length
            $res.OutputStream.Write($buf, 0, $buf.Length)
        } else {
            $res.StatusCode = 404
        }
        $res.Close()
    }
} catch {
    Write-Host "Server stopped: $_"
} finally {
    $H.Stop()
}
