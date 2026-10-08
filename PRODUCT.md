# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Choix délégué par l’utilisateur : React et TypeScript avec Vite pour le frontend, FastAPI pour le backend Python. Réutiliser les détecteurs entraînés du notebook, sans réentraînement.

## Product Purpose

Analyser des images et vidéos routières avec les modèles YOLOv8 existants, examiner les dommages détectés et récupérer les résultats annotés. Priorité explicite : une expérience utilisateur soignée et un code propre des deux côtés.

## Users

Cible confirmée par l’utilisateur : démonstration du projet de mémoire. Un usage terrain futur est envisagé. Interface en français.

## Operating Context

Démonstration d’une solution d’inspection routière, avec usage terrain futur. Le contexte universitaire et les identités personnelles restent hors de l’interface. Exécution locale ; utilisateur Anonyme, pas d’authentification demandée.

## Capabilities and Constraints

- Images et vidéos ; quatre modèles : baseline, final, YOLOv8s et résolution 960.
- Classes confirmées par le notebook : 0 = D20 (fissure alligator), 1 = D40 (nid-de-poule).
- Seuil initial 0,25 ; modèle final recommandé par le README.
- Historique local, visualisation des résultats, exports JSON et CSV.
- Aucun poids .pt présent au moment de l’examen initial. L’interface doit expliquer ce prérequis et ne pas simuler de prédiction.
- La confiance ne mesure pas la gravité du dommage. Les détections vidéo peuvent compter plusieurs fois le même dommage.
- Conserver tous les fichiers existants ; sauvegarde datée avant tout remplacement. Aucun nettoyage automatique des fichiers utilisateurs.

## Evidence on Hand

`reference/detection.ipynb`, `README.md` et deux vidéos dans `data_test/`. Les mAP50 du README proviennent de la validation académique, pas d’une évaluation terrain annotée.

## Product Principles

- Le média et les résultats guident la lecture.
- Rendre visibles la progression, les erreurs et les conditions de disponibilité.
- Conserver les données et permettre leur export.
- Ne pas inventer de résultats, de gravité ou de performance terrain.

## Corrections demandées par l’utilisateur

- Interface centrée sur la solution : aucun slogan, mention de licence, établissement ou auteur dans les écrans.
- Titres directs, descriptions lisibles, formulaire et aperçu équilibrés.
- Sélecteur de modèle personnalisé accessible au clavier.
- Header avec nom de page ; navigation mobile fixe en bas, sans encombrer le header.
- Guide structuré sur toute la largeur ; caractéristiques techniques repliées par défaut.
