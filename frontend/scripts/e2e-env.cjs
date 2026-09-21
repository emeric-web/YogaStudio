/**
 * Environnement commun au backend E2E et au script de préparation des données.
 * Les valeurs imposées après process.env ciblent le conteneur défini dans
 * docker-compose.e2e.yml, indépendamment de la base de développement.
 */
module.exports = {
  ...process.env,
  // Cette base est vidée avant chaque test : conserver une connexion dédiée.
  DATABASE_URL: 'postgresql://yoga_e2e:yoga_e2e@127.0.0.1:5434/yogastudio_e2e',
  // Secret local utilisé uniquement pour les tokens des comptes de test.
  JWT_SECRET: 'local-e2e-only-secret',
  PORT: '8082',
  // Permet de tester aussi la promotion administrateur proposée en développement.
  NODE_ENV: 'development',
};
