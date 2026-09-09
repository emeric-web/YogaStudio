import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { SessionController } from '../controllers/session.controller';
import { TeacherController } from '../controllers/teacher.controller';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { prisma } from '../database/prisma';
import { TeacherRepository } from '../repositories/teacher.repository';
import { TeacherService } from '../services/teacher.service';
import { UserRepository } from '../repositories/user.repository';
import { UserService } from '../services/user.service';
import { AuthRepository } from '../repositories/auth.repository';
import { AuthService } from '../services/auth.service';
import { SessionRepository } from '../repositories/session.repository';
import { SessionService } from '../services/session.service';

const router = Router();

// Controllers
const teacherRepository = new TeacherRepository(prisma);
const teacherService = new TeacherService(teacherRepository);
const teacherController = new TeacherController(teacherService);
const userRepository = new UserRepository(prisma);
const userService = new UserService(userRepository);
const userController = new UserController(userService);
const authRepository = new AuthRepository(prisma);
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);
const sessionRepository = new SessionRepository(prisma);
const sessionService = new SessionService(sessionRepository);
const sessionController = new SessionController(sessionService);

// Auth routes (public)
router.post('/api/auth/login', (req, res) => authController.login(req, res));
router.post('/api/auth/register', (req, res) => authController.register(req, res));

// Session routes (protected)
router.get('/api/session', authMiddleware, (req, res) => sessionController.getAll(req, res));
router.get('/api/session/:id', authMiddleware, (req, res) => sessionController.getById(req, res));
router.post('/api/session', authMiddleware, (req, res) => sessionController.create(req, res));
router.put('/api/session/:id', authMiddleware, (req, res) => sessionController.update(req, res));
router.delete('/api/session/:id', authMiddleware, (req, res) => sessionController.delete(req, res));
router.post('/api/session/:id/participate/:userId', authMiddleware, (req, res) => sessionController.participate(req, res));
router.delete('/api/session/:id/participate/:userId', authMiddleware, (req, res) => sessionController.unparticipate(req, res));

// Teacher routes (protected)
router.get('/api/teacher', authMiddleware, (req, res) => teacherController.getAll(req, res));
router.get('/api/teacher/:id', authMiddleware, (req, res) => teacherController.getById(req, res));

// User routes (protected)
router.get('/api/user/:id', authMiddleware, (req, res) => userController.getById(req, res));
router.post('/api/user/promote-admin', authMiddleware, (req, res) =>
  userController.promoteSelfToAdmin(req, res),
);
router.delete('/api/user/:id', authMiddleware, (req, res) => userController.delete(req, res));

export default router;
