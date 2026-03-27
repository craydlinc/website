<# 
  Upload interior-designers demo MP4s to the same R2 bucket that serves pub-*.r2.dev (see index.html / interior-designers.html).

  Prerequisites: Node.js, and either `wrangler login` or CLOUDFLARE_API_TOKEN with R2 write access.

  Usage (repo root):
    .\scripts\upload-interior-demos-r2.ps1 -BucketName YOUR_BUCKET_NAME

  Or:
    $env:CRAYDL_R2_BUCKET = 'YOUR_BUCKET_NAME'
    .\scripts\upload-interior-demos-r2.ps1

  Source files: assets/videos/interior-*.mp4 (gitignored; generate from your masters if missing).
#>
param(
  [string]$BucketName = $env:CRAYDL_R2_BUCKET
)

$ErrorActionPreference = 'Stop'

if (-not $BucketName) {
  Write-Error "Set -BucketName or environment variable CRAYDL_R2_BUCKET to your R2 bucket name (Dashboard → R2 → bucket with public r2.dev access)."
  exit 1
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$VideoDir = Join-Path $RepoRoot 'assets/videos'
$WranglerCwd = Join-Path $RepoRoot 'workers\autoseo-webhook'

if (-not (Test-Path -LiteralPath $WranglerCwd)) {
  Write-Error "Expected wrangler at $WranglerCwd"
  exit 1
}

$objects = @(
  @{ Local = 'interior-mockingbird-backyard.mp4'; Key = 'videos/interior-mockingbird-backyard.mp4' },
  @{ Local = 'interior-visualization-home-tour.mp4'; Key = 'videos/interior-visualization-home-tour.mp4' },
  @{ Local = 'interior-game-room-theatre-4.mp4'; Key = 'videos/interior-game-room-theatre-4.mp4' },
  @{ Local = 'interior-theatre-game-room-2.mp4'; Key = 'videos/interior-theatre-game-room-2.mp4' },
  @{ Local = 'interior-arcware-multiplayer-roadmap.mp4'; Key = 'videos/interior-arcware-multiplayer-roadmap.mp4' }
)

Push-Location $WranglerCwd
try {
  foreach ($o in $objects) {
    $file = Join-Path $VideoDir $o.Local
    if (-not (Test-Path -LiteralPath $file)) {
      Write-Warning "Skipping missing file: $file"
      continue
    }
    $dest = "$BucketName/$($o.Key)"
    Write-Host "Uploading $($o.Key) ..."
    npx wrangler r2 object put $dest --file="$file" --content-type "video/mp4" --remote
  }
  Write-Host "Done. Keys are under videos/; public URLs match interior-designers.html."
}
finally {
  Pop-Location
}
