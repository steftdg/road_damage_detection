#Requires -Version 5.1
<#
.SYNOPSIS
Prépare les dépendances locales sans remplacer un environnement existant.
.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1 -WithInference -EnvironmentPath .venv-inference
#>
[CmdletBinding()]
param(
    [string]$EnvironmentPath = '.venv',
    [switch]$WithInference,
    [switch]$SkipFrontend
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$VenvPath = if ([IO.Path]::IsPathRooted($EnvironmentPath)) {
    [IO.Path]::GetFullPath($EnvironmentPath)
} else {
    [IO.Path]::GetFullPath((Join-Path $ProjectRoot $EnvironmentPath))
}
if (-not $VenvPath.StartsWith($ProjectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Le dossier de l'environnement doit être situé dans ce dépôt."
}

$Requirements = Join-Path $ProjectRoot 'requirements-dev.txt'
$InferenceRequirements = Join-Path $ProjectRoot 'requirements.txt'
$PythonExe = Join-Path $VenvPath 'Scripts\python.exe'
$EnvironmentExisted = Test-Path -LiteralPath $VenvPath

if (-not (Test-Path -LiteralPath $Requirements -PathType Leaf)) {
    throw "Fichier de dépendances absent : $Requirements"
}

if (-not $EnvironmentExisted) {
    $Launcher = Get-Command py.exe -ErrorAction SilentlyContinue
    if ($Launcher) {
        & $Launcher.Source -3.12 -m venv $VenvPath
    } else {
        $BasePython = Get-Command python.exe -ErrorAction SilentlyContinue
        if (-not $BasePython) { throw 'Installez Python 3.12 puis relancez ce script.' }
        & $BasePython.Source -c 'import sys; sys.exit(0 if sys.version_info[:2] == (3, 12) else 1)'
        if ($LASTEXITCODE -ne 0) { throw 'Python 3.12 est nécessaire pour cet environnement.' }
        & $BasePython.Source -m venv $VenvPath
    }
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $PythonExe -PathType Leaf)) {
        throw "La création a échoué. Les fichiers éventuellement créés restent dans $VenvPath."
    }
    Write-Host "Environnement créé : $VenvPath" -ForegroundColor Green
} elseif (-not (Test-Path -LiteralPath $PythonExe -PathType Leaf)) {
    throw "Le dossier existe mais ne contient pas de Python utilisable : $VenvPath. Choisissez un nouveau chemin avec -EnvironmentPath."
}

if ($EnvironmentExisted) {
    # Ne pas laisser pip remplacer ou désinstaller des paquets dans un environnement existant.
    $CheckRequirements = @'
from pathlib import Path
from importlib.metadata import PackageNotFoundError, version
from pip._vendor.packaging.requirements import Requirement
import sys

def requirements(path):
    path = Path(path)
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("-r "):
            yield from requirements(path.parent / line[3:].strip())
        else:
            yield Requirement(line)

problems = []
for source in sys.argv[1:]:
    for requirement in requirements(source):
        if requirement.marker and not requirement.marker.evaluate():
            continue
        try:
            installed = version(requirement.name)
        except PackageNotFoundError:
            problems.append(f"{requirement.name} : absent")
            continue
        if installed not in requirement.specifier:
            problems.append(f"{requirement.name} : {installed}, attendu {requirement.specifier}")
if problems:
    print("\n".join(problems))
    sys.exit(1)
'@
    $RequirementFiles = @($Requirements)
    if ($WithInference) { $RequirementFiles += $InferenceRequirements }
    $CheckRequirements | & $PythonExe - @RequirementFiles
    if ($LASTEXITCODE -ne 0) {
        $SuggestedPath = '.venv-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
        $InferenceFlag = if ($WithInference) { ' -WithInference' } else { '' }
        throw "L’environnement existant est préservé. Pour installer les dépendances dans un nouveau dossier : .\scripts\setup.ps1 -EnvironmentPath $SuggestedPath$InferenceFlag"
    }
    Write-Host "Environnement existant réutilisé : $VenvPath" -ForegroundColor Green
} else {
    if ($WithInference) {
        Write-Host 'Installation du moteur YOLO et de ses dépendances ; le téléchargement peut être volumineux.'
        & $PythonExe -m pip install --use-feature=truststore --disable-pip-version-check -r $InferenceRequirements
        if ($LASTEXITCODE -ne 0) { throw "Installation du moteur incomplète. L’environnement est conservé : $VenvPath" }
    }
    & $PythonExe -m pip install --use-feature=truststore --disable-pip-version-check -r $Requirements
    if ($LASTEXITCODE -ne 0) { throw "Installation API incomplète. L’environnement est conservé : $VenvPath" }
}

