import { Router } from 'express';
import { validarToken } from '../middleware/auth.middleware.js';
import { botController } from '../controllers/bot.controller.js';

const router = Router();

/**
 * POST /api/bot/message
 * Enviar mensagem (requer autenticação)
 */
router.post('/message', validarToken, (req, res) =>
  botController.processarMensagem(req, res)
);

export default router;