import logger from '../utils/logger.js';
import { EstadoBot, MensagemBotResponse, ContextoDados } from '../models/schemas.js';
import { getPreviousWeekRange } from '../utils/formatter.js';

class BotFlowService {
  /**
   * Menu principal - Alinhado com o menu do cliente
   * ✅ CORRIGIDO: Aceita roles e retorna menu diferente conforme a role
   */
  getMenuPrincipal(roles: string[] = [], nomeUsuario: string): MensagemBotResponse {
    logger.info(`Gerando menu principal para roles: ${roles.join(', ')}`);
    
    // Verificar se é admin ou diretoria (acesso a todos os menus)
    const isAdminOrDiretoria = roles.includes('admin') || roles.includes('diretoria');
    const isComercial = roles.includes('comercial');
    const isFinanceiro = roles.includes('financeiro');

    // Menu para admin/diretoria (todos os acessos)
    if (isAdminOrDiretoria) {
      return {
        resposta: `🏪 ${nomeUsuario}, o que deseja consultar?\n`,
        opcoes: [
          { id: '1', texto: 'Menu Comercial', emoji: '📊' },
          { id: '2', texto: 'Menu Financeiro', emoji: '💰' },
          { id: '0', texto: 'Sair', emoji: '👋' },
        ],
        proximoEstado: EstadoBot.MENU_PRINCIPAL,
      };
    }

    // Menu para comercial
    if (isComercial) {
      return {
        resposta: `🏪 *Bem-vindo ao Chatbot BonnaVitta - Menu Comercial*\n\nO que deseja consultar?\n`,
        opcoes: [
          { id: '1', texto: 'Totalizador de Vendas por Supervisor', emoji: '👔' },
          { id: '2', texto: 'Totalizador de Vendas por Vendedor', emoji: '👥' },
          { id: '3', texto: 'Vendas por Dia', emoji: '📅' },
          { id: '4', texto: 'Totalizador por Fabricante', emoji: '🏭' },
          { id: '0', texto: 'Sair', emoji: '👋' },
        ],
        proximoEstado: EstadoBot.MENU_PRINCIPAL,
      };
    }

    // Menu para financeiro
    if (isFinanceiro) {
      return {
        resposta: `🏪 *Bem-vindo ao Chatbot BonnaVitta - Menu Financeiro*\n\nO que deseja consultar?\n`,
        opcoes: [
          { id: '1', texto: 'Relatório Financeiro', emoji: '💼' },
          { id: '2', texto: 'Análise de Custos', emoji: '📉' },
          { id: '0', texto: 'Sair', emoji: '👋' },
        ],
        proximoEstado: EstadoBot.MENU_PRINCIPAL,
      };
    }

    // ❌ Menu padrão removido - Todos os usuários devem ter uma role definida
    // Se chegar aqui, retornar menu vazio
    logger.warn('Usuário sem role definida. Retornando menu vazio.');
    return {
      resposta: `❌ Erro: Sua role não foi definida. Entre em contato com o administrador.`,
      opcoes: [
        { id: '0', texto: 'Sair', emoji: '👋' },
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
        { id: '1', texto: 'Hoje', emoji: '📍' },
        { id: '2', texto: 'Ontem', emoji: '⏮️' },
        { id: '3', texto: 'Últimos 7 dias', emoji: '📆' },
        { id: '4', texto: 'Este mês', emoji: '📅' },
        { id: '5', texto: 'Mês anterior', emoji: '⏪' },
        { id: '0', texto: 'Voltar', emoji: '🔙' },
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
        { id: '1', texto: 'Vendas por Supervisor', emoji: '👔' },
        { id: '2', texto: 'Vendas por Vendedor', emoji: '👥' },
        { id: '3', texto: 'Vendas por Equipe', emoji: '🤝' },
        { id: '4', texto: 'Vendas por Fabricante', emoji: '🏢' },
        { id: '0', texto: 'Voltar', emoji: '🔙' },
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
        { id: '1', texto: 'Varejo', emoji: '🛒' },
        { id: '2', texto: 'Food Service', emoji: '🍽️' },
        { id: '3', texto: 'Redes', emoji: '🏬' },
        { id: '4', texto: 'Telemarketing', emoji: '☎️' },
        { id: '0', texto: 'Voltar', emoji: '🔙' },
      ],
      proximoEstado: EstadoBot.AGUARDANDO_EQUIPE,
    };
  }

