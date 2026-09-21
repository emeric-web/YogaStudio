/**
 * Nettoie les résultats E2E avant une exécution complète.
 * Évite de conserver de la couverture ou des rapports JUnit d'une ancienne suite.
 * Les rapports Vitest, situés dans coverage/frontend, sont conservés.
 */
const { rmSync } = require('node:fs');
const { resolve } = require('node:path');
// Liste volontairement limitée aux dossiers générés par les tests E2E.
for (const directory of ['.nyc_output', 'coverage/e2e', 'reports/e2e']) {
  // Le chemin part du dossier frontend ; force autorise une première exécution
  // où aucun de ces dossiers n'existe encore.
  rmSync(resolve(__dirname, '..', directory), { recursive: true, force: true });
}
