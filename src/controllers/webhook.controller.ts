import { Request, Response } from 'express';
import { telegramService } from '../services/telegram.service.js';
import { whatsappService } from '../services/whatsapp.service.js';
import { botController } from './bot.controller.js';
import logger from '../utils/logger.js';
import { AuthRequest } from '../types/auth-request.js';

export class WebhookController {
  /**
   * =========================
   * WEBHOOK DO TELEGRAM
   * POST /api/webhook/telegram
   * =========================
   */
  async telegramWebhook(req: Request, res: Response): Promise<void> {
    try {
      const update = req.body;

      logger.info('📩 Telegram webhook recebido:', JSON.stringify(update));

      // 👉 O Telegram pode enviar vários tipos de update
      // Aqui só tratamos mensagens de texto
      if (!update.message) {
        res.sendStatus(200);
        return;
      }

      const message = update.message;
      const chatId = message.chat.id.toString();
      const texto = message.text || '';
      const usuarioId = message.from.id;
      const nomeUsuario = message.from.first_name;

      logger.info(
        `👤 Telegram | ${nomeUsuario} (${usuarioId}) disse: ${texto}`
      );

      // ⚠️ MUITO IMPORTANTE:
      // Respondemos 200 OK IMEDIATAMENTE para o Telegram
      // para evitar timeout e reenvio da mensagem
      res.sendStatus(200);

      // =========================
      // PROCESSAMENTO DO BOT
      // =========================
      const resultado = await botController.processarMensagem({
        body: {
          usuarioId,
          canal: 'telegram',
          chatId,
          mensagem: texto,
        },
      } as AuthRequest);


      // =========================
      // ENVIO DA RESPOSTA AO USUÁRIO
      // =========================
      if (resultado?.resposta) {
        const mensagemFormatada = formatarMensagemTelegram(resultado);

        await telegramService.enviarMensagem(
          chatId,
          mensagemFormatada
        );
      }
    } catch (error) {
      logger.error('❌ Erro no webhook do Telegram:', error);
    }
  }

  /**
   * =========================
   * VERIFICAÇÃO DO TELEGRAM
   * GET /api/webhook/telegram
   * =========================
   */
  telegramVerify(req: Request, res: Response): void {
    try {
      const token = req.query.token as string;

      logger.info('🔎 Verificação de webhook Telegram');

      if (token === process.env.TELEGRAM_BOT_TOKEN) {
        res.status(200).json({ ok: true });
      } else {
        res.status(403).json({ ok: false });
      }
    } catch (error) {
      logger.error('❌ Erro na verificação do Telegram:', error);
      res.status(500).json({ ok: false });
    }
  }

  /**
   * =========================
   * WEBHOOK DO WHATSAPP
   * POST /api/webhook/whatsapp
   * =========================
   */
  async whatsappWebhook(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body;

      logger.info('📩 WhatsApp webhook recebido:', JSON.stringify(body));

      // 👉 Validação básica da estrutura enviada pela Meta
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const message = change?.value?.messages?.[0];

      if (!message) {
        res.status(200).json({ status: 'ok' });
        return;
      }

      const chatId = message.from;
      const texto = message.text?.body || '';
      const usuarioId = message.from;

      logger.info(`👤 WhatsApp | ${chatId} disse: ${texto}`);

      // Respondemos OK imediatamente
      res.status(200).json({ status: 'ok' });

      // =========================
      // PROCESSAMENTO DO BOT
      // =========================
      const resultado = await botController.processarMensagem({
        body: {
          usuarioId,
          canal: 'telegram',
          chatId,
          mensagem: texto,
        },
      } as AuthRequest);

      // =========================
      // ENVIO DA RESPOSTA AO USUÁRIO
      // =========================
      if (resultado?.resposta) {
        await whatsappService.enviarMensagem(
          chatId,
          formatarMensagemWhatsapp(resultado)
        );
      }
    } catch (error) {
      logger.error('❌ Erro no webhook do WhatsApp:', error);
    }
  }

  /**
   * =========================
   * VERIFICAÇÃO DO WHATSAPP
   * GET /api/webhook/whatsapp
   * =========================
   */
  whatsappVerify(req: Request, res: Response): void {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      logger.info('🔎 Verificação de webhook WhatsApp');

      if (
        mode === 'subscribe' &&
        token === process.env.WHATSAPP_WEBHOOK_TOKEN
      ) {
        res.status(200).send(challenge);
      } else {
        res.status(403).json({ error: 'Invalid token' });
      }
    } catch (error) {
      logger.error('❌ Erro na verificação do WhatsApp:', error);
      res.status(500).json({ error: 'Internal error' });
    }
  }
}

/**
 * =========================
 * FORMATADORES DE MENSAGEM
 * =========================
 */

export function formatarMensagemTelegram(resultado: any): string {
  let texto = resultado.resposta;

  if (resultado.opcoes?.length) {
    texto += '\n\n';
    texto += resultado.opcoes
      .map(
        (o: any) =>
          `${o.emoji ?? '➡️'} *${o.id}* - ${o.texto}`
      )
      .join('\n');
  }

  return texto;
}

export function formatarMensagemWhatsapp(resultado: any): string {
  let texto = resultado.resposta;

  if (resultado.opcoes?.length) {
    texto += '\n\n';
    texto += resultado.opcoes
      .map((o: any) => `${o.id} - ${o.texto}`)
      .join('\n');
  }

  return texto;
}

export const webhookController = new WebhookController();
