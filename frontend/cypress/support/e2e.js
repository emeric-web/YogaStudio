/**
 * Préparation commune, chargée par Cypress avant chaque fichier de tests E2E.
 * Le support du plugin collecte la couverture du front instrumenté par Istanbul.
 */
import '@cypress/code-coverage/support';

// Cette tâche s'exécute côté Node : le navigateur n'accède pas directement à Prisma.
// Chaque test retrouve les mêmes données, indépendamment des scénarios précédents.
beforeEach(() => cy.task('db:reset'));

// Faire échouer explicitement le test si le front n'a pas été lancé avec la
// couverture activée, plutôt que de laisser passer un rapport vide.
afterEach(() => cy.window().its('__coverage__').should('be.an', 'object'));

/**
 * Connecte le membre de test, ou l'administrateur si admin vaut true.
 * L'appel utilise la vraie API pour obtenir un JWT valide. Ce raccourci prépare
 * les tests des séances et du profil ; les tests d'authentification, eux,
 * passent par les formulaires pour vérifier la saisie et la navigation.
 */
Cypress.Commands.add('login', (admin = false) => {
  cy.request('POST', '/api/auth/login', {
    email: admin ? 'admin@e2e.test' : 'user@e2e.test', password: 'test!1234',
  }).then(({ body }) => {
    cy.visit('/sessions', { onBeforeLoad(win) {
      // Installer la session avant le démarrage de React pour que PrivateRoute
      // reconnaisse immédiatement l'utilisateur, comme après une connexion normale.
      win.localStorage.setItem('token', body.token);
      win.localStorage.setItem('user', JSON.stringify(body));
    } });
  });
  // Attendre un état visible de la page au lieu d'une temporisation arbitraire.
  cy.contains('h1', 'Yoga Sessions').should('be.visible');
});
