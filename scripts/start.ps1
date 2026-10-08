#Requires -Version 5.1
<#
.SYNOPSIS
Lance l’API et le frontend localement ; Ctrl+C arrête uniquement leurs processus.
.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1 -OpenBrowser
#>
[CmdletBinding()]
param(
    [string]$EnvironmentPath = '.venv',
    [ValidateRange(1, 65535)]
    [int]$ApiPort = 8000,
    [switch]$OpenBrowser,
    [switch]$SmokeTest
)

$ErrorActionPreference = 'Stop'
if ($ApiPort -eq 5173) { throw "L’API et le frontend doivent utiliser des ports différents ; le frontend utilise 5173." }
$ApiUrl = "http://127.0.0.1:$ApiPort"
$ProjectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$VenvPath = if ([IO.Path]::IsPathRooted($EnvironmentPath)) {
    [IO.Path]::GetFullPath($EnvironmentPath)
} else {
    [IO.Path]::GetFullPath((Join-Path $ProjectRoot $EnvironmentPath))
}
$PythonExe = Join-Path $VenvPath 'Scripts\python.exe'
$FrontendPath = Join-Path $ProjectRoot 'frontend'
$ViteEntry = Join-Path $FrontendPath 'node_modules\vite\bin\vite.js'
$Node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not (Test-Path -LiteralPath $PythonExe -PathType Leaf)) { throw 'Environnement Python absent : lancez scripts/setup.ps1.' }
if (-not $Node -or -not (Test-Path -LiteralPath $ViteEntry -PathType Leaf)) { throw 'Dépendances frontend absentes : lancez scripts/setup.ps1.' }

$ListeningPorts = @([Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() | ForEach-Object { $_.Port })
foreach ($Port in @($ApiPort, 5173)) {
    if ($ListeningPorts -contains $Port) {
        throw "Le port $Port est déjà utilisé. Aucun processus existant ne sera arrêté. Fermez votre service ou réutilisez l’application déjà lancée."
    }
}

$RunId = (Get-Date -Format 'yyyyMMdd-HHmmssfff') + '-' + [guid]::NewGuid().ToString('N').Substring(0, 8)
$LogPath = Join-Path $ProjectRoot "runtime\logs\$RunId"
[IO.Directory]::CreateDirectory($LogPath) | Out-Null
$OwnedProcesses = @{}
$RootProcesses = @()

function Register-OwnedProcess {
    param([Diagnostics.Process]$Process)
    try {
        $OwnedProcesses[$Process.Id] = $Process.StartTime.ToUniversalTime()
    } catch { }
}

function Register-Descendants {
    # Enregistrer seulement les descendants des deux services créés dans cette session.
    $Processes = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)
    $Changed = $true
    while ($Changed) {
        $Changed = $false
        foreach ($Candidate in $Processes) {
            $CandidateId = [int]$Candidate.ProcessId
            $ParentId = [int]$Candidate.ParentProcessId
            if (-not $OwnedProcesses.ContainsKey($CandidateId) -and $OwnedProcesses.ContainsKey($ParentId)) {
                try {
                    $Parent = Get-Process -Id $ParentId -ErrorAction Stop
                    if ($Parent.StartTime.ToUniversalTime() -ne $OwnedProcesses[$ParentId]) { continue }
                    $Child = Get-Process -Id $CandidateId -ErrorAction Stop
                    if ($Child.StartTime.ToUniversalTime() -lt $OwnedProcesses[$ParentId]) { continue }
                    Register-OwnedProcess $Child
                    $Changed = $true
                } catch { }
            }
        }
    }
}

function Stop-OwnedProcesses {
    Register-Descendants
    # Arrêter les descendants les plus récents avant les services ; ne jamais chercher par nom ni par port.
    $Entries = @($OwnedProcesses.GetEnumerator() | Sort-Object Value -Descending)
    foreach ($Entry in $Entries) {
        try {
            $Current = Get-Process -Id $Entry.Key -ErrorAction Stop
            if ($Current.StartTime.ToUniversalTime() -eq $Entry.Value) {
                Stop-Process -InputObject $Current -ErrorAction SilentlyContinue
            }
        } catch { }
    }
}

function Test-LocalEndpoint {
    param([string]$Url)
    try {
        $Response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
        return ($Response.StatusCode -eq 200)
    } catch { return $false }
}

try {
    $Api = Start-Process -FilePath $PythonExe -ArgumentList @('-m', 'uvicorn', 'backend.app.main:app', '--host', '127.0.0.1', '--port', [string]$ApiPort) -WorkingDirectory $ProjectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $LogPath 'api.stdout.log') -RedirectStandardError (Join-Path $LogPath 'api.stderr.log')
    Register-OwnedProcess $Api
    $RootProcesses += $Api
    # Exécuter Vite directement évite une chaîne de processus npm/cmd difficile à arrêter proprement.
    $PreviousApiUrl = [Environment]::GetEnvironmentVariable('STRATA_API_URL', 'Process')
    try {
        [Environment]::SetEnvironmentVariable('STRATA_API_URL', $ApiUrl, 'Process')
        $Frontend = Start-Process -FilePath $Node.Source -ArgumentList @(('"' + $ViteEntry + '"'), '--host', '127.0.0.1', '--port', '5173', '--strictPort') -WorkingDirectory $FrontendPath -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $LogPath 'frontend.stdout.log') -RedirectStandardError (Join-Path $LogPath 'frontend.stderr.log')
    } finally {
        [Environment]::SetEnvironmentVariable('STRATA_API_URL', $PreviousApiUrl, 'Process')
    }
    Register-OwnedProcess $Frontend
    $RootProcesses += $Frontend

    Write-Host "Démarrage de l'application…"
    $Deadline = (Get-Date).AddSeconds(45)
    $Ready = $false
    do {
        Register-Descendants
        foreach ($Service in $RootProcesses) {
            if ($Service.HasExited) { throw "Un service a quitté avec le code $($Service.ExitCode). Consultez $LogPath." }
        }
        $Ready = (Test-LocalEndpoint "$ApiUrl/api/health") -and (Test-LocalEndpoint 'http://127.0.0.1:5173')
        if (-not $Ready) { Start-Sleep -Milliseconds 400 }
    } until ($Ready -or (Get-Date) -ge $Deadline)
    if (-not $Ready) { throw "Démarrage trop long. Consultez $LogPath." }

    Write-Host 'Application : http://127.0.0.1:5173' -ForegroundColor Green
    Write-Host "Documentation API : $ApiUrl/docs"
    Write-Host "Journaux : $LogPath"
    Write-Host "Processus : API $($Api.Id), frontend $($Frontend.Id), superviseur $PID"
    if ($SmokeTest) {
        Write-Host 'Vérification du démarrage réussie.' -ForegroundColor Green
        return
    }
    Write-Host 'Laissez ce terminal ouvert. Ctrl+C arrête les deux services.'
    if ($OpenBrowser) { Start-Process 'http://127.0.0.1:5173' }

    while ($true) {
        Register-Descendants
        foreach ($Service in $RootProcesses) {
            if ($Service.HasExited) { throw "Un service s’est arrêté (code $($Service.ExitCode)). Consultez $LogPath." }
        }
        Start-Sleep -Milliseconds 600
    }
} finally {
    Stop-OwnedProcesses
    Write-Host "Services de cette session arrêtés. Les médias, l'historique et les journaux sont conservés."
}