  /**
   * Processa resposta do usuário
   * ✅ CORRIGIDO: Adicionar roles para passar ao getMenuPrincipal()
   */
  async processarResposta(
    opcaoSelecionada: string,
    estadoAtual: EstadoBot,
    contexto: ContextoDados,
    roles: string[] = [],
    nomeUsuario: string
  ): Promise<{ proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse }> {
    try {
      logger.info(`Processando resposta: ${opcaoSelecionada} (estado: ${estadoAtual})`);

      switch (estadoAtual) {
        case EstadoBot.MENU_PRINCIPAL:
          return this.processarMenuPrincipal(opcaoSelecionada, contexto, roles, nomeUsuario); // CORRIGIDO: Passar roles

        case EstadoBot.AGUARDANDO_DATA:
          return this.processarSelecaoData(opcaoSelecionada, contexto, roles, nomeUsuario); // ✅ CORRIGIDO: Passar roles

        case EstadoBot.AGUARDANDO_TIPO_CONSULTA:
          return this.processarTipoConsulta(opcaoSelecionada, contexto);

        case EstadoBot.AGUARDANDO_EQUIPE:
          return this.processarSelecaoEquipe(opcaoSelecionada, contexto);

        default:
          return {
            proximoEstado: EstadoBot.MENU_PRINCIPAL,
            contextoAtualizado: contexto,
            resposta: this.getMenuPrincipal(roles, nomeUsuario), // ✅ CORRIGIDO: Passar roles
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
    contexto: ContextoDados,
    roles: string[] = [],
    nomeUsuario: string
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {

    // Opcoes validas do menu principal (incluindo '0' para sair)
    const opcoesValidas = ['0', '1', '2', '3', '4', '5'];

    // LOGOUT: Opcao 0 - Sair
    if (opcao === '0') {
      logger.info('Usuario solicitou logout (opcao 0)');
      return {
        proximoEstado: EstadoBot.ENCERRADO,
        contextoAtualizado: contexto,
        resposta: {
          resposta: 'Ate logo! 👋\n\nVoce foi desconectado. Digite seu CPF para fazer login novamente.',
          proximoEstado: EstadoBot.ENCERRADO,
        },
      };
    }

    // 👉 PRIMEIRA MENSAGEM ou texto inválido
    // Apenas reapresenta o menu principal
    if (!opcoesValidas.includes(opcao)) {
      return {
        proximoEstado: EstadoBot.MENU_PRINCIPAL,
        contextoAtualizado: contexto,
        resposta: this.getMenuPrincipal(roles, nomeUsuario), // CORRIGIDO: Passar roles
      };
    }

    contexto.opcaoMenuPrincipal = opcao;

    // Encerrar atendimento
    if (opcao === '5') {
      logger.info('Usuario solicitou logout (opcao 5)');
      return {
        proximoEstado: EstadoBot.ENCERRADO,
        contextoAtualizado: contexto,
        resposta: {
          resposta: 'Ate logo! 👋\n\nVoce foi desconectado. Digite seu CPF para fazer login novamente.',
          proximoEstado: EstadoBot.ENCERRADO,
        },
      };
    }

    // Fluxo normal
    return {
      proximoEstado: EstadoBot.AGUARDANDO_DATA,
      contextoAtualizado: contexto,
      resposta: this.getMenuData(),
    };
  }

  /**
   * Processa seleção de data
   * ✅ CORRIGIDO: Adicionar roles para passar ao getMenuPrincipal()
   */
  private processarSelecaoData(
    opcao: string,
    contexto: ContextoDados,
    roles: string[] = [],
    nomeUsuario: string
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {
    const hoje = new Date();
    let dataInicio: Date;
    let dataFim: Date = hoje;

    switch (opcao) {
      case '1':
        dataInicio = hoje;
        break;
      case '2':
        dataInicio = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);
        dataFim = dataInicio;
        break;
      case '3':
        const { start, end } = getPreviousWeekRange();
        dataInicio = start;
        dataFim = end;
        break;
      case '4':
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
        break;
      case '5':
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
        break;
      case '0':
        return {
          proximoEstado: EstadoBot.MENU_PRINCIPAL,
          contextoAtualizado: contexto,
          resposta: this.getMenuPrincipal(roles, nomeUsuario),
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
      resposta: this.getMenuPrincipal(roles, nomeUsuario), // CORRIGIDO: Passar roles
    };
  }

  /**
   * Processa tipo de consulta
   */
  private processarTipoConsulta(
    opcao: string,
    contexto: ContextoDados
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {
    if (opcao === '0') {
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
    if (opcao === '0') {
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
