# @data-fair/app-documents

Application de gestion de documents (GED) pour [DataFair](https://github.com/data-fair/data-fair) : arborescence de dossiers et de fichiers stockés comme pièces jointes d'un jeu de données, dépôt par glisser-déposer, renommage, versionnement et historique des révisions.

## Stack

Vue 3.5 (Composition API, `<script setup lang="ts">`), Vuetify 4, Vite 8, TypeScript strict, `@data-fair/lib-vuetify` 2.x / `lib-vue` / `lib-utils`, Playwright (tests unitaires et e2e), ESLint 9 + husky + commitlint.

## Démarrage

```sh
npm install
npm run dev
```

`npm run dev` génère au premier lancement un `.env` git-ignoré (ports `APP_PORT`, `DEV_SERVER_PORT`, `E2E_PORT`) puis ouvre une session Zellij avec :
- `vite` (application, port `APP_PORT`)
- `df-dev-server` (proxy de développement, port `DEV_SERVER_PORT`)

La configuration de développement courante vit dans `.dev-config.json` (git-ignoré) : l'UI du dev-server permet de copier la configuration d'une application réelle plutôt que de l'écrire à la main.

## Scripts

| Script | Rôle |
|---|---|
| `npm run dev` | environnement de dev complet (df-dev-env + zellij) |
| `npm run dev-app` | serveur Vite seul |
| `npm run build` | build de production (`dist/`) |
| `npm run lint` / `lint-fix` | ESLint |
| `npm run type-check` | vue-tsc |
| `npm run build-types` | génère les types TS depuis `public/config-schema.json` (à relancer après toute modification du schéma) |
| `npm run test` / `test-unit` / `test-e2e` | Playwright |
| `npm run quality` | lint + build-types + type-check + build + tests + audit (exécuté au `pre-push`) |

## Schéma de configuration

`public/config-schema.json` est la source unique (vocabulaire VJSF 3) : il est servi tel quel à DataFair et ré-exporté par `src/config/schema.ts` pour générer les types (`src/config/.type/`, git-ignoré, ré-exportés par `src/config/index.ts`). Le sélecteur de jeu de données déclare le prérequis « pièces jointes » (`short-concept=attachment`) dans l'URL du sélecteur.

## Tests

```sh
npm run test-unit   # fonctions pures, sans serveur
npm run test-e2e    # contre le serveur Vite, API data-fair entièrement mockée
```

Les e2e (`tests/e2e/`) injectent `window.APPLICATION` et mockent l'API (lignes, `_bulk_lines`, révisions, pièces jointes) ainsi que le WebSocket : aucune instance data-fair réelle n'est nécessaire.

## Hooks git

- `pre-commit` : lint
- `commit-msg` : commitlint (messages conventionnels)
- `pre-push` : `npm run quality`
