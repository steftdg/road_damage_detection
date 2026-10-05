# road_damage_detection
Automatic road damage detection from video using YOLOv8, with a generalization test on real road footage from Cotonou, Benin : bachelor's thesis project IFRI.

# Détection automatique des dégâts routiers au Bénin

Détection automatique de deux types de dégâts routiers — fissures alligator (D20) et
nids-de-poule (D40) — par vision par ordinateur, à partir d'images et de vidéos. Le
projet couvre l'entraînement de quatre détecteurs YOLOv8, leur comparaison, et une
interface web permettant de tester l'inférence directement sur ses propres fichiers.

## Contexte

Au Bénin, le diagnostic des dégâts routiers reste largement manuel, sans suivi
systématique ni priorisation objective des interventions. Les images et vidéos de
terrain sont pourtant faciles à produire aujourd'hui (smartphone, dashcam) mais
restent inexploitées faute d'outil pour les analyser automatiquement et à grande
échelle. Ce projet explore si un détecteur de vision par ordinateur peut identifier
ces dégâts directement sur des données capturées en conditions réelles, et pas
seulement sur un jeu de données académique propre.

## Données

Le jeu d'entraînement est dérivé de RDD2022 (Road Damage Dataset 2022), filtré sur
deux classes :

| Code | Dégât              |
|------|---------------------|
| D20  | Fissure alligator   |
| D40  | Nid-de-poule        |

Après filtrage : 7 464 images gardées sur 26 869 pour l'entraînement, 1 558 sur 5 758
pour la validation.

## Modèles

Quatre détecteurs YOLOv8 ont été entraînés, chacun répondant à une question
différente plutôt qu'une simple répétition :

| Modèle                  | Architecture | Epochs | Résolution | mAP50 | Rôle |
|--------------------------|--------------|--------|------------|-------|------|
| `yolov8n_baseline.pt`   | YOLOv8n      | 15     | 640px      | 0.515 | Validation du pipeline |
| `yolov8n_final.pt`      | YOLOv8n      | 80     | 640px      | 0.599 | Modèle de référence |
| `yolov8s.pt`            | YOLOv8s      | 80     | 640px      | 0.606 | Architecture plus lourde |
| `yolov8n_imgsz960.pt`   | YOLOv8n      | 80     | 960px      | 0.606 | Résolution doublée |

Les poids `.pt` ne sont pas versionnés sur ce dépôt (voir `.gitignore`) — à récupérer
séparément et à déposer dans `models/`.

## Comparaison en conditions réelles

Les quatre modèles ont été évalués sur 33 fichiers réels capturés à Cotonou (31
vidéos, 2 images), avec un seuil de confiance de 0.25 identique pour les quatre.

| Modèle           | Détections totales | FPS moyen (vidéo) |
|-------------------|--------------------|--------------------|
| Baseline          | 26 150             | 94.9               |
| Final              | 25 472             | 95.0               |
| YOLOv8s            | 24 360             | 93.9               |
| Résolution 960     | 24 518             | 83.8               |

Le modèle final (YOLOv8n, 80 epochs, 640px) est retenu par défaut : meilleur
compromis entre précision, stabilité et vitesse d'inférence. Cette comparaison porte
sur des volumes de détections, pas sur une précision/rappel mesurés — aucune vérité
terrain n'est annotée sur les données de Cotonou à ce stade.

## Structure du dépôt
├── README.md
├── .gitignore
├── reference/
│ └── detection.ipynb # notebook Kaggle complet : filtrage, entraînement, inférence
├── models/ # poids .pt des 4 modèles 
├── static/
│ ├── uploads/ # fichiers reçus via l'interface
│ └── resultats/ # sorties annotées générées
└── data_test/ # quelques fichiers réels pour tester l'interface


`reference/detection.ipynb` documente l'intégralité du travail en amont (préparation
des données, entraînement, évaluation, pipeline d'inférence) et sert de référence —
il n'est pas destiné à être exécuté tel quel en dehors de Kaggle.

## Interface web

Une interface web est en cours de construction pour permettre à l'utilisateur
d'uploader une image ou une vidéo, de choisir l'un des quatre modèles, et de récupérer
le résultat annoté (boîtes dessinées) ainsi que le détail des détections (classe,
confiance, et pour une vidéo : frame et FPS d'inférence obtenu). La stack technique
n'est pas encore figée.

## Installation

```bash
git clone <url-du-dépôt>
cd <nom-du-dépôt>
pip install -r requirements.txt
```

Déposer les 4 fichiers `.pt` dans `models/` avant de lancer l'inférence.


## Perspectives

- Annoter un sous-ensemble des données de Cotonou pour une évaluation terrain chiffrée.
- Vérifier visuellement les cas de désaccord marqué entre modèles.
- Tester le pipeline en conditions embarquées pour évaluer sa viabilité temps réel.

## Auteure

TADOGBE Trésor Steffi  Licence en Intelligence Artificielle, IFRI-UAC
