const { defineConfig } = require('cypress');
const { resetDatabase, disconnect } = require('./scripts/e2e-db.cjs');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://127.0.0.1:3001',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      require('@cypress/code-coverage/task')(on, config);
      on('task', { 'db:reset': resetDatabase });
      on('after:run', disconnect);
      return config;
    },
  },
  video: false,
  screenshotOnRunFailure: true,
  viewportWidth: 1280,
  viewportHeight: 900,
  reporter: 'junit',
  reporterOptions: { mochaFile: 'reports/e2e/results-[hash].xml', toConsole: false },
});
