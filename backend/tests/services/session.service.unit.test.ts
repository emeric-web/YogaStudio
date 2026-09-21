import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionRepository } from '../../src/repositories/session.repository';
import { SessionService } from '../../src/services/session.service';
import { publicSession, session, teacher, user } from '../fixtures';

describe('SessionService', () => {
  const repository = {
    findAll: vi.fn<SessionRepository['findAll']>(),
    findById: vi.fn<SessionRepository['findById']>(),
    findByIdWithDetails: vi.fn<SessionRepository['findByIdWithDetails']>(),
    findUserById: vi.fn<SessionRepository['findUserById']>(),
    findTeacherById: vi.fn<SessionRepository['findTeacherById']>(),
    create: vi.fn<SessionRepository['create']>(),
    update: vi.fn<SessionRepository['update']>(),
    delete: vi.fn<SessionRepository['delete']>(),
    findParticipation: vi.fn<SessionRepository['findParticipation']>(),
    createParticipation: vi.fn<SessionRepository['createParticipation']>(),
    deleteParticipation: vi.fn<SessionRepository['deleteParticipation']>(),
  };
  const service = new SessionService(repository as unknown as SessionRepository);
  const data = {
    name: 'Yoga du matin', date: '2026-10-01', description: 'Une séance douce', teacherId: 3,
  };
  const participation = { sessionId: 12, userId: 7 };

  beforeEach(() => {
    vi.resetAllMocks();
    repository.findAll.mockResolvedValue([session]);
    repository.findById.mockResolvedValue(session);
    repository.findByIdWithDetails.mockResolvedValue(session);
    repository.findUserById.mockResolvedValue({ ...user, admin: true });
    repository.findTeacherById.mockResolvedValue(teacher);
    repository.create.mockResolvedValue({ ...session, participants: [] });
    repository.update.mockResolvedValue(session);
    repository.delete.mockResolvedValue(session);
    repository.findParticipation.mockResolvedValue(null);
    repository.createParticipation.mockResolvedValue(participation);
    repository.deleteParticipation.mockResolvedValue(participation);
  });

  describe('lecture', () => {
    it('transforme chaque séance et expose uniquement les identifiants des participants', async () => {
      repository.findAll.mockResolvedValue([
        { ...session, participants: [...session.participants, { sessionId: 12, userId: 8, user: { ...user, id: 8 } }] },
        { ...session, id: 13, participants: [] },
      ]);
      await expect(service.getAll()).resolves.toEqual([
        { ...publicSession, users: [7, 8] }, { ...publicSession, id: 13, users: [] },
      ]);
      expect(repository.findAll).toHaveBeenCalledExactlyOnceWith();
    });

    it('retourne une liste vide sans séance', async () => {
      repository.findAll.mockResolvedValue([]);
      await expect(service.getAll()).resolves.toEqual([]);
    });

    it('transmet la recherche simple au repository', async () => {
      await expect(service.getById(12)).resolves.toEqual(session);
      expect(repository.findById).toHaveBeenCalledExactlyOnceWith(12);
    });

    it('retourne null pour une recherche simple sans résultat', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.getById(99)).resolves.toBeNull();
    });

    it('retourne les détails publics de la séance', async () => {
      await expect(service.getByIdWithDetails(12)).resolves.toEqual(publicSession);
      expect(repository.findByIdWithDetails).toHaveBeenCalledExactlyOnceWith(12);
    });

    it('retourne les détails avec une liste vide de participants', async () => {
      repository.findByIdWithDetails.mockResolvedValue({ ...session, participants: [] });
      await expect(service.getByIdWithDetails(12)).resolves.toEqual({ ...publicSession, users: [] });
    });

    it('retourne null pour une séance détaillée absente', async () => {
      repository.findByIdWithDetails.mockResolvedValue(null);
      await expect(service.getByIdWithDetails(99)).resolves.toBeNull();
    });

    it('recherche un utilisateur par identifiant', async () => {
      repository.findUserById.mockResolvedValue(user);
      await expect(service.getUserById(7)).resolves.toEqual(user);
      expect(repository.findUserById).toHaveBeenCalledExactlyOnceWith(7);
    });

    it('transmet un identifiant utilisateur absent au repository', async () => {
      repository.findUserById.mockResolvedValue(null);
      await expect(service.getUserById()).resolves.toBeNull();
      expect(repository.findUserById).toHaveBeenCalledExactlyOnceWith(undefined);
    });

    it('recherche un enseignant par identifiant', async () => {
      await expect(service.getTeacherById(3)).resolves.toEqual(teacher);
      expect(repository.findTeacherById).toHaveBeenCalledExactlyOnceWith(3);
    });

    it('retourne null pour un enseignant absent', async () => {
      repository.findTeacherById.mockResolvedValue(null);
      await expect(service.getTeacherById(99)).resolves.toBeNull();
    });

    it('propage une erreur de chargement des séances', async () => {
      const error = new Error('Lecture impossible');
      repository.findAll.mockRejectedValue(error);
      await expect(service.getAll()).rejects.toBe(error);
    });

    it('propage une erreur de chargement des détails', async () => {
      const error = new Error('Lecture impossible');
      repository.findByIdWithDetails.mockRejectedValue(error);
      await expect(service.getByIdWithDetails(12)).rejects.toBe(error);
    });
  });

  describe('autorisations des écritures administrateur', () => {
    const operations = [
      { name: 'create', run: (id?: number) => service.create(data, id) },
      { name: 'update', run: (id?: number) => service.update(12, data, id) },
      { name: 'delete', run: (id?: number) => service.delete(12, id) },
    ];

    describe.each(operations)('$name', ({ run }) => {
      it.each([
        { label: 'utilisateur absent', found: null, id: 7 },
        { label: 'non administrateur', found: user, id: 7 },
        { label: 'identifiant absent', found: null, id: undefined },
      ])('refuse une opération : $label', async ({ found, id }) => {
        repository.findUserById.mockResolvedValue(found);
        await expect(run(id)).resolves.toEqual({ status: 'forbidden' });
        expect(repository.findUserById).toHaveBeenCalledExactlyOnceWith(id);
        expect(repository.findById).not.toHaveBeenCalled();
        expect(repository.findTeacherById).not.toHaveBeenCalled();
        expect(repository.create).not.toHaveBeenCalled();
        expect(repository.update).not.toHaveBeenCalled();
        expect(repository.delete).not.toHaveBeenCalled();
      });
    });
  });

  describe('create', () => {
    it('refuse la création avec un enseignant absent', async () => {
      repository.findTeacherById.mockResolvedValue(null);
      await expect(service.create(data, 7)).resolves.toEqual({ status: 'teacherNotFound' });
      expect(repository.findTeacherById).toHaveBeenCalledExactlyOnceWith(3);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('crée une séance avec une date convertie et aucun participant', async () => {
      await expect(service.create(data, 7)).resolves.toEqual({
        status: 'created', session: { ...publicSession, users: [] },
      });
      expect(repository.findUserById).toHaveBeenCalledExactlyOnceWith(7);
      expect(repository.findTeacherById).toHaveBeenCalledExactlyOnceWith(3);
      expect(repository.create).toHaveBeenCalledExactlyOnceWith({ ...data, date: new Date('2026-10-01') });
    });

    it('propage un échec de création', async () => {
      const error = new Error('Création impossible');
      repository.create.mockRejectedValue(error);
      await expect(service.create(data, 7)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('signale une séance absente sans lancer de modification', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(12, data, 7)).resolves.toEqual({ status: 'sessionNotFound' });
      expect(repository.findById).toHaveBeenCalledExactlyOnceWith(12);
      expect(repository.findTeacherById).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('refuse un nouvel enseignant absent', async () => {
      repository.findTeacherById.mockResolvedValue(null);
      await expect(service.update(12, { teacherId: 99 }, 7)).resolves.toEqual({ status: 'teacherNotFound' });
      expect(repository.findTeacherById).toHaveBeenCalledExactlyOnceWith(99);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('modifie tous les champs et retourne la séance actualisée', async () => {
      const changes = { name: 'Yoga du soir', date: '2026-11-01', description: 'Relaxation', teacherId: 4 };
      const changedTeacher = { ...teacher, id: 4, firstName: 'Paul' };
      repository.findTeacherById.mockResolvedValue(changedTeacher);
      repository.update.mockResolvedValue({ ...session, ...changes, date: new Date(changes.date), teacher: changedTeacher });
      await expect(service.update(12, changes, 7)).resolves.toEqual({
        ...publicSession, name: 'Yoga du soir', date: new Date('2026-11-01'), description: 'Relaxation',
        teacher: { id: 4, firstName: 'Paul', lastName: 'Durand' },
      });
      expect(repository.findTeacherById).toHaveBeenCalledExactlyOnceWith(4);
      expect(repository.update).toHaveBeenCalledExactlyOnceWith(12, { ...changes, date: new Date(changes.date) });
    });

    it('transmet uniquement le champ fourni pour une modification partielle', async () => {
      repository.update.mockResolvedValue({ ...session, name: 'Nouveau nom' });
      await expect(service.update(12, { name: 'Nouveau nom' }, 7)).resolves.toEqual({ ...publicSession, name: 'Nouveau nom' });
      expect(repository.update).toHaveBeenCalledExactlyOnceWith(12, { name: 'Nouveau nom' });
      expect(repository.findTeacherById).not.toHaveBeenCalled();
    });

    it('transmet une modification vide sans ajouter de champs', async () => {
      await expect(service.update(12, {}, 7)).resolves.toEqual(publicSession);
      expect(repository.update).toHaveBeenCalledExactlyOnceWith(12, {});
      expect(repository.findTeacherById).not.toHaveBeenCalled();
    });

    it('propage un échec de modification', async () => {
      const error = new Error('Modification impossible');
      repository.update.mockRejectedValue(error);
      await expect(service.update(12, data, 7)).rejects.toBe(error);
    });
  });

  describe('delete', () => {
    it('signale une séance absente sans supprimer', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete(12, 7)).resolves.toEqual({ status: 'sessionNotFound' });
      expect(repository.findById).toHaveBeenCalledExactlyOnceWith(12);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('supprime une séance pour un administrateur', async () => {
      await expect(service.delete(12, 7)).resolves.toEqual({ status: 'deleted' });
      expect(repository.findUserById).toHaveBeenCalledExactlyOnceWith(7);
      expect(repository.findById).toHaveBeenCalledExactlyOnceWith(12);
      expect(repository.delete).toHaveBeenCalledExactlyOnceWith(12);
    });

    it('propage un échec de suppression', async () => {
      const error = new Error('Suppression impossible');
      repository.delete.mockRejectedValue(error);
      await expect(service.delete(12, 7)).rejects.toBe(error);
    });
  });

  describe('participate', () => {
    beforeEach(() => {
      repository.findUserById.mockResolvedValue(user);
    });

    it('refuse une séance absente', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.participate(12, 7)).resolves.toEqual({ status: 'sessionNotFound' });
      expect(repository.findUserById).not.toHaveBeenCalled();
      expect(repository.findParticipation).not.toHaveBeenCalled();
      expect(repository.createParticipation).not.toHaveBeenCalled();
    });

    it('refuse un utilisateur absent', async () => {
      repository.findUserById.mockResolvedValue(null);
      await expect(service.participate(12, 7)).resolves.toEqual({ status: 'userNotFound' });
      expect(repository.findParticipation).not.toHaveBeenCalled();
      expect(repository.createParticipation).not.toHaveBeenCalled();
    });

    it('refuse une participation en double', async () => {
      repository.findParticipation.mockResolvedValue(participation);
      await expect(service.participate(12, 7)).resolves.toEqual({ status: 'alreadyParticipating' });
      expect(repository.findParticipation).toHaveBeenCalledExactlyOnceWith(12, 7);
      expect(repository.createParticipation).not.toHaveBeenCalled();
    });

    it('inscrit un utilisateur à la séance', async () => {
      await expect(service.participate(12, 7)).resolves.toEqual({ status: 'sessionJoined' });
      expect(repository.findById).toHaveBeenCalledExactlyOnceWith(12);
      expect(repository.findUserById).toHaveBeenCalledExactlyOnceWith(7);
      expect(repository.findParticipation).toHaveBeenCalledExactlyOnceWith(12, 7);
      expect(repository.createParticipation).toHaveBeenCalledExactlyOnceWith(12, 7);
    });

    it('propage un échec de création de participation', async () => {
      const error = new Error('Inscription impossible');
      repository.createParticipation.mockRejectedValue(error);
      await expect(service.participate(12, 7)).rejects.toBe(error);
    });
  });

  describe('unparticipate', () => {
    it('signale une participation absente sans supprimer', async () => {
      await expect(service.unparticipate(12, 7)).resolves.toEqual({ status: 'participationNotFound' });
      expect(repository.findParticipation).toHaveBeenCalledExactlyOnceWith(12, 7);
      expect(repository.deleteParticipation).not.toHaveBeenCalled();
    });

    it('supprime une participation existante', async () => {
      repository.findParticipation.mockResolvedValue(participation);
      await expect(service.unparticipate(12, 7)).resolves.toEqual({ status: 'sessionLeft' });
      expect(repository.deleteParticipation).toHaveBeenCalledExactlyOnceWith(12, 7);
    });

    it('propage un échec de désinscription', async () => {
      repository.findParticipation.mockResolvedValue(participation);
      const error = new Error('Désinscription impossible');
      repository.deleteParticipation.mockRejectedValue(error);
      await expect(service.unparticipate(12, 7)).rejects.toBe(error);
    });
  });
});
