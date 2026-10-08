# Poids des détecteurs

Les fichiers entraînés sont à récupérer dans les sorties Kaggle du notebook de référence. Ils ne sont pas inclus dans ce dépôt.

Pour le modèle retenu, copier `runs_entrainement/entrainement_final_D20_D40/weights/best.pt` vers un **nouveau** fichier `models/yolov8n_final.pt`. Si une version existe déjà, la sauvegarder dans un nouveau fichier daté avant tout remplacement.

Autres noms reconnus : `yolov8n_baseline.pt`, `yolov8s.pt` et `yolov8n_imgsz960.pt`. Au moins un modèle est nécessaire pour l’inférence. Les poids ajoutés sont détectés automatiquement par l’API.

Installation complète : voir [le guide](../docs/GETTING_STARTED.md).
