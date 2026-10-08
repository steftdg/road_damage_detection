# Récupérer les modèles entraînés

Le notebook `reference/detection.ipynb` contient le code **et les journaux de quatre entraînements terminés**. Les cellules 7, 9, 11 et 13 annoncent la validation de leur fichier `weights/best.pt`. L’erreur de la cellule 17 concerne l’ouverture d’une vidéo ; elle survient après les entraînements.

Ces journaux prouvent que les fichiers ont été produits pendant cette exécution. Ils ne les embarquent pas dans le notebook. Aucun fichier `.pt` n’est actuellement présent dans `models/`, et le notebook exporté ne contient pas l’identifiant public permettant de retrouver sa page Kaggle.

## Option à privilégier : récupérer le fichier existant

Demander au collaborateur le **`best.pt` du modèle final D20/D40**, ou le lien de la version Kaggle dont les sorties ont été conservées. Sur Kaggle, consulter les fichiers de sortie de cette version enregistrée. La [CLI officielle Kaggle](https://github.com/Kaggle/kaggle-cli/blob/main/docs/kernels.md) permet également de télécharger les sorties quand l’identifiant du notebook et les accès nécessaires sont connus.

Chemins issus du notebook, sous `/kaggle/working/runs_entrainement/` :

| Version dans l’interface | Fichier produit | Destination locale |
|---|---|---|
| Standard | `entrainement_final_D20_D40/weights/best.pt` | `models/yolov8n_final.pt` |
| Version initiale | `baseline_D20_D40/weights/best.pt` | `models/yolov8n_baseline.pt` |
| Réseau étendu | `yolov8s_D20_D40/weights/best.pt` | `models/yolov8s.pt` |
| Haute résolution | `yolov8n_imgsz960_D20_D40/weights/best.pt` | `models/yolov8n_imgsz960.pt` |

**Un seul fichier suffit pour commencer : le modèle Standard.** Copier le fichier sous le nom attendu ; préserver toute version déjà présente avant remplacement. L’API détecte automatiquement la présence des fichiers. Les dépendances d’inférence doivent aussi être installées selon `GETTING_STARTED.md`.

## Si les sorties ont été perdues : réentraîner

Le code permet de produire de nouveaux poids :

1. Récupérer le jeu RDD2022 utilisé par le notebook, avec images et annotations (`RDD_SPLIT/train` et `RDD_SPLIT/val`). Les vidéos dans `data_test/` ne remplacent pas ce jeu annoté.
2. Adapter les chemins Kaggle à l’environnement choisi. Utiliser de nouveaux dossiers de données et de sortie pour préserver les fichiers existants.
3. Préparer les classes D20 et D40 comme dans la cellule 4, en remappant les identifiants 2 et 4 vers 0 et 1.
4. Exécuter l’entraînement final de la cellule 9 : YOLOv8n, 80 cycles, images 640 px. Un environnement GPU adapté évite un entraînement très lent sur CPU.
5. Récupérer le nouveau `weights/best.pt` puis le connecter à l’application.

La [documentation Ultralytics](https://docs.ultralytics.com/modes/train/) décrit l’entraînement et les checkpoints. Télécharger le modèle générique `yolov8n.pt` fournit un point de départ ; cela ne remplace pas le détecteur D20/D40 entraîné. Un nouvel entraînement ne garantit pas les mêmes poids ni exactement les scores publiés.

Les journaux du notebook indiquent environ 1,71 heure pour l’entraînement final lors de l’exécution d’origine. Cette durée n’est pas une estimation pour l’ordinateur actuel. Aucun entraînement ni téléchargement de jeu de données n’a été lancé automatiquement.
