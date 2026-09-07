$root = (Get-Location).Path
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:8000/")
$listener.Start()
Write-Host "Waqar Electronics admin: http://localhost:8000/"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $path = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath)
    if ($context.Request.HttpMethod -eq "POST" -and $path -eq "/api/github") {
      $context.Response.StatusCode = 503
      $body = '{"error":"GitHub integration is not configured on this local PowerShell server. Use server.py with GITHUB_TOKEN for GitHub feedback."}'
      $bytes = [Text.Encoding]::UTF8.GetBytes($body)
      $context.Response.ContentType = "application/json"
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      $context.Response.Close()
      continue
    }

    if ($path -eq "/") { $path = "/index.html" }
    $file = Join-Path $root ($path.TrimStart("/").Replace("/", "\"))
    if (Test-Path $file -PathType Container) { $file = Join-Path $file "index.html" }
    if (-not (Test-Path $file -PathType Leaf)) {
      $context.Response.StatusCode = 404
      $context.Response.Close()
      continue
    }
    $bytes = [IO.File]::ReadAllBytes($file)
    $context.Response.StatusCode = 200
    $extension = [IO.Path]::GetExtension($file).ToLowerInvariant()
    $contentTypes = @{ ".html" = "text/html; charset=utf-8"; ".css" = "text/css; charset=utf-8"; ".js" = "text/javascript; charset=utf-8"; ".json" = "application/json; charset=utf-8"; ".webmanifest" = "application/manifest+json; charset=utf-8"; ".svg" = "image/svg+xml" }
    $context.Response.ContentType = if ($contentTypes.ContainsKey($extension)) { $contentTypes[$extension] } else { "application/octet-stream" }
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
  }
} finally {
  $listener.Stop()
}
