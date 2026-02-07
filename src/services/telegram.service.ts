import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class TelegramService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `https://api.telegram.org/bot${config.telegram.botToken}`;
  }

  /**
   * Envia mensagem de texto via Telegram
   */
  async enviarMensagem(chatId: string, texto: string, opcoes?: any): Promise<boolean> {
    try {
      const payload = {
        chat_id: chatId,
        text: texto,
        parse_mode: 'HTML',
        ...opcoes,
      };

      const response = await axios.post(`${this.baseUrl}/sendMessage`, payload);

      logger.info(`Mensagem enviada para Telegram (${chatId})`);
      return response.data.ok;
    } catch (error) {
      logger.error('Erro ao enviar mensagem Telegram:', error);
      return false;
    }
  }

  /**
   * Envia foto via Telegram
   */
  async enviarFoto(chatId: string, fotoUrl: string, legenda?: string): Promise<boolean> {
    try {
      const payload = {
        chat_id: chatId,
        photo: fotoUrl,
        caption: legenda || '',
        parse_mode: 'HTML',
      };

      const response = await axios.post(`${this.baseUrl}/sendPhoto`, payload);

      logger.info(`Foto enviada para Telegram (${chatId})`);
      return response.data.ok;
    } catch (error) {
      logger.error('Erro ao enviar foto Telegram:', error);
      return false;
    }
  }

  /**
   * Envia teclado com opções
   */
  async enviarTeclado(chatId: string, texto: string, opcoes: any[]): Promise<boolean> {
    try {
      const keyboard = {
        inline_keyboard: opcoes.map((opcao) => [
          {
            text: opcao.texto,
            callback_data: opcao.id,
          },
        ]),
      };

      const payload = {
        chat_id: chatId,
        text: texto,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      };

      const response = await axios.post(`${this.baseUrl}/sendMessage`, payload);

      logger.info(`Teclado enviado para Telegram (${chatId})`);
      return response.data.ok;
    } catch (error) {
      logger.error('Erro ao enviar teclado Telegram:', error);
      return false;
    }
  }

  /**
   * Define webhook
   */
  async definirWebhook(urlWebhook: string): Promise<boolean> {
    try {
      const payload = {
        url: urlWebhook,
        allowed_updates: ['message', 'callback_query'],
      };

      const response = await axios.post(`${this.baseUrl}/setWebhook`, payload);

      logger.info(`Webhook Telegram definido: ${urlWebhook}`);
      return response.data.ok;
    } catch (error) {
      logger.error('Erro ao definir webhook Telegram:', error);
      return false;
    }
  }

  /**
   * Remove webhook
   */
  async removerWebhook(): Promise<boolean> {
    try {
      const response = await axios.post(`${this.baseUrl}/deleteWebhook`);

      logger.info('Webhook Telegram removido');
      return response.data.ok;
    } catch (error) {
      logger.error('Erro ao remover webhook Telegram:', error);
      return false;
    }
  }

  /**
   * Obtém informações do webhook
   */
  async obterInfoWebhook(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/getWebhookInfo`);

      logger.info('Informações do webhook Telegram obtidas');
      return response.data.result;
    } catch (error) {
      logger.error('Erro ao obter informações do webhook Telegram:', error);
      return null;
    }
  }

  /**
   * Obtém informações do bot
   */
  async obterInfoBot(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/getMe`);

      logger.info('Informações do bot Telegram obtidas');
      return response.data.result;
    } catch (error) {
      logger.error('Erro ao obter informações do bot Telegram:', error);
      return null;
    }
  }
}

export const telegramService = new TelegramService();
