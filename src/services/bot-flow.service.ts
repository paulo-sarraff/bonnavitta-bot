import logger from '../utils/logger.js';
import { EstadoBot, MensagemBotResponse, ContextoDados } from '../models/schemas.js';

class BotFlowService {
  /**
   * Menu principal - Alinhado com o menu do cliente
   */
  getMenuPrincipal(): MensagemBotResponse {
    return {
      resposta: `🏪 *Bem-vindo ao Chatbot BonnaVitta*\n\nO que deseja consultar?\n`,
      opcoes: [
        { id: '1', texto: 'Totalizador de Vendas', emoji: '📊' },
        { id: '2', texto: 'Vendas por Dia', emoji: '📅' },
        { id: '3', texto: 'Ranking de Produtos', emoji: '🏆' },
        { id: '4', texto: 'Totalizador por Fabricante', emoji: '🏭' },
        { id: '5', texto: 'Sair', emoji: '👋' },
      ],
      proximoEstado: EstadoBot.MENU_PRINCIPAL,
    };
  }

  /**
   * Menu de seleção de data
   */
  getMenuData(): MensagemBotResponse {
    return {
      resposta: `📅 *Qual período deseja consultar?*\n`,
      opcoes: [
        { id: 'hoje', texto: 'Hoje', emoji: '📍' },
        { id: 'ontem', texto: 'Ontem', emoji: '⏮️' },
        { id: '7dias', texto: 'Últimos 7 dias', emoji: '📆' },
        { id: 'mes', texto: 'Este mês', emoji: '📅' },
        { id: 'mespassado', texto: 'Mês anterior', emoji: '⏪' },
        { id: 'voltar', texto: 'Voltar', emoji: '🔙' },
      ],
      proximoEstado: EstadoBot.AGUARDANDO_DATA,
    };
  }

  /**
   * Menu de tipo de consulta para Totalizador de Vendas
   */
  getMenuTipoConsultaTotalizador(): MensagemBotResponse {
    return {
      resposta: `📊 *Totalizador de Vendas*\n\nDeseja ver:\n`,
      opcoes: [
        { id: 'supervisor', texto: 'Vendas por Supervisor', emoji: '👔' },
        { id: 'vendedor', texto: 'Vendas por Vendedor', emoji: '👥' },
        { id: 'equipe', texto: 'Vendas por Equipe', emoji: '🏢' },
        { id: 'voltar', texto: 'Voltar', emoji: '🔙' },
      ],
      proximoEstado: EstadoBot.AGUARDANDO_TIPO_CONSULTA,
    };
  }

  /**
   * Menu de seleção de equipe
   */
  getMenuEquipes(): MensagemBotResponse {
    return {
      resposta: `👥 *Qual equipe deseja consultar?*\n`,
      opcoes: [
        { id: 'Varejo', texto: 'Varejo', emoji: '🛒' },
        { id: 'Food Service', texto: 'Food Service', emoji: '🍽️' },
        { id: 'Redes', texto: 'Redes', emoji: '🏬' },
        { id: 'Telemarketing', texto: 'Telemarketing', emoji: '☎️' },
        { id: 'voltar', texto: 'Voltar', emoji: '🔙' },
      ],
      proximoEstado: EstadoBot.AGUARDANDO_EQUIPE,
    };
  }

  /**
   * Processa resposta do usuário
   */
  async processarResposta(
    opcaoSelecionada: string,
    estadoAtual: EstadoBot,
    contexto: ContextoDados
  ): Promise<{ proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse }> {
    try {
      logger.info(`Processando resposta: ${opcaoSelecionada} (estado: ${estadoAtual})`);

      switch (estadoAtual) {
        case EstadoBot.MENU_PRINCIPAL:
          return this.processarMenuPrincipal(opcaoSelecionada, contexto);

        case EstadoBot.AGUARDANDO_DATA:
          return this.processarSelecaoData(opcaoSelecionada, contexto);

        case EstadoBot.AGUARDANDO_TIPO_CONSULTA:
          return this.processarTipoConsulta(opcaoSelecionada, contexto);

        case EstadoBot.AGUARDANDO_EQUIPE:
          return this.processarSelecaoEquipe(opcaoSelecionada, contexto);

        default:
          return {
            proximoEstado: EstadoBot.MENU_PRINCIPAL,
            contextoAtualizado: contexto,
            resposta: this.getMenuPrincipal(),
          };
      }
    } catch (error) {
      logger.error('Erro ao processar resposta:', error);
      return {
        proximoEstado: EstadoBot.MENU_PRINCIPAL,
        contextoAtualizado: contexto,
        resposta: {
          resposta: 'Desculpe, ocorreu um erro. Tente novamente.',
          proximoEstado: EstadoBot.MENU_PRINCIPAL,
        },
      };
    }
  }

