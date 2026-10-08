# API locale STRATA

Python 3.12 recommandé. Installer `requirements-backend.txt`, puis lancer depuis la racine :

```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

`backend.app.main` est le chemin du package Python. Le raccourci `main:app`, lancé depuis `backend/app`, charge le fichier comme un module isolé et provoque `ImportError: attempted relative import with no known parent package`.

Pour le développement sur le port 8005, depuis la racine :

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8005
```

Avec ce port, démarrer le frontend après avoir défini `$env:STRATA_API_URL = 'http://127.0.0.1:8005'` dans son terminal. Le script `scripts/start.ps1 -ApiPort 8005` configure les deux services ensemble. Les instructions détaillées sont dans [le guide de démarrage](../docs/GETTING_STARTED.md).

La documentation interactive est à http://127.0.0.1:8000/docs. Un seul processus Uvicorn doit utiliser le même dossier de données : le worker d'inférence est sérialisé pour limiter la mémoire et protéger le moteur YOLO.

`RDD_MODELS_DIR` configure le dossier des poids (par défaut `models/`). `RDD_DATA_DIR` configure les fichiers et l'historique (par défaut `runtime/`). Les quatre noms des poids attendus sont exposés par `GET /api/models`.

L'API démarre sans Torch ni poids, avec un état explicite d'indisponibilité. Pour l'inférence réelle, installer aussi les dépendances du `requirements.txt` original et fournir les poids entraînés D20/D40. Le chargement est différé jusqu'à la première analyse. Aucun téléchargement de modèle générique ni résultat de démonstration n'est utilisé.

Les images JPG/PNG/WebP sont limitées à 25 Mo et 40 millions de pixels. Les vidéos MP4/MOV/AVI/MKV/WebM sont limitées à 250 Mo, cinq minutes et 4K. Le contenu est réellement décodé. Les vidéos de plus de 1 800 images sont échantillonnées à cadence constante, explicitement signalées, et leur sortie conserve la durée de la source. Les observations répétées d'un même dommage sur plusieurs images ne sont pas des dommages uniques.

FFmpeg avec `libx264` permet de produire une vidéo H.264 lisible dans le navigateur. Sans FFmpeg, la sortie MP4 annotée reste téléchargeable. La sortie est muette ; l'audio de la source n'est pas recopié.

Chaque upload possède un dossier UUID neuf. L'annulation conserve tous les fichiers, y compris les sorties partielles, et arrête le traitement après l'image courante. Les fichiers rejetés après réception restent également sur disque. L'historique SQLite conserve les versions des états par ajout de snapshots ; aucun nettoyage automatique n'est effectué. Au redémarrage, les traitements interrompus sont marqués en échec, sans réécriture de leurs fichiers.

`POST /api/analyses` reçoit les champs multipart `file`, `model_id` (`final` par défaut) et `confidence` (`0.25`, entre `0.05` et `0.95`). Il retourne HTTP 202 et un identifiant à suivre via `GET /api/analyses/{id}`. Une absence de poids ou du moteur retourne HTTP 409 avec un message exploitable.

L'interface reçoit au plus 2 000 détections par analyse ; `GET /api/analyses/{id}/export?format=json|csv` diffuse l'intégralité du relevé. L'historique est paginé avec `limit`/`offset`. Les ressources sont accessibles uniquement dans le dossier de leur analyse et sur une liste de noms explicite.

Ce service est conçu pour être lancé sur la machine locale. La commande lie le serveur à `127.0.0.1`. Un usage public nécessite un déploiement adapté, une politique de stockage et un contrôle d'accès.
