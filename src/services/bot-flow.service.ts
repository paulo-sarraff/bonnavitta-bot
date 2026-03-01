import logger from '../utils/logger.js';
import { EstadoBot, MensagemBotResponse, ContextoDados } from '../models/schemas.js';
import { formatarNumero, formatarData, getPreviousWeekRange, getCurrentWeekRange, hojeManaus, toDateStringManaus } from '../utils/formatter.js';

// ============================================
// Supervisores fixos do sistema (ordem exibida no menu)
// ============================================
export const SUPERVISORES = [
  { id: '1', nome: 'LOJA' },
  { id: '2', nome: 'FOOD SERVICE' },
  { id: '3', nome: 'VAREJO' },
  { id: '4', nome: 'REDES' },
  { id: '5', nome: 'TELEMARKETING' },
];

class BotFlowService {

  // ============================================================
  // MENUS DE EXIBIÇÃO
  // ============================================================

  /**
   * Menu principal — diferente por role
   */
  getMenuPrincipal(roles: string[] = [], nomeUsuario: string): MensagemBotResponse {
    logger.info(`Gerando menu principal para roles: ${roles.join(', ')}`);

    const isAdminOrDiretoria = roles.includes('admin') || roles.includes('diretoria');
    const isComercial = roles.includes('comercial');
    const isFinanceiro = roles.includes('financeiro');

    if (isAdminOrDiretoria) {
      return {
        resposta: `🏪 ${nomeUsuario}, o que deseja consultar?\n`,
        opcoes: [
          { id: '1', texto: 'Menu Comercial', emoji: '📊' },
          { id: '0', texto: 'Sair', emoji: '👋' },
        ],
        proximoEstado: EstadoBot.MENU_PRINCIPAL,
      };
    }

    if (isComercial) {
      return this.getMenuComercial(nomeUsuario);
    }

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

    logger.warn('Usuário sem role definida. Retornando menu vazio.');
    return {
      resposta: `❌ Erro: Sua role não foi definida. Entre em contato com o administrador.`,
      opcoes: [{ id: '0', texto: 'Sair', emoji: '👋' }],
      proximoEstado: EstadoBot.MENU_PRINCIPAL,
    };
  }

  /**
   * Menu Comercial com 9 opções (1-4 funcionais, 5-9 placeholders, 0 sair)
   */
  getMenuComercial(nomeUsuario: string = ''): MensagemBotResponse {
    const saudacao = nomeUsuario ? `🏪 *${nomeUsuario}* — Menu Comercial\n\n` : `🏪 *Menu Comercial*\n\n`;
    return {
      resposta: `${saudacao}O que deseja consultar?\n`,
      opcoes: [
        { id: '1', texto: 'Totalizador de Vendas por Supervisor', emoji: '👔' },
        { id: '2', texto: 'Totalizador de Vendas por Vendedor', emoji: '👥' },
        { id: '3', texto: 'Vendas por Dia', emoji: '📅' },
        { id: '4', texto: 'Totalizador por Fabricante', emoji: '🏭' },
        { id: '0', texto: 'Sair', emoji: '👋' },
      ],
      proximoEstado: EstadoBot.MENU_COMERCIAL,
    };
  }

  /**
   * Menu de seleção de período (Hoje, Ontem, Últimos 7 dias, Este mês, Mês anterior)
   */
  getMenuPeriodo(): MensagemBotResponse {
    return {
      resposta: `📅 *Qual período deseja consultar?*\n`,
      opcoes: [
        { id: '1', texto: 'Hoje', emoji: '📍' },
        { id: '2', texto: 'Ontem', emoji: '⏮️' },
        { id: '3', texto: 'Última semana (Seg - Dom)', emoji: '📆' },
        { id: '4', texto: 'Este mês', emoji: '📅' },
        { id: '5', texto: 'Mês anterior', emoji: '⏪' },
        { id: '0', texto: 'Voltar', emoji: '🔙' },
      ],
      proximoEstado: EstadoBot.AGUARDANDO_DATA,
    };
  }