  /**
   * Processa seleção no menu principal
   */
  private processarMenuPrincipal(
    opcao: string,
    contexto: ContextoDados
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {
    contexto.opcaoMenuPrincipal = opcao;

    if (opcao === '5') {
      return {
        proximoEstado: EstadoBot.ENCERRADO,
        contextoAtualizado: contexto,
        resposta: {
          resposta: 'Até logo! 👋',
          proximoEstado: EstadoBot.ENCERRADO,
        },
      };
    }

    return {
      proximoEstado: EstadoBot.AGUARDANDO_DATA,
      contextoAtualizado: contexto,
      resposta: this.getMenuData(),
    };
  }

  /**
   * Processa seleção de data
   */
  private processarSelecaoData(
    opcao: string,
    contexto: ContextoDados
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {
    const hoje = new Date();
    let dataInicio: Date;
    let dataFim: Date = hoje;

    switch (opcao) {
      case 'hoje':
        dataInicio = hoje;
        break;
      case 'ontem':
        dataInicio = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);
        dataFim = dataInicio;
        break;
      case '7dias':
        dataInicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'mes':
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        break;
      case 'mespassado':
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
        break;
      case 'voltar':
        return {
          proximoEstado: EstadoBot.MENU_PRINCIPAL,
          contextoAtualizado: contexto,
          resposta: this.getMenuPrincipal(),
        };
      default:
        dataInicio = hoje;
    }

    contexto.dataInicio = dataInicio.toISOString().split('T')[0];
    contexto.dataFim = dataFim.toISOString().split('T')[0];

    // Próximo passo depende da opção do menu principal
    const opcaoMenuPrincipal = contexto.opcaoMenuPrincipal;

    if (opcaoMenuPrincipal === '1') {
      // Totalizador de Vendas
      return {
        proximoEstado: EstadoBot.AGUARDANDO_TIPO_CONSULTA,
        contextoAtualizado: contexto,
        resposta: this.getMenuTipoConsultaTotalizador(),
      };
    }

    if (opcaoMenuPrincipal === '2') {
      // Vendas por Dia - vai direto para processamento
      contexto.tipoConsulta = 'vendas_por_dia';
      return {
        proximoEstado: EstadoBot.PROCESSANDO,
        contextoAtualizado: contexto,
        resposta: {
          resposta: 'Processando sua consulta...',
          proximoEstado: EstadoBot.PROCESSANDO,
        },
      };
    }

    if (opcaoMenuPrincipal === '3') {
      // Ranking de Produtos - vai direto para processamento
      contexto.tipoConsulta = 'ranking_produtos';
      return {
        proximoEstado: EstadoBot.PROCESSANDO,
        contextoAtualizado: contexto,
        resposta: {
          resposta: 'Processando sua consulta...',
          proximoEstado: EstadoBot.PROCESSANDO,
        },
      };
    }

    if (opcaoMenuPrincipal === '4') {
      // Totalizador por Fabricante - vai direto para processamento
      contexto.tipoConsulta = 'vendas_por_fabricante';
      return {
        proximoEstado: EstadoBot.PROCESSANDO,
        contextoAtualizado: contexto,
        resposta: {
          resposta: 'Processando sua consulta...',
          proximoEstado: EstadoBot.PROCESSANDO,
        },
      };
    }

    return {
      proximoEstado: EstadoBot.MENU_PRINCIPAL,
      contextoAtualizado: contexto,
      resposta: this.getMenuPrincipal(),
    };
  }

  /**
   * Processa tipo de consulta
   */
  private processarTipoConsulta(
    opcao: string,
    contexto: ContextoDados
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {
    if (opcao === 'voltar') {
      return {
        proximoEstado: EstadoBot.AGUARDANDO_DATA,
        contextoAtualizado: contexto,
        resposta: this.getMenuData(),
      };
    }

    contexto.tipoConsulta = opcao;

    return {
      proximoEstado: EstadoBot.PROCESSANDO,
      contextoAtualizado: contexto,
      resposta: {
        resposta: 'Processando sua consulta...',
        proximoEstado: EstadoBot.PROCESSANDO,
      },
    };
  }

  /**
   * Processa seleção de equipe
   */
  private processarSelecaoEquipe(
    opcao: string,
    contexto: ContextoDados
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {
    if (opcao === 'voltar') {
      return {
        proximoEstado: EstadoBot.AGUARDANDO_TIPO_CONSULTA,
        contextoAtualizado: contexto,
        resposta: this.getMenuTipoConsultaTotalizador(),
      };
    }

    contexto.equipeNome = opcao;

    return {
      proximoEstado: EstadoBot.PROCESSANDO,
      contextoAtualizado: contexto,
      resposta: {
        resposta: 'Processando sua consulta...',
        proximoEstado: EstadoBot.PROCESSANDO,
      },
    };
  }
}

export const botFlowService = new BotFlowService();