& $PythonExe -m pip check
if ($LASTEXITCODE -ne 0) { throw "Dépendances incompatibles dans $VenvPath ; aucun nettoyage n’a été effectué." }

if (-not $SkipFrontend) {
    $FrontendPath = Join-Path $ProjectRoot 'frontend'
    if (-not (Test-Path -LiteralPath (Join-Path $FrontendPath 'package.json') -PathType Leaf)) {
        throw 'Le frontend est absent. Vous pouvez préparer uniquement Python avec -SkipFrontend.'
    }
    $Node = Get-Command node.exe -ErrorAction SilentlyContinue
    $Npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $Node -or -not $Npm) { throw 'Installez Node.js 22.12 ou supérieur pour préparer le frontend.' }
    $NodeVersion = [version]((& $Node.Source --version).Trim().TrimStart('v'))
    if (-not (($NodeVersion -ge [version]'22.12.0') -or ($NodeVersion.Major -eq 20 -and $NodeVersion -ge [version]'20.19.0'))) {
        throw "Version Node.js $NodeVersion incompatible : utilisez Node.js 22.12 ou supérieur."
    }
    if (Test-Path -LiteralPath (Join-Path $FrontendPath 'node_modules') -PathType Container) {
        Write-Host 'node_modules existe : dépendances frontend conservées sans réinstallation.'
    } else {
        $Lockfile = Join-Path $FrontendPath 'package-lock.json'
        if (Test-Path -LiteralPath $Lockfile -PathType Leaf) {
            $BackupPath = Join-Path $ProjectRoot 'runtime\backups'
            [IO.Directory]::CreateDirectory($BackupPath) | Out-Null
            $BackupName = 'package-lock-' + (Get-Date -Format 'yyyyMMdd-HHmmssfff') + '-' + [guid]::NewGuid().ToString('N') + '.json'
            $BackupFile = Join-Path $BackupPath $BackupName
            Copy-Item -LiteralPath $Lockfile -Destination $BackupFile
            Write-Host "Sauvegarde du verrou npm : $BackupFile"
        }
        Push-Location $FrontendPath
        $PreviousNodeOptions = [Environment]::GetEnvironmentVariable('NODE_OPTIONS', 'Process')
        try {
            # Conserver la vérification HTTPS en utilisant les certificats Windows si Node le permet.
            $SupportsSystemCa = ($NodeVersion -ge [version]'22.15.0') -and [bool](& $Node.Source --help | Select-String -SimpleMatch '--use-system-ca')
            if ($SupportsSystemCa -and $PreviousNodeOptions -notmatch '(?:^|\s)--use-system-ca(?:\s|$)') {
                [Environment]::SetEnvironmentVariable('NODE_OPTIONS', (($PreviousNodeOptions + ' --use-system-ca').Trim()), 'Process')
            }
            & $Npm.Source install --no-audit --no-fund
            if ($LASTEXITCODE -ne 0) { throw 'Installation frontend incomplète. Les fichiers créés sont conservés.' }
        } finally {
            [Environment]::SetEnvironmentVariable('NODE_OPTIONS', $PreviousNodeOptions, 'Process')
            Pop-Location
        }
    }
}

Write-Host ''
Write-Host 'Préparation terminée.' -ForegroundColor Green
Write-Host "Démarrer : .\scripts\start.ps1 -EnvironmentPath '$EnvironmentPath' -OpenBrowser"
if (-not $WithInference) {
    Write-Host "L'interface et l'API fonctionnent sans YOLO. Pour l'inférence, créez un nouvel environnement avec -WithInference et ajoutez vos poids dans models/."
}