  /**
   * Menu de tipo de resumo para Vendas por Dia (opções A-E)
   * Cada opção já carrega implicitamente o período — não é necessário tela de período.
   */
  getMenuTipoResumoDia(): MensagemBotResponse {
    return {
      resposta: `📊 *Vendas por Dia — Tipo de Resumo*\n\nEscolha o agrupamento:\n`,
      opcoes: [
        { id: 'A', texto: 'Semana Atual', emoji: '📅' },
        { id: 'B', texto: 'Semana Anterior', emoji: '⏪' },
        { id: 'C', texto: 'Mês Atual', emoji: '🗓️' },
        { id: 'D', texto: 'Ano Atual (por semana)', emoji: '📆' },
        { id: 'E', texto: 'Ano Atual (por mês)', emoji: '📊' },
        { id: '0', texto: 'Voltar', emoji: '🔙' },
      ],
      proximoEstado: EstadoBot.AGUARDANDO_TIPO_RESUMO_DIA,
    };
  }

  /**
   * Menu de formato de exibição (Extenso ou Gráfico)
   */
  getMenuFormatoDia(): MensagemBotResponse {
    return {
      resposta: `🖥️ *Como deseja visualizar o resultado?*\n`,
      opcoes: [
        { id: '1', texto: 'Extenso (texto)', emoji: '📝' },
        { id: '2', texto: 'Gráfico', emoji: '📈' },
        { id: '0', texto: 'Voltar', emoji: '🔙' },
      ],
      proximoEstado: EstadoBot.AGUARDANDO_FORMATO_DIA,
    };
  }

  /**
   * Pergunta pós-resultado de supervisor: "Deseja analisar outro supervisor?"
   */
  getPerguntaOutroSupervisor(): MensagemBotResponse {
    return {
      resposta: `🔄 Deseja analisar outro supervisor?`,
      opcoes: [
        { id: '1', texto: 'Sim', emoji: '✅' },
        { id: '2', texto: 'Não — voltar ao menu', emoji: '🔙' },
      ],
      proximoEstado: EstadoBot.EXIBINDO_ANALISE_SUPERVISOR,
    };
  }

  /**
   * Pergunta pós-resultado de vendedor: "Deseja analisar outro vendedor?"
   */
  getPerguntaOutroVendedor(): MensagemBotResponse {
    return {
      resposta: `🔄 Deseja analisar outro vendedor?`,
      opcoes: [
        { id: '1', texto: 'Sim', emoji: '✅' },
        { id: '2', texto: 'Não — voltar ao menu', emoji: '🔙' },
      ],
      proximoEstado: EstadoBot.EXIBINDO_ANALISE_VENDEDOR,
    };
  }

  /**
   * Pergunta pós-resultado de vendas por dia: "Deseja consultar outro período?"
   */
  getPerguntaOutroPeriodoDia(): MensagemBotResponse {
    return {
      resposta: `🔄 Deseja consultar outro período?`,
      opcoes: [
        { id: '1', texto: 'Sim', emoji: '✅' },
        { id: '2', texto: 'Não — voltar ao menu', emoji: '🔙' },
      ],
      proximoEstado: EstadoBot.EXIBINDO_RESULTADO_DIA,
    };
  }

  // ============================================================
  // PROCESSAMENTO PRINCIPAL
  // ============================================================

