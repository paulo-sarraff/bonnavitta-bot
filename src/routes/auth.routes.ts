import { Router } from 'express';
import { Request, Response } from 'express';
import { authController } from '../controllers/auth.controller.js';

const router = Router();

/**
 * POST /api/auth/login
 * Login do usuário
 */
router.post('/login', (req: Request, res: Response) => authController.login(req, res));

/**
 * GET /api/auth/validate
 * Validar token JWT
 */
router.get('/validate', (req: Request, res: Response) => authController.validarToken(req, res));

export default router;
