# Démarrer l’application

L’application associe un frontend React/TypeScript et une API FastAPI. L’inférence réutilise les poids YOLOv8 du projet et distingue les fissures alligator (`D20`) des nids-de-poule (`D40`). Le notebook `reference/detection.ipynb` reste la référence pour l’entraînement ; il n’est pas nécessaire pour lancer l’interface.

## Préparer Windows

Installer Python **3.12** et Node.js **22.12 ou supérieur**. Les versions compatibles avec Vite sont décrites dans sa [documentation officielle](https://vite.dev/guide/). Depuis la racine du dépôt :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1 -OpenBrowser
```

Ouvrir `http://127.0.0.1:5173`. L’API est disponible sur `http://127.0.0.1:8000` et sa documentation interactive sur `http://127.0.0.1:8000/docs`. Garder le terminal de lancement ouvert ; **Ctrl+C** arrête les deux services lancés par cette session.

La préparation par défaut installe l’API et ses outils de test. Elle permet de consulter l’interface et l’état des modèles sans télécharger PyTorch. Pour activer l’analyse de vos fichiers, installer aussi le moteur d’inférence et fournir les poids décrits ci-dessous.

Les scripts n’écrasent aucun environnement existant. Si `.venv` contient déjà toutes les dépendances demandées, il est réutilisé. Sinon le script signale les paquets absents ou incompatibles et indique un nouveau nom d’environnement. Par exemple :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1 -WithInference -EnvironmentPath .venv-inference
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1 -EnvironmentPath .venv-inference -OpenBrowser
```

`-WithInference` installe les dépendances du `requirements.txt` original, dont Ultralytics et PyTorch ; le téléchargement peut être volumineux. `-SkipFrontend` prépare seulement Python. Si `frontend/node_modules` existe, il est conservé sans réinstallation. Un verrou `package-lock.json` déjà présent est sauvegardé dans `runtime/backups/` avant la première installation frontend. Pour les téléchargements, le script utilise les certificats système sans désactiver la vérification HTTPS ; l’option Node est limitée à l’appel npm et la configuration précédente est restaurée.

## Installer les poids entraînés

Les poids ne sont pas présents dans Git. Les récupérer auprès de l’auteure du projet, puis les placer dans un dossier `models/` à la racine :

| Fichier | Usage |
| --- | --- |
| `yolov8n_baseline.pt` | Modèle de comparaison initial |
| `yolov8n_final.pt` | Modèle sélectionné par défaut |
| `yolov8s.pt` | Architecture plus grande |
| `yolov8n_imgsz960.pt` | Résolution de 960 pixels |

Il n’est pas nécessaire de disposer des quatre fichiers : les modèles absents sont signalés dans l’interface. Conserver les noms indiqués pour que le registre les reconnaisse. Aucun poids générique n’est téléchargé automatiquement pour remplacer vos poids entraînés.

Pour utiliser un autre dossier de poids, définir cette variable avant le lancement :

```powershell
$env:RDD_MODELS_DIR = 'D:\Mes modèles routiers'
.\scripts\start.ps1 -EnvironmentPath .venv-inference
```

## Données et historique

Les fichiers importés, les sorties annotées et l’historique des analyses sont conservés dans `runtime/` par défaut. L’historique survit au redémarrage de l’API. Pour changer l’emplacement :

```powershell
$env:RDD_DATA_DIR = 'D:\Analyses routières'
.\scripts\start.ps1 -EnvironmentPath .venv-inference
```

Aucune rotation ou suppression automatique n’est exécutée. Les journaux de lancement possèdent chacun un dossier daté dans `runtime/logs/`. Les deux vidéos de `data_test/` permettent de tester vos modèles sur des images réelles de route.

L’application fonctionne localement, sans authentification. Les scripts limitent les serveurs à `127.0.0.1`. Un déploiement public nécessitera une configuration d’accès, des limites de stockage et une politique de conservation adaptées.

## Lancer sans PowerShell

Sur Linux ou macOS, depuis la racine du dépôt, créer un **nouvel** environnement :

```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
cd frontend
npm install --no-audit --no-fund
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Dans un second terminal, depuis la racine :

```bash
.venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Pour préparer l’inférence dans un nouvel environnement, installer `requirements.txt` **avant** `requirements-dev.txt`. Choisir un nouveau chemin si `.venv` existe déjà. Les variables de configuration s’exportent par exemple avec `export RDD_MODELS_DIR=/chemin/vers/models`.

## Vérifier le projet

Depuis la racine sous Windows :

```powershell
$testRun = Join-Path 'runtime/test-runs' ((Get-Date -Format 'yyyyMMdd-HHmmssfff') + '-' + [guid]::NewGuid().ToString('N'))
.\.venv\Scripts\python.exe -m pytest backend/tests --basetemp $testRun -p no:cacheprovider
.\scripts\start.ps1 -SmokeTest
cd frontend
$buildDirectory = '../runtime/builds/' + (Get-Date -Format 'yyyyMMdd-HHmmssfff') + '-' + [guid]::NewGuid().ToString('N')
npm run build -- --outDir $buildDirectory
```

Les tests API couvrent les contrats et la conservation des analyses sans exiger les poids entraînés. `-SmokeTest` lance les deux serveurs, vérifie qu’ils répondent, puis arrête uniquement les processus de cette vérification. Le build reçoit un nouveau dossier daté pour préserver les sorties précédentes. Une vérification complète de la détection nécessite vos fichiers `.pt` et le moteur Ultralytics.

Si le démarrage indique qu’un port est occupé, vérifier si l’application tourne déjà. Le script ne termine aucun service existant. En cas d’échec, consulter le dossier de journaux indiqué dans le terminal ; les fichiers et les données de la session sont conservés.

## Imports Python et port personnalisé

L’erreur `ImportError: attempted relative import with no known parent package` apparaît si l’on lance `uvicorn main:app` depuis `backend/app`. Les imports tels que `from .config import Settings` nécessitent le contexte du package `backend.app`.

Après avoir arrêté ce lancement avec Ctrl+C, revenir à la racine et utiliser le chemin complet :

```powershell
cd 'D:\Documents\GitHub\steftdg\road_damage_detection'
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8005
```

La documentation de ce serveur sera sur `http://127.0.0.1:8005/docs`. Le frontend cible le port 8000 par défaut. Pour utiliser l’API sur 8005, dans le terminal du frontend, avant son démarrage :

```powershell
cd 'D:\Documents\GitHub\steftdg\road_damage_detection\frontend'
$env:STRATA_API_URL = 'http://127.0.0.1:8005'
npm run dev
```

Si Vite est déjà lancé, le relancer dans ce terminal pour prendre en compte la variable. La variable configure le proxy local ; elle n’ajoute aucune adresse technique dans l’interface.

Pour lancer directement les deux services avec ce port, depuis la racine, lorsque les ports 8005 et 5173 sont libres :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1 -ApiPort 8005 -OpenBrowser
```

Le script transmet automatiquement l’adresse de l’API au frontend, puis restaure la variable dans son propre processus. Les services existants ne sont pas arrêtés.
