# Bilan des tests — 21 septembre 2026

Résultats sur l’arbre de travail après ajout des tests E2E, avant commit.

- **Vitest : 94 tests réussis**, 12 fichiers, aucun échec.
- **Cypress : 31 tests réussis**, 3 fichiers, aucun échec ni test ignoré.
- **Build frontend : réussi**, sans instrumentation de couverture dans les assets produits.
- Environnement : Node.js 24.14.1, Cypress 16.1.0, Electron 146, PostgreSQL 16.

| Suite | Instructions | Branches | Fonctions | Lignes |
| --- | ---: | ---: | ---: | ---: |
| Frontend — Vitest | 99.31 % | 92.12 % | 100 % | 99.29 % |
| E2E — Cypress | 95.75 % | 86.59 % | 100 % | 95.46 % |

Les quatre indicateurs **globaux de chaque suite** dépassent 80 %. Les seuils sont contrôlés automatiquement et les couvertures ne sont pas fusionnées.

## Rapports générés

- [Couverture frontend HTML](coverage/frontend/index.html)
- [Couverture E2E HTML](coverage/e2e/index.html)
- Résumés JSON : `coverage/{frontend,e2e}/coverage-summary.json`
- Résultats Cypress JUnit : `reports/e2e/results-*.xml`
- LCOV : `coverage/{frontend,e2e}/lcov.info`

Ces fichiers sont générés localement et ignorés par Git. Relancer les commandes après toute modification ; ce bilan est un instantané.

## Périmètre

Tous les écrans sont exercés : inscription, connexion, liste des séances, détail, création, modification et profil, ainsi que la navigation, les rôles et la déconnexion. Les parcours principaux utilisent la vraie API et une base dédiée réinitialisée avant chaque test. Les erreurs HTTP sont simulées dans des groupes de tests identifiés.

La couverture E2E mesure le code **frontend exécuté dans le navigateur**, pas le code backend. Les branches défensives restantes (par exemple, un utilisateur absent dans une page protégée) ne sont pas toutes accessibles par un parcours utilisateur normal. Le détail des exclusions figure dans le [README](README.md#rapports-et-seuils-e2e).

## Reproduire

Après installation des dépendances front/back et démarrage de Docker, depuis `frontend/` :

```bash
npm run test:coverage
npm run test:e2e
npm run build
npm run e2e:db:down
```
