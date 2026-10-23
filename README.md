<<<<<<< HEAD
# NANTES OPS — Terminal tactique (escape game géolocalisé)

React + TypeScript + Vite + TailwindCSS + Leaflet/OpenStreetMap, PWA installable.

## Démarrage

```bash
npm install
npm run dev          # http://localhost:5173
npm run dev:https    # HTTPS auto-signé : requis pour GPS / boussole / caméra sur smartphone
npm run build && npm run preview   # PWA complète (service worker actif en production)
```

> Sur mobile, la géolocalisation, la boussole iOS et la caméra exigent **HTTPS**. Utilisez `dev:https`
> (ouvrir l'URL « Network » affichée par Vite) ou un déploiement HTTPS.

## Publication sur GitHub Pages

Le workflow `.github/workflows/deploy.yml` construit le site et le publie automatiquement sur GitHub Pages à chaque push sur `main`. Il peut aussi être lancé manuellement depuis l'onglet **Actions**.

1. Poussez le projet sur GitHub, sur la branche `main`.
2. Dans le dépôt GitHub, ouvrez **Settings → Pages** et choisissez **GitHub Actions** comme source de déploiement.
3. Vérifiez l'exécution du workflow dans **Actions**. Une fois terminé, l'adresse du site apparaît dans le déploiement `github-pages` ou dans **Settings → Pages**. Pour un dépôt de projet, elle est généralement de la forme `https://<utilisateur>.github.io/<nom-du-depot>/`.

Le workflow configure le préfixe d'URL du dépôt pour Vite. Si vous souhaitez définir le mot de passe de l'administration, ajoutez un secret de dépôt nommé `VITE_ADMIN_PASSWORD` dans **Settings → Secrets and variables → Actions** avant le déploiement. La protection de l'administration reste côté navigateur et ne doit pas être considérée comme une sécurité pour des données sensibles.

## Fonctionnalités

- GPS haute précision en continu (`watchPosition`, `maximumAge` 3 s), HUD (signal, coordonnées, heure, cibles, batterie, boussole).
- Carte Leaflet plein écran, thème sombre, suivi automatique, marqueur futuriste, rayon de détection.
- POI invisibles tant que `distance > activationRadius` (Haversine, [calculateDistance.ts](src/utils/calculateDistance.ts)) ; à l'apparition : animation, vibration, son, bandeau « SIGNAL DETECTÉ ».
- Panneau « CIBLE IDENTIFIÉE », radar animé, mode AR caméra, journal des énigmes, progression, statistiques, notifications locales, détection entrée/sortie de zone.
- Audio persistant (drone synthétique intégré + pistes MP3/OGG/AAC/flux ajoutables par URL).
- Administration (bouton ADMIN ou `/#admin`) : CRUD des POI, import/export JSON, aperçu carte (toucher la carte pour placer un POI).
  Mot de passe par défaut : `nantes44` — à changer via `VITE_ADMIN_PASSWORD` (fichier `.env.local`). Protection côté client uniquement (MVP).
- **Mode simulation** (Journal → « MODE SIMULATION ») pour tester les POI sans être à Nantes.

## Architecture

- `src/services/poiService.ts` : interface `PoiRepository` asynchrone (implémentation localStorage) → remplaçable par une API REST.
- `src/hooks/usePoiTracking.ts` : visibilité, entrées/sorties de zone, découvertes, stats.
- `public/sw.js` + `public/manifest.json` : PWA, cache statique, tuiles OSM mises en cache, hors ligne.
- `scripts/generate-icons.py` : régénère les icônes PNG.

Les coordonnées des POI de démonstration sont approximatives ; ajustez-les via l'administration.
=======
# Escape-Nantes
Radar pour Escape Game Amateur à Nantes
>>>>>>> 88834bef57f3611a576cdfe791073ba35c3f397a
