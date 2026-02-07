import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class WhatsAppService {
  private baseUrl: string;
  private accessToken: string;
  private phoneNumberId: string;

  constructor() {
    this.baseUrl = 'https://graph.instagram.com/v18.0';
    this.accessToken = config.whatsapp.accessToken;
    this.phoneNumberId = config.whatsapp.phoneNumberId;
  }

  /**
   * Envia mensagem de texto via WhatsApp
   */
  async enviarMensagem(numeroDestino: string, texto: string): Promise<boolean> {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: numeroDestino,
        type: 'text',
        text: {
          body: texto,
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`Mensagem enviada para WhatsApp (${numeroDestino})`);
      return response.data.messages && response.data.messages.length > 0;
    } catch (error) {
      logger.error('Erro ao enviar mensagem WhatsApp:', error);
      return false;
    }
  }

  /**
   * Envia imagem via WhatsApp
   */
  async enviarImagem(numeroDestino: string, urlImagem: string, legenda?: string): Promise<boolean> {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: numeroDestino,
        type: 'image',
        image: {
          link: urlImagem,
        },
        ...(legenda && {
          caption: legenda,
        }),
      };

      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`Imagem enviada para WhatsApp (${numeroDestino})`);
      return response.data.messages && response.data.messages.length > 0;
    } catch (error) {
      logger.error('Erro ao enviar imagem WhatsApp:', error);
      return false;
    }
  }

  /**
   * Envia documento via WhatsApp
   */
  async enviarDocumento(
    numeroDestino: string,
    urlDocumento: string,
    nomeArquivo?: string
  ): Promise<boolean> {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: numeroDestino,
        type: 'document',
        document: {
          link: urlDocumento,
          ...(nomeArquivo && {
            filename: nomeArquivo,
          }),
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`Documento enviado para WhatsApp (${numeroDestino})`);
      return response.data.messages && response.data.messages.length > 0;
    } catch (error) {
      logger.error('Erro ao enviar documento WhatsApp:', error);
      return false;
    }
  }

  /**
   * Envia mensagem com botões
   */
  async enviarMensagemComBotoes(
    numeroDestino: string,
    texto: string,
    botoes: Array<{ id: string; titulo: string }>
  ): Promise<boolean> {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: numeroDestino,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: texto,
          },
          action: {
            buttons: botoes.map((botao) => ({
              type: 'reply',
              reply: {
                id: botao.id,
                title: botao.titulo,
              },
            })),
          },
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`Mensagem com botões enviada para WhatsApp (${numeroDestino})`);
      return response.data.messages && response.data.messages.length > 0;
    } catch (error) {
      logger.error('Erro ao enviar mensagem com botões WhatsApp:', error);
      return false;
    }
  }

  /**
   * Marca mensagem como lida
   */
  async marcarComoLida(messageId: string): Promise<boolean> {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      };

      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`Mensagem marcada como lida (${messageId})`);
      return response.status === 200;
    } catch (error) {
      logger.error('Erro ao marcar mensagem como lida:', error);
      return false;
    }
  }

  /**
   * Obtém perfil do contato
   */
  async obterPerfilContato(numeroContato: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${numeroContato}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      logger.info(`Perfil do contato obtido (${numeroContato})`);
      return response.data;
    } catch (error) {
      logger.error('Erro ao obter perfil do contato:', error);
      return null;
    }
  }
}

export const whatsappService = new WhatsAppService();
