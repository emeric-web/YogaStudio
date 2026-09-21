/**
 * Prépare le schéma de la base E2E puis lance la vraie API Express.
 * Utilisé par start-server-and-test, qui attend ensuite la route /api/health
 * avant de poursuivre le démarrage de la suite.
 */
const { spawnSync, spawn } = require('node:child_process');
const path = require('node:path');
const env = require('./e2e-env.cjs');
// Résoudre depuis ce fichier permet de retrouver le backend quel que soit le cwd.
const cwd = path.resolve(__dirname, '../../backend');
// Sur cette base éphémère, db push applique directement le schéma Prisma.
// Le client doit déjà être généré à l'installation (--skip-generate).
// process.execPath réutilise Node ; stdio: 'inherit' affiche les logs dans le terminal.
const schema = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate'], { cwd, env, stdio: 'inherit' });
// Ne pas lancer l'API si la préparation du schéma a échoué.
if (schema.status !== 0) process.exit(schema.status || 1);
// ts-node exécute les sources TypeScript sans nécessiter un build backend préalable.
const server = spawn(process.execPath, ['-r', 'ts-node/register', 'src/app.ts'], { cwd, env, stdio: 'inherit' });
// Transmettre l'arrêt au processus enfant lorsque l'orchestrateur termine la suite.
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
// Terminer également le lanceur lorsque le backend s'arrête.
server.on('exit', (code) => process.exit(code || 0));
