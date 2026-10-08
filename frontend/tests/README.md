# Tests navigateur

Lancez d’abord les services du projet, puis depuis `frontend/` :

```powershell
npm run test:e2e
```

Les tests utilisent le serveur existant à `http://127.0.0.1:5173`. Ils ne démarrent et n’arrêtent aucun service. `STRATA_TEST_URL` permet de choisir une autre adresse locale.

La configuration recherche un navigateur déjà installé : Chrome, Edge, puis Chromium fourni par Playwright. `STRATA_BROWSER_PATH` peut désigner un autre exécutable présent sur l’ordinateur. Aucune installation de navigateur ne s’effectue automatiquement.

Les neuf scénarios vérifient la déconnexion API, les poids absents, l’import et les formats refusés, les paramètres au clavier, la progression, la sélection des zones, les liens d’export, les erreurs serveur, la réouverture détaillée de l’historique, ses filtres, la navigation au clavier et les pages mobiles à 390 × 844 px.

Les réponses de l’API sont simulées avec `page.route`. Les détections et scores de confiance sont des fixtures inventées dans `fixtures.ts`, uniquement pour les tests : ils ne sont jamais enregistrés dans l’historique réel ni présentés dans l’application normale. L’image utilisée pour l’import est l’asset de terrain déjà présent dans le projet. Ces tests vérifient l’interface et son contrat API ; les tests Python vérifient séparément le service d’inférence.

Chaque exécution écrit ses captures et diagnostics dans un nouveau dossier horodaté et unique sous `runtime/playwright/`. Les résultats précédents sont conservés.
