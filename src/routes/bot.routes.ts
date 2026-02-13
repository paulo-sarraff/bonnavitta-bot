import { Router } from 'express';
import { Request, Response } from 'express';
import { botController } from '../controllers/bot.controller.js';

const router = Router();

/**
 * POST /api/bot/message
 * Enviar mensagem (requer autenticação)
 */

router.post('/message', (req: Request, res: Response) => {
  return botController.message(req as any, res);
});


export default router;