/**
 * Prépare les données E2E côté Node, via la tâche Cypress « db:reset ».
 * Le client Prisma et bcrypt proviennent du backend pour utiliser son schéma
 * généré et le même mécanisme de hachage que l'authentification réelle.
 */
const { PrismaClient } = require('../../backend/node_modules/@prisma/client');
const bcrypt = require('../../backend/node_modules/bcrypt');
const env = require('./e2e-env.cjs');
// La connexion explicite évite de récupérer celle du fichier .env du backend.
const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });

/**
 * Vide la base dédiée puis recrée un jeu de données identique pour chaque test.
 * La transaction annule l'ensemble des changements si une opération échoue.
 */
async function resetDatabase() {
  // Calculé avant la transaction pour ne pas prolonger celle-ci avec le hachage.
  const password = await bcrypt.hash('test!1234', 10);
  await prisma.$transaction(async (db) => {
    // Supprimer les relations avant les entités pour respecter les clés étrangères.
    await db.sessionParticipation.deleteMany();
    await db.session.deleteMany();
    await db.teacher.deleteMany();
    await db.user.deleteMany();
    // Les identifiants fixes rendent les routes et les assertions prévisibles.
    await db.user.createMany({ data: [
      { id: 1, email: 'admin@e2e.test', firstName: 'Ada', lastName: 'Admin', password, admin: true },
      { id: 2, email: 'user@e2e.test', firstName: 'Emma', lastName: 'User', password, admin: false },
    ] });
    await db.teacher.createMany({ data: [
      { id: 1, firstName: 'Sarah', lastName: 'Teacher' },
      { id: 2, firstName: 'Marc', lastName: 'Teacher' },
    ] });
    await db.session.create({ data: {
      id: 1, name: 'Morning Yoga', date: new Date('2027-03-15'),
      description: 'A gentle session for everyone.', teacherId: 1,
    } });
    // Les insertions avec un ID explicite n'avancent pas les séquences PostgreSQL.
    // Les prochains comptes ou séances créés via l'API doivent avoir un ID libre.
    // Ces requêtes SQL sont constantes et ne contiennent aucune saisie utilisateur.
    await db.$executeRawUnsafe("ALTER SEQUENCE users_id_seq RESTART WITH 10");
    await db.$executeRawUnsafe("ALTER SEQUENCE teachers_id_seq RESTART WITH 10");
    await db.$executeRawUnsafe("ALTER SEQUENCE sessions_id_seq RESTART WITH 10");
  });
  // Une tâche Cypress doit retourner une valeur sérialisable ; undefined est refusé.
  return null;
}
// Cypress appelle disconnect à la fin de l'exécution pour libérer les connexions.
module.exports = { resetDatabase, disconnect: () => prisma.$disconnect() };
