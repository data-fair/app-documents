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

`public/config-schema.json` est la source unique (vocabulaire VJSF 3) : il est servi tel quel à DataFair et ré-exporté par `src/config/schema.ts` pour générer les types (`src/config/.type/`, git-ignoré, ré-exportés par `src/config/index.ts`). Le sélecteur de jeu de données (facultatif) filtre les jeux de données éditables exposant une pièce jointe (`rest=true&short-concept=attachment`).

## Jeu de données

Par défaut la GED crée et gère son propre jeu de données, **fragment de l'application** (`partOf`), ce qui réserve l'accès aux membres ayant des droits sur l'application. Supprimer l'application supprime ce jeu de données et ses documents. Le schéma est construit à partir des colonnes techniques (dont le champ pièce jointe `attachmentPath`, concept `attachment`) et des champs de métadonnées déclarés dans la configuration : au chargement, les colonnes de métadonnées manquantes sont ajoutées (jamais de suppression). Le champ `datasets` permet de sélectionner un jeu de données existant à la place, à condition qu'il soit éditable et porte les colonnes `path` et `nom` ; sans historique (`rest.history`), le bouton d'historique est masqué.

## Dossiers et versions

Chaque dossier est une ligne `type_mime: '_folder'`, conservée quand on y dépose des fichiers. Un dossier s'affiche par `path_eq` ; ses sous-dossiers déduits des chemins (données plus anciennes, sans ligne de dossier) viennent de l'agrégation `values/path?path_starts=`. Renommer ou supprimer un dossier passe par un seul `_bulk_lines` sur tous ses descendants. Remplacer un fichier est un `_action: 'patch'` (les métadonnées sont conservées) qui incrémente `nbrevisions` (0 à la création) ; l'historique affiche les versions du fichier, c'est-à-dire les révisions data-fair où la pièce jointe change. Un nom jamais personnalisé suit le nouveau fichier, et le téléchargement porte toujours le vrai nom du fichier.

## Recherche

Une barre de recherche interroge en plein-texte (nom + métadonnées textuelles, début de mots avec `q_mode=complete`) l'ensemble de l'arborescence via l'API `/lines`, y compris le texte extrait des fichiers (`_file.content`), et affiche les résultats avec leur dossier.

Les colonnes (nom, taille, révisions, date, métadonnées affichées dans le tableau) se trient côté data-fair (`sort`, gardé dans l'URL) ; les dossiers restent en tête, triés par nom.

## Tests

```sh
npm run test-unit   # fonctions pures, sans serveur
npm run test-e2e    # contre le serveur Vite, API data-fair entièrement mockée
```

Les e2e (`tests/e2e/`) injectent `window.APPLICATION` et simulent un jeu de données REST qui suit le comportement de data-fair (page de 12 par défaut, filtres `_eq` / `_starts`, `values`, `_bulk_lines`, fusion des `patch`, une révision par écriture) : aucune instance data-fair réelle n'est nécessaire. Une garde console fait échouer tout test qui produit une erreur ou un avertissement non attendu.

## Hooks git

- `pre-commit` : lint
- `commit-msg` : commitlint (messages conventionnels)
- `pre-push` : `npm run quality`
