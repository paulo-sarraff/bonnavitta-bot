import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller.js';

const router = Router();

/**
 * POST /api/webhook/telegram
 * Webhook para receber mensagens do Telegram
 */
router.post('/telegram', (req, res) => webhookController.telegramWebhook(req, res));

/**
 * GET /api/webhook/telegram
 * Verificação de webhook do Telegram
 */
router.get('/telegram', (req, res) => webhookController.telegramVerify(req, res));

/**
 * POST /api/webhook/whatsapp
 * Webhook para receber mensagens do WhatsApp
 */
router.post('/whatsapp', (req, res) => webhookController.whatsappWebhook(req, res));

/**
 * GET /api/webhook/whatsapp
 * Verificação de webhook do WhatsApp
 */
router.get('/whatsapp', (req, res) => webhookController.whatsappVerify(req, res));

export default router;
