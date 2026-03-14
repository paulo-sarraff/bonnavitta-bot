import { Router } from 'express';
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger.js';
import { botController } from '../controllers/bot.controller.js';

const router = Router();

/** POST /api/bot/message */
router.post('/message', (req: Request, res: Response) => {
  return botController.message(req as any, res);
});

/**
 * GET /api/bot/charts/:arquivo
 * Serve os PNGs gerados pelo ChartService e os apaga imediatamente após o envio.
 * A limpeza por TTL no app.ts é o fallback para arquivos nunca acessados.
 */
router.get('/charts/:arquivo', (req: Request, res: Response) => {
  const nome    = path.basename(req.params.arquivo); // impede path traversal
  const caminho = path.join(process.cwd(), 'charts', nome);

  if (!fs.existsSync(caminho)) {
    return res.status(404).json({ erro: 'Gráfico não encontrado' });
  }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-store'); // cliente não deve cachear — arquivo será apagado

  // Apaga o arquivo do servidor assim que o envio terminar
  return res.sendFile(caminho, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ erro: 'Erro ao enviar gráfico' });
    }
    fs.unlink(caminho, (unlinkErr) => {
      if (unlinkErr) logger.warn(`Não foi possível apagar gráfico: ${nome}`);
    });
  });
});

export default router;