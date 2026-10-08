---
name: STRATA
description: Interface française d'inspection routière centrée sur le média et les commandes.
colors:
  primary: "#245c46"
  primary-hover: "#174732"
  accent: "#ddf39c"
  background: "#f4f6f3"
  paper: "#fff"
  ink: "#24312c"
  muted: "#617068"
  line: "#dce3dc"
  sidebar: "#182c24"
  sidebar-text: "#c3d0c8"
  sidebar-hover: "#263b31"
  focus: "#497945"
  dropzone: "#f7faf4"
  media: "#e9ede7"
  warning: "#8a622c"
  error-surface: "#fff0ea"
typography:
  headline:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.85px"
  title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "23px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.5px"
  panel-title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "18px"
    lineHeight: 1.3
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "15px"
    lineHeight: 1.65
  control:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "13px"
  brand:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "25px"
    fontWeight: 600
    letterSpacing: "1.2px"
rounded:
  panel: "14px"
  control: "9px"
  item: "10px"
  segmented: "8px"
  tag: "4px"
spacing:
  small: "8px"
  group: "14px"
  grid: "24px"
  panel: "26px"
  gutter: "36px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
  panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.panel}"
    padding: "26px"
  model-trigger:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "13px 15px"
---

# Design System: STRATA

## Overview

**Creative North Star: "Inspection routière"**

Une interface de travail calme et lisible. La navigation végétale sombre structure les pages ; les surfaces blanches accueillent le média, les paramètres et les données. Les libellés nomment les tâches et les états du service.

L’identité existante conserve STRATA et sa palette. Manrope porte les titres et les commandes ; Space Grotesk reste limité au mot-symbole et aux numéros du guide. Le header nomme la page et l’utilisateur local est Anonyme.

**Key Characteristics:**
- Titres directs et texte courant lisible.
- Aperçu et formulaire équilibrés, résultats sur une ligne complète.
- Surfaces blanches bordées et accent citron de navigation.
- États de disponibilité explicites et navigation mobile fixe.

Document extrait de frontend/src/styles.css, des composants React et des captures de revue du 8 octobre 2026. Le code effectif reste l’autorité en cas de divergence.

## Colors

### Primary

Le vert principal porte les actions, liens, commandes choisies et états disponibles. Sa variante de survol assombrit les boutons. L’accent citron marque l’identité et l’entrée active de la sidebar.

### Neutral

Le fond clair entoure les panneaux blancs. L’encre porte le contenu principal ; le gris végétal accompagne descriptions et légendes. Les filets séparent panneaux, tableaux et étapes. La sidebar sombre utilise un texte clair au repos et un fond végétal au survol.

Les états d’attente utilisent des tons ocre avec un libellé. Les erreurs utilisent un fond terre clair. D20 est repéré en vert, D40 en abricot, dans les annotations et les repères de résultats.

**The Class Color Rule.** Accompagner la couleur de dommage d’un nom ou d’un code de classe.

## Typography

**Body Font:** Manrope, system-ui, sans-serif.  
**Identity Font:** Space Grotesk, sans-serif, pour STRATA et les numéros du guide.

Les fontes sont servies localement par Fontsource. Manrope est chargé aux graisses 400, 500, 600 et 700 ; Space Grotesk aux graisses 500, 600 et 700.

Les titres de page utilisent headline ; le header utilise title. Sur tablette entre (761px) et (980px), le titre de page passe à (27px). Sur mobile jusqu’à (760px), il passe à (26px), et le header à (20px). Les titres de panneau utilisent (18px), les titres des sections d’aide (20px).

Le texte courant varie selon le rôle entre (14px) et (15px), avec hauteur de ligne habituelle (1.65). Les boutons et labels de formulaire sont à (14px). Les indications secondaires sont généralement à (12–13px) ; la navigation du bas et certains badges utilisent (10–11px). Ces exceptions ne sont pas une taille de lecture courante. Les nombres de zoom, confiance et progression sont tabulaires.

**The Functional Type Rule.** Conserver la hiérarchie lisible des titres, descriptions et commandes ; réserver les petites tailles aux repères secondaires déjà présents.

## Layout

La sidebar fixe mesure (224px) sur ordinateur. Elle passe à (196px) jusqu’à (1200px), puis (176px) jusqu’à (980px), en conservant ses libellés. Le header sticky mesure (84px). Le contenu est limité à (1680px) avec retrait standard (32px 36px 48px).

L’analyse utilise deux colonnes : minmax(0, 1.25fr) et minmax(360px, 1fr), séparées de (24px). Les résultats occupent toutes les colonnes en dessous. À partir de (1600px), les colonnes deviennent 1.4fr / 1fr avec minimum droit (420px), et le retrait latéral (48px). Entre (981px) et (1200px), elles sont équilibrées avec minimum droit (320px) et écart (18px).

Entre (761px) et (980px), l’analyse est sur une colonne et le formulaire organise ses groupes sur deux colonnes. Sur mobile jusqu’à (760px), le formulaire est à nouveau vertical, avec écart entre panneaux (20px) et retrait de page (18px). L’import précède l’aperçu à vide ; après sélection, média et résultats prennent la priorité dans le rendu React.

Sur mobile, la sidebar disparaît. Le header mesure (66px), affiche le symbole et le nom de page. Les quatre destinations sont fixes en bas : hauteur minimale (72px), retrait inférieur intégrant env(safe-area-inset-bottom). Le contenu réserve calc(100px + env(safe-area-inset-bottom)) en bas. Jusqu’à (360px), les retraits latéraux deviennent (12px).

