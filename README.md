# Détection automatique des dégâts routiers au Bénin

Ce projet part d'un constat simple : au Bénin, repérer les dégâts routiers (fissures,
nids-de-poule) se fait encore largement à l'œil, sans suivi systématique ni priorisation
des interventions. Or filmer une route avec un smartphone est devenu banal. L'idée ici est
de voir si un modèle de vision par ordinateur peut repérer ces dégâts automatiquement sur
des images et des vidéos prises en conditions réelles, et pas seulement sur un jeu de
données académique propre.

Je me suis concentrée sur deux types de dégâts : les fissures alligator (D20) et les
nids-de-poule (D40). Le dépôt contient le travail d'entraînement et de comparaison de
quatre détecteurs YOLOv8, ainsi qu'une interface web (STRATA) pour tester l'inférence sur
ses propres fichiers.

## Données

Le jeu d'entraînement est dérivé de RDD2022 (Road Damage Dataset 2022), filtré sur les
deux classes ci-dessus. Il reste 7 464 images sur 26 869 pour l'entraînement et 1 558 sur
5 758 pour la validation, le reste ne contenant ni D20 ni D40. Le mirror Kaggle utilisé ne
documentait pas son mapping de classes : je l'ai identifié moi-même en inspectant des
images annotées (classes 2 et 4 du mirror, réencodées en 0 pour D20 et 1 pour D40).

## Modèles

J'ai entraîné quatre versions, chacune répondant à une question précise :

| Fichier (dans `models/`) | Architecture | Epochs | Résolution | mAP50 | Rôle |
|---|---|---|---|---|---|
| `yolov8n_baseline.pt` | YOLOv8n | 15 | 640 px | 0.515 | Valider le pipeline |
| `yolov8n_final.pt` | YOLOv8n | 80 | 640 px | 0.599 | Modèle de référence |
| `yolov8s.pt` | YOLOv8s | 80 | 640 px | 0.606 | Architecture plus lourde |
| `yolov8n_imgsz960.pt` | YOLOv8n | 80 | 960 px | 0.606 | Résolution doublée |

Les quatre fichiers de poids sont inclus dans le dépôt, dans le dossier `models/`. Les
mAP50 sont ceux de la validation officielle finale du meilleur checkpoint (`best.pt`) de
chaque entraînement.

## Comparaison en conditions réelles

Les quatre modèles ont été comparés sur 33 fichiers filmés à Cotonou (31 vidéos et
2 images), avec le même seuil de confiance de 0.25 :

| Modèle | Détections totales | FPS moyen (vidéo) |
|---|---|---|
| Baseline | 26 150 | 94.9 |
| Final | 25 472 | 95.0 |
| YOLOv8s | 24 360 | 93.9 |
| Résolution 960 | 24 518 | 83.8 |

Ces FPS ont été mesurés sur Kaggle (GPU), pipeline complet compris (lecture, annotation et
écriture de la vidéo). Ils ne sont pas représentatifs d'une exécution sur CPU.

Le modèle final est retenu par défaut : meilleur compromis entre précision, stabilité et
vitesse. Un détail à garder en tête : le baseline, le moins précis, est celui qui détecte
le plus, ce qui évoque plutôt du bruit que de la sensibilité. Je n'ai pas de vérité
terrain annotée sur les données de Cotonou : cette comparaison porte sur des volumes de
détections, pas sur une précision ou un rappel mesurés.

## L'interface web (STRATA)

STRATA associe un frontend React/TypeScript et une API FastAPI. Elle permet de charger une
image ou une vidéo, de choisir un modèle et le seuil de confiance, de suivre le
traitement, d'examiner les zones détectées, de télécharger le média annoté et d'exporter
les détections en CSV ou JSON. L'historique (SQLite) et les fichiers sont conservés
localement après un redémarrage.

