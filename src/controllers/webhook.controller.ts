import { Request, Response } from 'express';
import { telegramService } from '../services/telegram.service.js';
import { whatsappService } from '../services/whatsapp.service.js';
import { botController } from './bot.controller.js';
import logger from '../utils/logger.js';

export class WebhookController {
  /**
   * Webhook do Telegram
   * POST /api/webhook/telegram
   */
  async telegramWebhook(req: Request, res: Response): Promise<void> {
    try {
      const update = req.body;

      logger.info('Telegram webhook recebido:', JSON.stringify(update));

      // Verificar se é uma mensagem
      if (!update.message) {
        res.status(200).json({ ok: true });
        return;
      }

      const { message } = update;
      const chatId = message.chat.id.toString();
      const texto = message.text || '';
      const usuarioId = message.from.id;
      const nomeUsuario = message.from.first_name;

      logger.info(`Mensagem Telegram de ${nomeUsuario} (${usuarioId}): ${texto}`);

      // Processar mensagem
      res.sendStatus(200); // RESPONDE IMEDIATO AO TELEGRAM

      const fakeRes: any = {
        status: () => fakeRes,
        json: async (data: any) => {
          if (!data?.resposta) return;

          // 1️⃣ Texto principal
          await telegramService.enviarMensagem(chatId, data.resposta);

          // 2️⃣ Opções de menu
          if (Array.isArray(data.opcoes) && data.opcoes.length > 0) {
            const menuTexto = data.opcoes.join('\n');
            await telegramService.enviarMensagem(chatId, menuTexto);
          }
        },
      };

      await botController.processarMensagem(
        {
          body: {
            usuarioId,
            canal: 'telegram',
            chatId,
            mensagem: texto,
          },
        } as any,
        fakeRes);

    } catch (error) {
      logger.error('Erro no webhook do Telegram:', error);
      res.status(500).json({ ok: false });
    }
  }

  /**
   * Verificação do webhook do Telegram
   * GET /api/webhook/telegram
   */
  telegramVerify(req: Request, res: Response): void {
    try {
      const token = req.query.token as string;

      logger.info('Verificação de webhook Telegram:', token);

      if (token === process.env.TELEGRAM_BOT_TOKEN) {
        res.status(200).json({ ok: true });
      } else {
        res.status(403).json({ ok: false });
      }
    } catch (error) {
      logger.error('Erro na verificação do webhook Telegram:', error);
      res.status(500).json({ ok: false });
    }
  }

  /**
   * Webhook do WhatsApp
   * POST /api/webhook/whatsapp
   */
  async whatsappWebhook(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body;

      logger.info('WhatsApp webhook recebido:', JSON.stringify(body));

      // Verificar estrutura
      if (!body.entry || !body.entry[0] || !body.entry[0].changes) {
        res.status(200).json({ status: 'ok' });
        return;
      }

      const changes = body.entry[0].changes[0];
      const messages = changes.value.messages;

      if (!messages || messages.length === 0) {
        res.status(200).json({ status: 'ok' });
        return;
      }

      const message = messages[0];
      const chatId = message.from;
      const texto = message.text?.body || '';
      const usuarioId = message.from;

      logger.info(`Mensagem WhatsApp de ${chatId}: ${texto}`);

      // Processar mensagem
      await botController.processarMensagem(
        {
          body: {
            usuarioId,
            canal: 'whatsapp',
            chatId,
            mensagem: texto,
          },
        } as any,
        {
          status: () => ({ json: () => {} }),
          json: () => {},
        } as any
      );

      // Enviar resposta via WhatsApp
      await whatsappService.enviarMensagem(chatId, 'Processando sua solicitação...');

      res.status(200).json({ status: 'ok' });
    } catch (error) {
      logger.error('Erro no webhook do WhatsApp:', error);
      res.status(500).json({ status: 'error' });
    }
  }

  /**
   * Verificação do webhook do WhatsApp
   * GET /api/webhook/whatsapp
   */
  whatsappVerify(req: Request, res: Response): void {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      logger.info('Verificação de webhook WhatsApp');

      if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_TOKEN) {
        res.status(200).send(challenge);
      } else {
        res.status(403).json({ error: 'Invalid token' });
      }
    } catch (error) {
      logger.error('Erro na verificação do webhook WhatsApp:', error);
      res.status(500).json({ error: 'Internal error' });
    }
  }
}

export const webhookController = new WebhookController();
