<# 
  Upload interior-designers demo MP4s and the interior CD sample PDF to the same R2 bucket that serves pub-*.r2.dev (see index.html / interior-designers.html).

  Prerequisites: Node.js, and either `wrangler login` or CLOUDFLARE_API_TOKEN with R2 write access.

  Usage (repo root):
    .\scripts\upload-interior-demos-r2.ps1
    .\scripts\upload-interior-demos-r2.ps1 -DocumentsOnly   # PDF only (skip large MP4s)

  Default bucket: craydl-media. Override with -BucketName or $env:CRAYDL_R2_BUCKET.

  Note: wrangler r2 object put rejects files larger than 300 MiB; oversized MP4s are skipped with a warning (use Dashboard, S3 API, or rclone for those).

  Source files: assets/videos/interior-*.mp4 (gitignored; generate from your masters if missing); assets/documents/id-construction-drawings-ffe-schedule-sample.pdf
#>
param(
  [string]$BucketName,
  [switch]$DocumentsOnly
)

$ErrorActionPreference = 'Stop'

if (-not $BucketName) { $BucketName = $env:CRAYDL_R2_BUCKET }
if (-not $BucketName) { $BucketName = 'craydl-media' }

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$VideoDir = Join-Path $RepoRoot 'assets/videos'
$WranglerCwd = Join-Path $RepoRoot 'workers\autoseo-webhook'

if (-not (Test-Path -LiteralPath $WranglerCwd)) {
  Write-Error "Expected wrangler at $WranglerCwd"
  exit 1
}

$objects = @(
  @{ Local = 'interior-mockingbird-backyard.mp4'; Key = 'videos/interior-mockingbird-backyard.mp4'; ContentType = 'video/mp4' },
  @{ Local = 'interior-visualization-home-tour.mp4'; Key = 'videos/interior-visualization-home-tour.mp4'; ContentType = 'video/mp4' },
  @{ Local = 'interior-game-room-theatre-4.mp4'; Key = 'videos/interior-game-room-theatre-4.mp4'; ContentType = 'video/mp4' },
  @{ Local = 'interior-theatre-game-room-2.mp4'; Key = 'videos/interior-theatre-game-room-2.mp4'; ContentType = 'video/mp4' },
  @{ Local = 'interior-arcware-multiplayer-roadmap.mp4'; Key = 'videos/interior-arcware-multiplayer-roadmap.mp4'; ContentType = 'video/mp4' }
)

$DocDir = Join-Path $RepoRoot 'assets\documents'
$docObjects = @(
  @{ Local = 'id-construction-drawings-ffe-schedule-sample.pdf'; Key = 'documents/id-construction-drawings-ffe-schedule-sample.pdf'; ContentType = 'application/pdf' }
)

$WranglerR2MaxBytes = 300MB

Push-Location $WranglerCwd
try {
  if (-not $DocumentsOnly) {
    foreach ($o in $objects) {
      $file = Join-Path $VideoDir $o.Local
      if (-not (Test-Path -LiteralPath $file)) {
        Write-Warning "Skipping missing file: $file"
        continue
      }
      $len = (Get-Item -LiteralPath $file).Length
      if ($len -gt $WranglerR2MaxBytes) {
        Write-Warning "Skipping $($o.Key) ($([math]::Round($len / 1MB, 1)) MiB): wrangler limit is 300 MiB. Upload via Cloudflare Dashboard or S3-compatible API."
        continue
      }
      $dest = "$BucketName/$($o.Key)"
      $ct = $o.ContentType
      if (-not $ct) { $ct = 'video/mp4' }
      Write-Host "Uploading $($o.Key) ..."
      npx wrangler r2 object put $dest --file="$file" --content-type "$ct" --remote
      if ($LASTEXITCODE -ne 0) { throw "wrangler r2 object put failed (exit $LASTEXITCODE) for $($o.Key)" }
    }
  }
  foreach ($o in $docObjects) {
    $file = Join-Path $DocDir $o.Local
    if (-not (Test-Path -LiteralPath $file)) {
      Write-Warning "Skipping missing document: $file"
      continue
    }
    $dest = "$BucketName/$($o.Key)"
    $ct = $o.ContentType
    Write-Host "Uploading $($o.Key) ..."
    npx wrangler r2 object put $dest --file="$file" --content-type "$ct" --remote
    if ($LASTEXITCODE -ne 0) { throw "wrangler r2 object put failed (exit $LASTEXITCODE) for $($o.Key)" }
  }
  Write-Host "Done. Keys: videos/* and/or documents/*; public URLs match interior-designers.html."
}
finally {
  Pop-Location
}
