# Poore project ki jaanch: backend tests, deploy check, frontend tests aur build.
# Istemal (project ki jad se):  .\run-all-tests.ps1
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$python = Join-Path $root 'Backend\venv\Scripts\python.exe'
$django = Join-Path $root 'Backend\petrolPump'
$frontend = Join-Path $root 'frontend'

function Step([string]$name, [scriptblock]$action) {
  Write-Host "`n=== $name ===" -ForegroundColor Yellow
  & $action
  if ($LASTEXITCODE -ne 0) { throw "$name fail ho gaya (exit code $LASTEXITCODE)" }
}

Push-Location $django
try {
  Step 'Backend: migrations poori hain?' { & $python manage.py makemigrations --check --dry-run }
  Step 'Backend: tests' { & $python manage.py test }
  $env:DJANGO_DEBUG = 'False'
  try {
    Step 'Backend: deploy check' { & $python manage.py check --deploy }
  } finally {
    $env:DJANGO_DEBUG = 'True'
  }
} finally {
  Pop-Location
}

Push-Location $frontend
try {
  Step 'Frontend: tests' { npm test }
  Step 'Frontend: build' { npm run build }
} finally {
  Pop-Location
}

Write-Host "`nSab kuch theek hai." -ForegroundColor Green