Les résultats vidéo comptent des détections par image, pas des dommages uniques : un même
nid-de-poule visible pendant plusieurs secondes est compté plusieurs fois. Aucun score de
gravité n'est inventé à partir de la confiance.

## Installation et premier démarrage (Windows)

Les scripts sont en PowerShell : l'application se lance donc sous Windows.

Prérequis : Git, Python 3.12 (la 3.13 ne convient pas) et Node.js 22.12 ou supérieur.

1. Cloner le dépôt, puis ouvrir PowerShell à la racine du projet.

2. Préparer l'environnement, avec l'inférence (l'installation de PyTorch demande plusieurs
   minutes et de la place disque) :

   powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1 -WithInference -EnvironmentPath .venv-inference

3. Lancer l'application :

   powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1 -EnvironmentPath '.venv-inference' -OpenBrowser

4. Attendre 10 à 30 secondes : l'interface s'ouvre sur http://127.0.0.1:5173. La
   documentation de l'API est sur http://127.0.0.1:8000/docs.

Il faut garder le terminal ouvert pendant l'utilisation : Ctrl + C arrête l'application.
Aux démarrages suivants, seule l'étape 3 est nécessaire.

Il faut lancer avec `.venv-inference`. Avec l'environnement `.venv` (sans Ultralytics),
l'interface s'ouvre mais l'inférence reste désactivée. Les modèles dont le fichier `.pt`
est absent de `models/` sont signalés comme indisponibles. Voir aussi
[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md).

## Performances

Sans carte graphique NVIDIA, l'inférence tourne sur CPU et le traitement d'une vidéo est
nettement plus lent que sur GPU. Pour une démonstration : privilégier `yolov8n_final`
(le plus rapide) et des vidéos courtes, et traiter à l'avance les vidéos montrées, car
les résultats sont conservés après redémarrage.

## Problèmes courants

- **Erreur « No suitable Python runtime found »** : Python 3.12 n'est pas installé. Voir
  `py --list`, puis installer la version 3.12.
- **Un modèle apparaît comme indisponible** : vérifier le nom exact du fichier dans
  `models/` (attention aux extensions masquées de type `.pt.zip`).
- **Message npm « New version available »** : sans importance.
- **Port déjà utilisé** : une ancienne instance tourne encore, fermer les anciens
  terminaux.

## Organisation du dépôt

```text
frontend/                 React, TypeScript, Vite, tests navigateur
backend/app/              API, validation des médias, service YOLO, stockage SQLite
backend/tests/            Tests de l'API et du pipeline
scripts/setup.ps1         Préparation des environnements
scripts/start.ps1         Lancement local de l'API et du frontend
docs/GETTING_STARTED.md   Installation, poids et vérifications
models/                   Les 4 fichiers de poids .pt
reference/detection.ipynb Notebook Kaggle complet (données, entraînement, inférence)
runtime/                  Analyses, sauvegardes et journaux locaux (hors Git)
```

Le notebook de `reference/` documente tout le travail en amont. Il garde ses chemins
Kaggle : c'est une trace, il n'est pas fait pour être relancé tel quel.

## Limites

- Pas de vérité terrain sur les données de Cotonou : pas de précision ni de rappel mesurés
  en conditions réelles.
- Les deux images fixes du jeu de test ne déclenchent presque aucune détection chez les
  quatre modèles, ce qui reste à vérifier visuellement.
- L'entraînement en résolution 960 a d'abord été interrompu sur Colab (quota GPU) puis
  relancé en entier sur Kaggle.
- L'application est prévue pour un usage local et une démonstration, sans authentification.

## Suite envisagée

- Annoter un sous-ensemble des données de Cotonou pour une évaluation chiffrée.
- Vérifier visuellement les cas où les modèles divergent le plus.
- Tester le pipeline en conditions embarquées pour évaluer le temps réel.

## Auteure

TADOGBE Trésor Steffi, Licence en Intelligence Artificielle, IFRI-UAC