La visionneuse et le formulaire ont une hauteur minimale standard de (620px), puis (660px) sur grand écran. Le média de présentation remplit son cadre ; les médias chargés sont contenus. L’historique utilise un titre et une action alignés sur ordinateur, puis un retour à la ligne sur mobile. Les tableaux débordants défilent à l’intérieur de leur conteneur.

Le guide aligne quatre étapes sur toute la largeur : numéro, intitulé et explication. Sur tablette et mobile, cette grille se réorganise pour préserver la lecture ; les deux types de dommage suivent dans une section dédiée.

## Elevation & Depth

Les surfaces sont plates au repos, séparées par leurs fonds et filets. Le segment sélectionné utilise une petite ombre (0 1px 3px #14271b14). La liste de modèles ouverte utilise une ombre de superposition (0 14px 40px #152b2424). Son déclencheur ouvert porte un halo (0 0 0 2px #245c4614). Une détection mise en évidence porte un contour blanc supplémentaire (0 0 0 4px white).

La navigation mobile utilise un blanc translucide et un flou d’arrière-plan (16px). Les transitions des boutons et du dépôt durent (0.15s). Le spinner tourne en (1s), le balayage d’analyse en (3s). La préférence de réduction du mouvement supprime animations et transitions.

## Shapes

Les grands panneaux utilisent panel ; boutons, recherche et déclencheur de modèle utilisent control. Navigation latérale et dépôt utilisent item ; segments utilisent segmented. Les marqueurs et avatars sont circulaires. Les filets ordinaires mesurent (1px), le contour de dépôt (1.5px) et reste pointillé. Les rectangles de détection ont un rayon réduit (2px) et un contour (2px).

## Components

### Buttons

L’action principale est verte à texte blanc ; la secondaire est blanche à bordure végétale. Les deux utilisent padding (12px 18px), hauteur minimale (46px), graisse (700) et écart icône/texte (10px). L’analyse remplit la largeur de son panneau et mesure au moins (49px). Au survol, le fond varie ; les commandes désactivées utilisent opacité (0.48). Les liens de travail restent sans fond et se soulignent au survol.

### Cards / Containers

Visionneuse, formulaire et résultats partagent une surface blanche et un filet. Le formulaire et les résultats ont un retrait standard panel ; le formulaire passe à (22px) sur tablette/mobile et (30px) sur grand écran. Le cadre du média masque le débordement.

### Inputs / Fields

Le sélecteur de modèle est un combobox personnalisé à déclencheur pleine largeur (72px minimum), nom et indication secondaire. La liste contient nom, description courte, choix courant et repère Recommandé. Standard apparaît en premier. Flèches, Home/End et Entrée/Espace pilotent le choix ; Échap, Tab et clic extérieur ferment la liste. Celle-ci s’ouvre vers le haut si l’espace sous la commande est insuffisant.

La recherche est blanche avec icône, hauteur minimale (46px) et largeur maximale (460px) sur ordinateur, pleine largeur sur mobile. Son focus encadre le groupe (2px, offset 2px). Le seuil utilise un curseur natif teinté vert et une valeur tabulaire. Le focus des autres commandes est un contour visible (3px, offset 4px).

### Navigation

Quatre destinations avec icônes et labels. La sidebar active utilise l’accent citron, une encre sombre et graisse (700). Le bas mobile actif utilise un fond végétal clair et texte vert. L’identité locale Anonyme reste dans la sidebar ; le header est consacré au nom de page et aux actions utiles.

### Chips

Les badges recommandés sont petits, végétaux et arrondis. Les états de traitement combinent libellé et point coloré. Les filtres de résultats sont bordés ; le choix actif ajoute un fond végétal et une bordure plus soutenue.

### Upload, Media & Results

Le dépôt pointillé contient titre, explication, bouton de parcours et formats acceptés. Son état de glisser-déposer change le fond et le contour. La visionneuse rassemble Original / Détections, zoom, média et légende. L’image d’exemple est explicitement non analysée. Les résultats associent classes, confiance, sélection de zone et exports ; la confiance n’indique pas une gravité.

### Guide & Models

Le guide utilise quatre étapes numérotées et des descriptions lisibles. Les versions de modèle sont des lignes de contenu avec état et action. Les caractéristiques techniques et commandes de configuration sont repliées dans des détails à ouvrir à la demande.

## Do's and Don'ts

### Do:

- **Do** conserver les titres directs, les descriptions lisibles et les commandes à la taille établie.
- **Do** garder l’aperçu et le formulaire équilibrés, avec les résultats sur toute la largeur.
- **Do** préserver la navigation mobile fixe et son espace de sécurité.
- **Do** associer états et couleurs à des libellés, avec focus visible et réduction du mouvement.
- **Do** conserver Manrope pour le travail et Space Grotesk pour les deux usages d’identité constatés.

### Don't:

- **Don't** réintroduire slogans, établissement, licence ou auteur dans les écrans.
- **Don't** revenir aux titres poétiques ou au texte courant à (12px).
- **Don't** présenter une image d’exemple comme une analyse ni une indisponibilité comme un résultat.
- **Don't** confondre confiance, gravité et nombre de dommages uniques dans une vidéo.
