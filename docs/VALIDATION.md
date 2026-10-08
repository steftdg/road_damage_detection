# Vérifications de STRATA

Vérifications effectuées le 8 octobre 2026, sur Windows avec Python 3.12 et Chrome.

| Vérification | Résultat |
| --- | --- |
| Tests API et pipeline (`backend/tests`) | 7 tests réussis |
| Parcours navigateur (`frontend/tests`) | 9 tests réussis |
| TypeScript strict, application, configuration et tests | Réussi |
| Compilation Vite de production | Réussie, sorties datées dans `runtime/builds/` |
| Démarrage et arrêt des services par `start.ps1 -SmokeTest` | Réussi |
| Cohérence des dépendances Python (`pip check`) | Réussie |
| Revue visuelle desktop 1440 px et mobile 390 × 844 | Corrections demandées puis confirmées par une revue indépendante |
| Détection mécanique des défauts de design | Aucun constat |
| Provenance de la photographie de terrain | Source vidéo du dépôt documentée, sidecar présent |

## Ce qui a été exercé

Import et aperçu, format refusé sans perdre le fichier sélectionné, API déconnectée, poids absents, réglage du seuil au clavier, états en attente et progression, erreurs et interruption, sélection des zones, liens d’export, lecture détaillée d’une analyse depuis l’historique, recherche et filtres. Les pages Analyse, Historique, Modèles et Guide ne débordent pas horizontalement à 390 px ; les tableaux disposent de leur propre défilement.

Le premier Tab révèle le lien « Aller au contenu ». Entrée transfère le focus au contenu principal sans changer la page. Sur mobile à vide, le bouton de chargement est visible dans le premier écran ; après sélection, le média reprend la priorité.

Les tests API utilisent un détecteur synthétique injecté uniquement dans les tests. Les tests navigateur interceptent les requêtes avec des fixtures explicitement nommées synthétiques. Ces vérifications portent sur le fonctionnement logiciel, pas sur la précision du modèle, et n’ajoutent pas de fausses analyses à l’historique de l’application.

## Vérification restante avec le modèle

Aucun poids `.pt` n’est présent. Ultralytics/PyTorch et FFmpeg ne sont pas installés dans l’environnement léger `.venv`. L’API annonce honnêtement cet état ; le lancement d’une analyse nécessite les poids et le moteur.

Après récupération des poids, suivre [le guide](GETTING_STARTED.md) pour créer un nouvel environnement d’inférence. Vérifier une image puis les vidéos originales dans `data_test/`, comparer visuellement les annotations, contrôler le CSV/JSON complet et essayer l’interruption. La lecture de la vidéo annotée dans le navigateur nécessite FFmpeg avec H.264 ; une sortie téléchargeable est prévue sinon.

## Conservation

Les fichiers du dépôt préexistants ont été préservés ; les modifications du README et du fichier d’exclusion ont des sauvegardes datées dans `runtime/backups/`. Les versions intermédiaires du code, journaux, builds et captures sont également conservés dans des chemins uniques. Aucun nettoyage automatique des données utilisateur n’est exécuté.
