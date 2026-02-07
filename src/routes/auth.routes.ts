import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';

const router = Router();

/**
 * POST /api/auth/login
 * Login do usuário
 */
router.post('/login', (req, res) => authController.login(req, res));

/**
 * GET /api/auth/validate
 * Validar token JWT
 */
router.get('/validate', (req, res) => authController.validarToken(req, res));

export default router;