  async processarResposta(
    opcaoSelecionada: string,
    estadoAtual: EstadoBot,
    contexto: ContextoDados,
    roles: string[] = [],
    nomeUsuario: string
  ): Promise<{ proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse }> {
    try {
      logger.info(`Processando resposta: "${opcaoSelecionada}" (estado: ${estadoAtual})`);

      switch (estadoAtual) {
        case EstadoBot.MENU_PRINCIPAL:
          return this.processarMenuPrincipal(opcaoSelecionada, contexto, roles, nomeUsuario);

        case EstadoBot.MENU_COMERCIAL:
          return this.processarMenuComercial(opcaoSelecionada, contexto, roles, nomeUsuario);

        // ── Item 1: Supervisor ────────────────────────────────────────────────
        case EstadoBot.AGUARDANDO_PERIODO_SUPERVISOR:
          return this.processarPeriodo(opcaoSelecionada, contexto, roles, nomeUsuario, 'supervisor');

        case EstadoBot.AGUARDANDO_ESCOLHA_SUPERVISOR:
          return this.processarEscolhaSupervisor(opcaoSelecionada, contexto, roles, nomeUsuario);

        case EstadoBot.EXIBINDO_ANALISE_SUPERVISOR:
          // Pergunta: "Deseja analisar outro supervisor?"
          if (opcaoSelecionada === '1') {
            // Sim → volta para escolha de supervisor (lista já está no contexto)
            return {
              proximoEstado: EstadoBot.AGUARDANDO_ESCOLHA_SUPERVISOR,
              contextoAtualizado: contexto,
              resposta: this.montarPerguntaSupervisor(contexto),
            };
          }
          // Não → menu principal
          return this.irParaMenuPrincipal(contexto, roles, nomeUsuario);

        // ── Item 2: Vendedor ──────────────────────────────────────────────────
        case EstadoBot.AGUARDANDO_PERIODO_VENDEDOR:
          return this.processarPeriodo(opcaoSelecionada, contexto, roles, nomeUsuario, 'vendedor');

        case EstadoBot.AGUARDANDO_CODIGO_VENDEDOR:
          return this.processarCodigoVendedor(opcaoSelecionada, contexto, roles, nomeUsuario);

        case EstadoBot.EXIBINDO_ANALISE_VENDEDOR:
          if (opcaoSelecionada === '1') {
            return {
              proximoEstado: EstadoBot.AGUARDANDO_CODIGO_VENDEDOR,
              contextoAtualizado: contexto,
              resposta: this.montarPerguntaVendedor(contexto),
            };
          }
          return this.irParaMenuPrincipal(contexto, roles, nomeUsuario);

        // ── Item 3: Vendas por Dia ────────────────────────────────────────────
        case EstadoBot.AGUARDANDO_TIPO_RESUMO_DIA:
          return this.processarTipoResumoDia(opcaoSelecionada, contexto, roles, nomeUsuario);

        case EstadoBot.AGUARDANDO_FORMATO_DIA:
          return this.processarFormatoDia(opcaoSelecionada, contexto, roles, nomeUsuario);

        case EstadoBot.EXIBINDO_RESULTADO_DIA:
          if (opcaoSelecionada === '1') {
            // Sim → volta para escolha de tipo de resumo
            return {
              proximoEstado: EstadoBot.AGUARDANDO_TIPO_RESUMO_DIA,
              contextoAtualizado: contexto,
              resposta: this.getMenuTipoResumoDia(),
            };
          }
          return this.irParaMenuPrincipal(contexto, roles, nomeUsuario);

        // ── Item 4: Fabricante ────────────────────────────────────────────────
        case EstadoBot.AGUARDANDO_PERIODO_FABRICANTE:
          return this.processarPeriodo(opcaoSelecionada, contexto, roles, nomeUsuario, 'fabricante');

        default:
          return this.irParaMenuPrincipal(contexto, roles, nomeUsuario);
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

  // ============================================================
  // PROCESSADORES PRIVADOS
  // ============================================================

  /**
   * Menu principal — só para admin/diretoria (hub entre Comercial e Financeiro)
   * Usuários com role 'comercial' já entram direto em MENU_COMERCIAL após login.
   */
  private processarMenuPrincipal(
    opcao: string,
    contexto: ContextoDados,
    roles: string[],
    nomeUsuario: string
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {

    if (opcao === '0') {
      return this.retornarLogout();
    }

    const isAdminOrDiretoria = roles.includes('admin') || roles.includes('diretoria');

    // Admin/Diretoria: opção 1 = Menu Comercial
    if (isAdminOrDiretoria && opcao === '1') {
      return {
        proximoEstado: EstadoBot.MENU_COMERCIAL,
        contextoAtualizado: {},
        resposta: this.getMenuComercial(nomeUsuario),
      };
    }

    // Opção inválida → reexibe menu principal
    return {
      proximoEstado: EstadoBot.MENU_PRINCIPAL,
      contextoAtualizado: contexto,
      resposta: this.getMenuPrincipal(roles, nomeUsuario),
    };
  }

  /**
   * Menu Comercial — roteia para o sub-fluxo correto (itens 1-4, placeholders 5-9, sair 0)
   */
  private processarMenuComercial(
    opcao: string,
    contexto: ContextoDados,
    roles: string[],
    nomeUsuario: string
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {

    if (opcao === '0') {
      return this.retornarLogout();
    }

    // Placeholders 5-9
    if (['5', '6', '7', '8', '9'].includes(opcao)) {
      return {
        proximoEstado: EstadoBot.MENU_COMERCIAL,
        contextoAtualizado: contexto,
        resposta: {
          resposta: `🔒 *Esta funcionalidade será implementada em breve!*\n\nRetornando ao Menu Comercial...`,
          opcoes: this.getMenuComercial(nomeUsuario).opcoes,
          proximoEstado: EstadoBot.MENU_COMERCIAL,
        },
      };
    }

    // Opção inválida → reexibe menu comercial
    if (!['1', '2', '3', '4'].includes(opcao)) {
      return {
        proximoEstado: EstadoBot.MENU_COMERCIAL,
        contextoAtualizado: contexto,
        resposta: this.getMenuComercial(nomeUsuario),
      };
    }

    const novoContexto = { ...contexto, opcaoMenuComercial: opcao };

    if (opcao === '1') {
      return {
        proximoEstado: EstadoBot.AGUARDANDO_PERIODO_SUPERVISOR,
        contextoAtualizado: novoContexto,
        resposta: this.getMenuPeriodo(),
      };
    }

    if (opcao === '2') {
      return {
        proximoEstado: EstadoBot.AGUARDANDO_PERIODO_VENDEDOR,
        contextoAtualizado: novoContexto,
        resposta: this.getMenuPeriodo(),
      };
    }

    if (opcao === '3') {
      return {
        proximoEstado: EstadoBot.AGUARDANDO_TIPO_RESUMO_DIA,
        contextoAtualizado: novoContexto,
        resposta: this.getMenuTipoResumoDia(),
      };
    }

    // opcao === '4'
    return {
      proximoEstado: EstadoBot.AGUARDANDO_PERIODO_FABRICANTE,
      contextoAtualizado: novoContexto,
      resposta: this.getMenuPeriodo(),
    };
  }

  /**
   * Processa seleção de período e seta dataInicio/dataFim no contexto.
   * Redireciona conforme o fluxo (supervisor | vendedor | fabricante).
   */
  private processarPeriodo(
    opcao: string,
    contexto: ContextoDados,
    roles: string[],
    nomeUsuario: string,
    fluxo: 'supervisor' | 'vendedor' | 'fabricante'
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {

    if (opcao === '0') {
      return this.irParaMenuPrincipal(contexto, roles, nomeUsuario);
    }

    const hoje = hojeManaus();
    let dataInicio: Date;
    let dataFim: Date = new Date(hoje);

    switch (opcao) {
      case '1': // Hoje
        dataInicio = new Date(hoje);
        break;
      case '2': // Ontem
        dataInicio = new Date(hoje);
        dataInicio.setDate(hoje.getDate() - 1);
        dataFim = new Date(dataInicio);
        break;
      case '3': // Última semana (Seg-Dom)
        dataInicio = this.getInicioSemanaAnterior();
        dataFim = this.getFimSemanaAnterior();
        break;
      case '4': // Este mês
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        break;
      case '5': // Mês anterior
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
        break;
      default:
        dataInicio = new Date(hoje);
    }

    const novoContexto = {
      ...contexto,
      dataInicio: toDateStringManaus(dataInicio),
      dataFim: toDateStringManaus(dataFim),
    };

    if (fluxo === 'supervisor') {
      return {
        proximoEstado: EstadoBot.PROCESSANDO,
        contextoAtualizado: { ...novoContexto, subFluxo: 'carregar_supervisores' },
        resposta: {
          resposta: '⏳ *Processando...* Buscando dados de supervisores.',
          proximoEstado: EstadoBot.PROCESSANDO,
        },
      };
    }

    if (fluxo === 'vendedor') {
      return {
        proximoEstado: EstadoBot.PROCESSANDO,
        contextoAtualizado: { ...novoContexto, subFluxo: 'carregar_vendedores' },
        resposta: {
          resposta: '⏳ *Processando...* Buscando dados de vendedores.',
          proximoEstado: EstadoBot.PROCESSANDO,
        },
      };
    }

    if (fluxo === 'fabricante') {
      return {
        proximoEstado: EstadoBot.PROCESSANDO,
        contextoAtualizado: { ...novoContexto, subFluxo: 'fabricante' },
        resposta: {
          resposta: '⏳ *Processando...* Buscando dados de fabricantes.',
          proximoEstado: EstadoBot.PROCESSANDO,
        },
      };
    }

    return this.irParaMenuPrincipal(contexto, roles, nomeUsuario);
  }

  /**
   * Processa a escolha de supervisor (1-5 ou 0 para voltar)
   */
  private processarEscolhaSupervisor(
    opcao: string,
    contexto: ContextoDados,
    roles: string[],
    nomeUsuario: string
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {

    if (opcao === '0') {
      return this.irParaMenuPrincipal(contexto, roles, nomeUsuario);
    }

    const supervisor = SUPERVISORES.find(s => s.id === opcao);
    if (!supervisor) {
      return {
        proximoEstado: EstadoBot.AGUARDANDO_ESCOLHA_SUPERVISOR,
        contextoAtualizado: contexto,
        resposta: this.montarPerguntaSupervisor(contexto),
      };
    }

    return {
      proximoEstado: EstadoBot.PROCESSANDO,
      contextoAtualizado: {
        ...contexto,
        subFluxo: 'analise_supervisor',
        supervisorNome: supervisor.nome,
      },
      resposta: {
        resposta: `⏳ *Processando...* Buscando análise de ${supervisor.nome}.`,
        proximoEstado: EstadoBot.PROCESSANDO,
      },
    };
  }

  /**
   * Processa o código do vendedor digitado pelo usuário
   */
  private processarCodigoVendedor(
    codigo: string,
    contexto: ContextoDados,
    roles: string[],
    nomeUsuario: string
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {

    if (codigo === '0') {
      return this.irParaMenuPrincipal(contexto, roles, nomeUsuario);
    }

    const codigoNum = parseInt(codigo.trim(), 10);
    if (isNaN(codigoNum)) {
      return {
        proximoEstado: EstadoBot.AGUARDANDO_CODIGO_VENDEDOR,
        contextoAtualizado: contexto,
        resposta: {
          resposta: `❌ Código inválido. Digite apenas o *número do código* do vendedor:\n(ou *0* para voltar)`,
          proximoEstado: EstadoBot.AGUARDANDO_CODIGO_VENDEDOR,
        },
      };
    }

    return {
      proximoEstado: EstadoBot.PROCESSANDO,
      contextoAtualizado: {
        ...contexto,
        subFluxo: 'analise_vendedor',
        codigoVendedor: codigoNum,
      },
      resposta: {
        resposta: `⏳ *Processando...* Buscando análise do vendedor ${codigoNum}.`,
        proximoEstado: EstadoBot.PROCESSANDO,
      },
    };
  }

  /**
   * Processa tipo de resumo para Vendas por Dia (A-E)
   * Define dataInicio/dataFim automaticamente com base na opção.
   */
  private processarTipoResumoDia(
    opcao: string,
    contexto: ContextoDados,
    roles: string[],
    nomeUsuario: string
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {

    if (opcao === '0') {
      return this.irParaMenuPrincipal(contexto, roles, nomeUsuario);
    }

    const opcaoUpper = opcao.toUpperCase();
    if (!['A', 'B', 'C', 'D', 'E'].includes(opcaoUpper)) {
      return {
        proximoEstado: EstadoBot.AGUARDANDO_TIPO_RESUMO_DIA,
        contextoAtualizado: contexto,
        resposta: this.getMenuTipoResumoDia(),
      };
    }

    const hoje = hojeManaus();
    let dataInicio: Date;
    let dataFim: Date = new Date(hoje);
    let agrupamento: string;

    switch (opcaoUpper) {
      case 'A': // Semana Atual (Seg-Dom desta semana)
        dataInicio = this.getInicioSemanaAtual();
        dataFim = new Date(hoje);
        agrupamento = 'semana_atual';
        break;
      case 'B': // Semana Anterior (Seg-Dom da semana passada)
        dataInicio = this.getInicioSemanaAnterior();
        dataFim = this.getFimSemanaAnterior();
        agrupamento = 'semana_anterior';
        break;
      case 'C': // Mês Atual
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        agrupamento = 'mes_atual';
        break;
      case 'D': // Ano Atual por semana
        dataInicio = new Date(hoje.getFullYear(), 0, 1);
        dataFim = new Date(hoje.getFullYear(), 11, 31);
        agrupamento = 'ano_semanas';
        break;
      case 'E': // Ano Atual por mês
        dataInicio = new Date(hoje.getFullYear(), 0, 1);
        dataFim = new Date(hoje.getFullYear(), 11, 31);
        agrupamento = 'ano_meses';
        break;
      default:
        dataInicio = new Date(hoje);
        agrupamento = 'dia';
    }

    const novoContexto = {
      ...contexto,
      dataInicio: toDateStringManaus(dataInicio),
      dataFim: toDateStringManaus(dataFim),
      tipoResumoDia: opcaoUpper,
      agrupamentoDia: agrupamento,
    };

    return {
      proximoEstado: EstadoBot.AGUARDANDO_FORMATO_DIA,
      contextoAtualizado: novoContexto,
      resposta: this.getMenuFormatoDia(),
    };
  }

  /**
   * Processa formato de exibição (Extenso / Gráfico) e dispara processamento
   */
  private processarFormatoDia(
    opcao: string,
    contexto: ContextoDados,
    roles: string[],
    nomeUsuario: string
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {

    if (opcao === '0') {
      return {
        proximoEstado: EstadoBot.AGUARDANDO_TIPO_RESUMO_DIA,
        contextoAtualizado: contexto,
        resposta: this.getMenuTipoResumoDia(),
      };
    }

    if (!['1', '2'].includes(opcao)) {
      return {
        proximoEstado: EstadoBot.AGUARDANDO_FORMATO_DIA,
        contextoAtualizado: contexto,
        resposta: this.getMenuFormatoDia(),
      };
    }

    const novoContexto = {
      ...contexto,
      subFluxo: 'vendas_por_dia',
      formatoDia: opcao === '1' ? 'extenso' : 'grafico',
    };

    return {
      proximoEstado: EstadoBot.PROCESSANDO,
      contextoAtualizado: novoContexto,
      resposta: {
        resposta: '⏳ *Processando...* Buscando dados de vendas por dia.',
        proximoEstado: EstadoBot.PROCESSANDO,
      },
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  /**
   * Monta a mensagem de "qual supervisor deseja analisar?" usando a lista
   * de supervisores carregada do banco e salva no contexto.
   */
  montarPerguntaSupervisor(contexto: ContextoDados): MensagemBotResponse {
    const supervisoresCarregados: any[] = contexto.supervisoresCarregados || [];

    let texto = `📊 *Totalizador de Vendas por Supervisor*\n\n`;

    if (supervisoresCarregados.length > 0) {
      // Sempre exibir na ordem fixa (Loja, Food, Varejo, Redes, Telemarketing)
      SUPERVISORES.forEach(sup => {
        const s = supervisoresCarregados.find((v: any) =>
          v.NomeSetor?.toUpperCase().includes(sup.nome.toUpperCase()) ||
          sup.nome.toUpperCase().includes(v.NomeSetor?.toUpperCase())
        );
        if (s) {
          texto += `${sup.id} - ${s.NomeSetor} — R$ ${this.formatarMoedaSimples(s.TotalVendas)}\n`;
        }
      });
    } else {
      SUPERVISORES.forEach(s => {
        texto += `${s.id} - ${s.nome}\n`;
      });
    }

    texto += `\nDeseja análise de algum supervisor? *Digite o número (1-${SUPERVISORES.length})* ou *0* para voltar:`;

    return {
      resposta: texto,
      proximoEstado: EstadoBot.AGUARDANDO_ESCOLHA_SUPERVISOR,
    };
  }

  /**
   * Monta a mensagem de "qual vendedor deseja analisar?" reexibindo a lista
   * já carregada no contexto (vendedoresCarregados).
   */
  montarPerguntaVendedor(contexto: ContextoDados): MensagemBotResponse {
    const vendedoresCarregados: any[] = contexto.vendedoresCarregados || [];

    let texto = `👥 *Totalizador de Vendas por Vendedor*\n\n`;

    if (vendedoresCarregados.length > 0) {
      vendedoresCarregados.forEach((v: any) => {
        const codigo = v.SetorClientes ?? '—';
        const nome = (v.NomeVendedor ?? '').trim();
        const total = v.TotalVendas ?? 0;
        texto += `${codigo} - ${nome} — R$ ${formatarNumero(total)}\n`;
      });
    } else {
      texto += '_Nenhum vendedor carregado._\n';
    }

    texto += `\nDeseja análise de algum vendedor?\n*Digite o código* do vendedor ou *0* para voltar ao menu:`;

    return {
      resposta: texto,
      proximoEstado: EstadoBot.AGUARDANDO_CODIGO_VENDEDOR,
    };
  }

  private retornarLogout(): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {
    return {
      proximoEstado: EstadoBot.ENCERRADO,
      contextoAtualizado: {},
      resposta: {
        resposta: 'Até logo! 👋\n\nVocê foi desconectado. Digite seu CPF para fazer login novamente.',
        proximoEstado: EstadoBot.ENCERRADO,
      },
    };
  }

  private irParaMenuPrincipal(
    contexto: ContextoDados,
    roles: string[],
    nomeUsuario: string
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {
    return {
      proximoEstado: EstadoBot.MENU_PRINCIPAL,
      contextoAtualizado: {},
      resposta: this.getMenuPrincipal(roles, nomeUsuario),
    };
  }

  private getInicioSemanaAtual(): Date {
    return getCurrentWeekRange().start;
  }

  private getInicioSemanaAnterior(): Date {
    return getPreviousWeekRange().start;
  }

  private getFimSemanaAnterior(): Date {
    return getPreviousWeekRange().end;
  }

  private formatarMoedaSimples(valor: number): string {
    return formatarNumero(valor);
  }
}

export const botFlowService = new BotFlowService();