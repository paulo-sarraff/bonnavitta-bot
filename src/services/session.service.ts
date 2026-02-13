import logger from '../utils/logger.js';
import { SessaoBot, ContextoDados, EstadoBot } from '../models/schemas.js';

// Armazenar sessões em memória (em produção, usar Redis ou BD)
const sessoesEmMemoria = new Map<string, SessaoBot>();

class SessionService {
  /**
   * Cria nova sessão de bot (em memória)
   */
  async criarSessao(
    usuarioId: number,
    canal: 'telegram' | 'whatsapp',
    chatId: string,
    token: string
  ): Promise<SessaoBot | null> {
    try {
      const chaveUnica = `${canal}_${chatId}`;
      
      // Criar nova sessão
      const sessao: SessaoBot = {
        id: Date.now(),
        usuarioId,
        canal,
        chatId,
        estadoAtual: EstadoBot.AGUARDANDO_CPF,  // ✅ CORRIGIDO: Iniciar com AGUARDANDO_CPF
        token,
        dadosContexto: {},  // ✅ ADICIONADO: Inicializar contexto vazio
      };

      // Armazenar em memória
      sessoesEmMemoria.set(chaveUnica, sessao);
      
      logger.info(`Sessão criada: ${sessao.id} (usuário: ${usuarioId}, canal: ${canal})`);

      return sessao;
    } catch (error) {
      logger.error('Erro ao criar sessão:', error);
      throw error;
    }
  }

  /**
   * Obtém sessão existente (em memória)
   */
  async obterSessao(chatId: string, canal: 'telegram' | 'whatsapp'): Promise<SessaoBot | null> {
    try {
      const chaveUnica = `${canal}_${chatId}`;
      
      const sessao = sessoesEmMemoria.get(chaveUnica);

      if (!sessao) {
        logger.warn(`Sessão não encontrada: ${chatId} (${canal})`);
        return null;
      }

      logger.info(`Sessão obtida: ${sessao.id}`);
      return sessao;
    } catch (error) {
      logger.error('Erro ao obter sessão:', error);
      return null;
    }
  }

  /**
   * Atualiza estado da sessão (em memória)
   */
  async atualizarEstado(
    sessaoId: number,
    novoEstado: EstadoBot,
    dadosContexto?: ContextoDados
  ): Promise<boolean> {
    try {
      // Encontrar sessão pelo ID
      let sessaoEncontrada: SessaoBot | null = null;
      let chaveEncontrada: string | null = null;

      for (const [chave, sessao] of sessoesEmMemoria.entries()) {
        if (sessao.id === sessaoId) {
          sessaoEncontrada = sessao;
          chaveEncontrada = chave;
          break;
        }
      }

      if (!sessaoEncontrada || !chaveEncontrada) {
        logger.warn(`Sessão não encontrada: ${sessaoId}`);
        return false;
      }

      // Atualizar sessão
      sessaoEncontrada.estadoAtual = novoEstado;
      sessaoEncontrada.dadosContexto = dadosContexto || {};

      // Atualizar no Map
      sessoesEmMemoria.set(chaveEncontrada, sessaoEncontrada);

      logger.info(`Estado da sessão ${sessaoId} atualizado para: ${novoEstado}`);
      return true;
    } catch (error) {
      logger.error('Erro ao atualizar estado da sessão:', error);
      return false;
    }
  }

  /**
   * Valida token da sessão
   */
  validarToken(token: string): boolean {
    return !!token && token.length > 0;
  }

  /**
   * Limpa sessões expiradas (chamado periodicamente)
   */
  async limparSessoesExpiradas(): Promise<void> {
    try {
      logger.info('Limpando sessões expiradas...');
      // Implementar limpeza de sessões expiradas no BD
    } catch (error) {
      logger.error('Erro ao limpar sessões expiradas:', error);
    }
  }
  
    /**
   * Atualiza múltiplos campos da sessão (token, usuarioId, estado, contexto)
   */
  async atualizarSessaoCompleta(
    sessaoId: number,
    dados: {
      usuarioId?: number;
      token?: string;
      estadoAtual?: EstadoBot;
      dadosContexto?: ContextoDados;
    }
  ): Promise<boolean> {
    try {
      let sessaoEncontrada: SessaoBot | null = null;
      let chaveEncontrada: string | null = null;

      // Encontrar sessão pelo ID
      for (const [chave, sessao] of sessoesEmMemoria.entries()) {
        if (sessao.id === sessaoId) {
          sessaoEncontrada = sessao;
          chaveEncontrada = chave;
          break;
        }
      }

      if (!sessaoEncontrada || !chaveEncontrada) {
        logger.warn(`Sessão não encontrada para atualização completa: ${sessaoId}`);
        return false;
      }

      // Atualizar apenas campos enviados
      if (dados.usuarioId !== undefined) {
        sessaoEncontrada.usuarioId = dados.usuarioId;
      }

      if (dados.token !== undefined) {
        sessaoEncontrada.token = dados.token;
      }

      if (dados.estadoAtual !== undefined) {
        sessaoEncontrada.estadoAtual = dados.estadoAtual;
      }

      if (dados.dadosContexto !== undefined) {
        sessaoEncontrada.dadosContexto = dados.dadosContexto;
      }

      // Atualizar no Map
      sessoesEmMemoria.set(chaveEncontrada, sessaoEncontrada);

      logger.info(`Sessão ${sessaoId} atualizada com sucesso`);
      return true;
    } catch (error) {
      logger.error('Erro ao atualizar sessão completa:', error);
      return false;
    }
  }

    /**
   * Reseta sessão para estado inicial
   */
  async resetarSessao(
    chatId: string,
    canal: 'telegram' | 'whatsapp'
  ): Promise<boolean> {
    try {
      const chaveUnica = `${canal}_${chatId}`;
      const sessao = sessoesEmMemoria.get(chaveUnica);

      if (!sessao) {
        logger.warn(`Tentativa de resetar sessão inexistente: ${chatId}`);
        return false;
      }

      sessao.estadoAtual = EstadoBot.AGUARDANDO_CPF;  // ✅ CORRIGIDO: Resetar para AGUARDANDO_CPF
      sessao.dadosContexto = {};

      sessoesEmMemoria.set(chaveUnica, sessao);

      logger.info(`Sessão resetada: ${sessao.id}`);
      return true;
    } catch (error) {
      logger.error('Erro ao resetar sessão:', error);
      return false;
    }
  }
  
}

export const sessionService = new SessionService();