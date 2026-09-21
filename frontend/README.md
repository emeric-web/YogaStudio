# Yoga Studio — Frontend

Application React permettant de consulter les séances de yoga, de gérer les inscriptions et d’administrer les séances.

## Technologies

- React 19 et TypeScript
- Vite 7 et Tailwind CSS 4
- React Router 6 pour la navigation
- Axios pour les appels HTTP
- Vitest 5, React Testing Library et jsdom pour les tests
- Couverture de code avec V8

## Prérequis

- Node.js 24, ou Node.js 22 à partir de la version 22.13, compatibles avec les dépendances actuelles.
- npm.
- Pour utiliser l’application : le backend et sa base de données configurés selon le [README principal](../README.md).

Les tests frontend simulent les appels aux services ou à l’API : ils ne nécessitent ni backend démarré ni base de données.

## Installation et lancement

Depuis la racine du dépôt :

```bash
cd frontend
npm ci
npm run dev
```

L’application est accessible sur [http://localhost:3000](http://localhost:3000). Si ce port est occupé, consulter l’adresse indiquée par Vite dans le terminal.

## Commandes

Les commandes suivantes s’exécutent depuis `frontend/`.

| Commande | Description |
| --- | --- |
| `npm run dev` | Démarre le serveur de développement |
| `npm run build` | Vérifie les types TypeScript et génère l’application dans `dist/` |
| `npm run preview` | Sert localement le build généré ; lancer `build` au préalable |
| `npm test` | Lance les tests en mode surveillance dans un terminal local |
| `npm run test:run` | Exécute tous les tests une fois |
| `npm run test:coverage` | Exécute les tests et génère les rapports de couverture |

Pour un déploiement, l’hébergement doit servir le dossier `dist/`, transmettre `/api` au backend et renvoyer `index.html` pour les routes frontend comme `/profile`. Le proxy de développement Vite ne configure pas le serveur de production.

## Fonctionnalités et routes

- Inscription, connexion et déconnexion.
- Consultation des séances, de leurs détails et de leurs participants.
- Participation et désinscription à une séance pour les utilisateurs classiques.
- Création, modification et suppression des séances pour les administrateurs.
- Consultation du profil et suppression du compte.
- En développement, promotion d’un utilisateur en administrateur depuis son profil.

| Route | Accès | Page |
| --- | --- | --- |
| `/` | Redirection vers `/sessions` | — |
| `/login` | Public | Connexion |
| `/register` | Public | Inscription |
| `/sessions` | Utilisateur connecté | Liste des séances |
| `/sessions/:id` | Utilisateur connecté | Détail d’une séance |
| `/sessions/create` | Administrateur | Création d’une séance |
| `/sessions/edit/:id` | Administrateur | Modification d’une séance |
| `/profile` | Utilisateur connecté | Profil |

`PrivateRoute` redirige les utilisateurs non connectés vers `/login`. `SessionForm` redirige les utilisateurs non administrateurs vers `/sessions`.

Le token JWT et les informations de l’utilisateur sont conservés dans `localStorage`. La déconnexion supprime ces données. Les contrôles d’accès du frontend complètent ceux du backend.

## Organisation du code

```text
src/
├── components/       # Barre de navigation et ses tests
├── pages/            # Pages et leurs tests
├── routes/           # Protection des routes et ses tests
├── services/         # Client API, authentification et tests du service
├── types/            # Interfaces TypeScript partagées
├── App.tsx           # Assemblage des pages et configuration du routeur
├── App.integration.test.tsx
├── setupTests.ts     # Préparation commune aux tests
├── index.css         # Styles globaux
└── main.tsx          # Point d’entrée React
```

## Tests frontend

Les tests sont placés à côté des fichiers concernés :

- `*.unit.test.ts` et `*.unit.test.tsx` : tests unitaires, notamment du service d’authentification et de l’affichage des composants.
- `*.integration.test.tsx` : tests d’intégration frontend, notamment des interactions et de la navigation entre composants.

Les deux catégories utilisent Vitest et un DOM simulé avec jsdom. Les appels API ou les méthodes du service d’authentification sont simulés selon le scénario. Ces tests ne vérifient pas la persistance réelle en base de données et ne constituent pas des parcours E2E dans un navigateur.

La suite couvre notamment :

- La gestion de la session et du stockage local.
- L’affichage des liens selon l’authentification et le rôle.
- Les routes protégées et les redirections.
- La connexion et l’inscription, leurs chargements et leurs erreurs.
- Les séances : affichage, création, modification, suppression et participation.
- Le profil, la suppression du compte et la promotion administrateur en développement.

### Exécuter les tests

```bash
# Toute la suite
npm run test:run

# Un fichier
npm run test:run -- src/services/auth.service.unit.test.ts

# Uniquement les fichiers dont le nom contient « unit.test »
npm run test:run -- unit.test

# Uniquement les fichiers dont le nom contient « integration.test »
npm run test:run -- integration.test

# Les tests dont le titre contient « connexion »
npm run test:run -- -t 'connexion'
```

### Préparation et isolation

La configuration des tests se trouve dans [vite.config.ts](./vite.config.ts).

Le fichier [src/setupTests.ts](./src/setupTests.ts) nettoie les composants rendus, `localStorage` et `sessionStorage` après chaque test. La configuration efface l’historique des mocks et restaure les méthodes remplacées par des espions entre les tests.

Les tests importent explicitement `describe`, `it`, `expect` et `vi` depuis `vitest`. Les assertions supplémentaires de `@testing-library/jest-dom`, comme `toBeInTheDocument()`, ne sont pas configurées.

## Couverture et rapport de tests

Générer les rapports :

```bash
npm run test:coverage
```

| Rapport | Emplacement / utilisation |
| --- | --- |
| Texte | Résumé global et par fichier dans le terminal |
| HTML | Ouvrir `coverage/index.html` dans un navigateur pour explorer les fichiers et le code non couvert |
| LCOV | `coverage/lcov.info`, exploitable par les outils de suivi de qualité |

Le dossier `coverage/` est généré et ignoré par Git.

### Indicateurs

L’objectif du plan de test est d’atteindre au moins **80 % pour chacun des quatre indicateurs**.

| Indicateur | Signification |
| --- | --- |
| Instructions — Statements | Proportion des instructions exécutées pendant les tests |
| Branches | Proportion des alternatives exécutées dans les conditions |
| Fonctions | Proportion des fonctions appelées |
| Lignes | Proportion des lignes exécutables parcourues |

La configuration inclut les fichiers `src/**/*.ts` et `src/**/*.tsx`, y compris les fichiers applicatifs non testés. Elle exclut les fichiers de tests, les déclarations `*.d.ts`, `src/types/` et `src/main.tsx`.

Les seuils de 80 % ne sont pas encore imposés automatiquement dans Vitest : consulter les résultats après chaque exécution. La couverture globale agrège les tests unitaires et d’intégration lancés par la commande.

Pour rédiger un bilan, relever :

- La date et le commit évalué.
- Le nombre de tests réussis et échoués.
- Les quatre pourcentages du rapport et leur comparaison à l’objectif.
- Le périmètre et les exclusions de couverture.
- Les scénarios restant à vérifier.

Les chiffres ne sont pas figés dans ce README : relancer la commande pour obtenir les résultats correspondant au code courant. Une couverture élevée ne garantit pas que tous les comportements ont été vérifiés. Les parcours avec un backend réel et la validation des champs obligatoires dans le navigateur doivent être évalués séparément.
