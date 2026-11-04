# ==============================================================================
# TalentPulse Portal - Static File & Page HTTP Server
# Serves preview.html and assets on http://localhost:5173
# ==============================================================================
param (
    [int]$Port = 5173
)

$rootDir = $PSScriptRoot
$distDir = Join-Path $rootDir "frontend\dist"
$previewFile = if (Test-Path (Join-Path $distDir "index.html")) { Join-Path $distDir "index.html" } else { Join-Path $rootDir "preview.html" }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try {
    $listener.Start()
} catch {
    $Port = 3000
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$Port/")
    $listener.Start()
}

$url = "http://localhost:$Port/"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " TalentPulse ATS URJA Web Server Running at:" -ForegroundColor Green
Write-Host " -> $url" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# Open in browser
Start-Process $url

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    
    $rawPath = $request.Url.LocalPath.TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($rawPath) -or $rawPath -eq "preview.html" -or $rawPath -eq "index.html") {
        $filePath = $previewFile
    } else {
        $filePath = Join-Path $distDir $rawPath.Replace('/', '\')
        if (-not (Test-Path $filePath -PathType Leaf)) {
            $filePath = Join-Path $rootDir $rawPath.Replace('/', '\')
        }
    }

    if (Test-Path $filePath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $contentType = switch ($ext) {
            ".html" { "text/html; charset=utf-8" }
            ".htm"  { "text/html; charset=utf-8" }
            ".css"  { "text/css; charset=utf-8" }
            ".js"   { "text/javascript; charset=utf-8" }
            ".jpg"  { "image/jpeg" }
            ".jpeg" { "image/jpeg" }
            ".png"  { "image/png" }
            ".svg"  { "image/svg+xml" }
            default { "application/octet-stream" }
        }

        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $response.ContentType = $contentType
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $response.StatusCode = 404
        $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $response.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
    }
    $response.OutputStream.Close()
}
