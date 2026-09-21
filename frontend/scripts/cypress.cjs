/**
 * Lance la CLI Cypress locale avec les arguments reçus (run, open, etc.).
 * Ce wrapper corrige un conflit d'environnement rencontré depuis un terminal
 * basé sur Electron, sans modifier l'environnement du processus parent.
 */
const { spawnSync } = require('node:child_process');
const env = { ...process.env };
// Cette variable force Electron à se comporter comme Node et empêche le navigateur
// Cypress de démarrer. Elle est retirée uniquement de l'environnement enfant.
delete env.ELECTRON_RUN_AS_NODE;
// Retrouver la CLI via le package installé évite de dépendre d'un Cypress global.
// Réutiliser Node et transmettre les arguments et les logs au processus enfant.
const result = spawnSync(process.execPath, [require('node:path').join(require.resolve('cypress/package.json'), '..', 'bin', 'cypress'), ...process.argv.slice(2)], {
  env, stdio: 'inherit',
});
// Distinguer l'impossibilité de démarrer Cypress d'un échec de ses tests.
if (result.error) throw result.error;
// Propager le résultat à npm ; un arrêt par signal doit aussi produire un échec.
process.exit(result.status || (result.signal ? 1 : 0));
