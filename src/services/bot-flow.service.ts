import logger from '../utils/logger.js';
import { EstadoBot, MensagemBotResponse, ContextoDados } from '../models/schemas.js';
import { formatarNumero, formatarData, getPreviousWeekRange, getCurrentWeekRange, hojeManaus, toDateStringManaus, buildDateString, ultimoDiaMes } from '../utils/formatter.js';

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
          { id: '2', texto: 'Menu Financeiro', emoji: '💰' },
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
        { id: '5', texto: 'Em breve...', emoji: '🔒' },
        { id: '6', texto: 'Em breve...', emoji: '🔒' },
        { id: '7', texto: 'Em breve...', emoji: '🔒' },
        { id: '8', texto: 'Em breve...', emoji: '🔒' },
        { id: '9', texto: 'Em breve...', emoji: '🔒' },
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
        { id: '1', texto: 'Semana Atual', emoji: '📅' },
        { id: '2', texto: 'Semana Anterior', emoji: '⏪' },
        { id: '3', texto: 'Mês Atual', emoji: '🗓️' },
        { id: '4', texto: 'Ano Atual (por semana)', emoji: '📆' },
        { id: '5', texto: 'Ano Atual (por mês)', emoji: '📊' },
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

  /**
   * Pergunta pós-detalhe de fabricante: "Deseja analisar outro fabricante?"
   */
  getPerguntaOutroFabricante(): MensagemBotResponse {
    return {
      resposta: `🔄 Deseja analisar outro fabricante?`,
      opcoes: [
        { id: '1', texto: 'Sim', emoji: '✅' },
        { id: '2', texto: 'Não — voltar ao menu', emoji: '🔙' },
      ],
      proximoEstado: EstadoBot.EXIBINDO_DETALHE_FABRICANTE,
    };
  }

  /**
   * Reexibe a lista de fabricantes carregada no contexto e pede escolha.
   */
  montarPerguntaFabricante(contexto: ContextoDados): MensagemBotResponse {
    const fabricantes: any[] = contexto.fabricantesCarregados || [];

    let texto = `🏭 *Totalizador de Vendas por Fabricante*\n\n`;

    if (fabricantes.length > 0) {
      fabricantes.forEach((f: any, idx: number) => {
        const nome = (f.NomeFabricante ?? '').trim();
        texto += `${idx + 1} - ${nome} — R$ ${formatarNumero(f.TotalVendas)}\n`;
      });
      const total = fabricantes.reduce((s: number, f: any) => s + f.TotalVendas, 0);
      texto += `\n💰 *TOTAL GERAL: R$ ${formatarNumero(total)}*`;
    } else {
      texto += '_Nenhum fabricante carregado._\n';
    }

    texto += `\n\nDeseja análise detalhada de algum fabricante?\n*Digite o número* ou *0* para voltar ao menu:`;

    return {
      resposta: texto,
      proximoEstado: EstadoBot.EXIBINDO_LISTA_FABRICANTE,
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

        case EstadoBot.EXIBINDO_LISTA_FABRICANTE:
          if (opcaoSelecionada === '0') {
            return this.irParaMenuPrincipal(contexto, roles, nomeUsuario);
          }
          // Valida se é um número dentro da lista carregada
          const fabricantes: any[] = contexto.fabricantesCarregados || [];
          const idxFab = parseInt(opcaoSelecionada, 10) - 1;
          if (isNaN(idxFab) || idxFab < 0 || idxFab >= fabricantes.length) {
            return {
              proximoEstado: EstadoBot.EXIBINDO_LISTA_FABRICANTE,
              contextoAtualizado: contexto,
              resposta: this.montarPerguntaFabricante(contexto),
            };
          }
          return {
            proximoEstado: EstadoBot.PROCESSANDO,
            contextoAtualizado: {
              ...contexto,
              subFluxo: 'detalhe_fabricante',
              nomeFabricante: fabricantes[idxFab].NomeFabricante,
            },
            resposta: {
              resposta: `⏳ *Processando...* Buscando análise de ${fabricantes[idxFab].NomeFabricante}.`,
              proximoEstado: EstadoBot.PROCESSANDO,
            },
          };

        case EstadoBot.EXIBINDO_DETALHE_FABRICANTE:
          if (opcaoSelecionada === '1') {
            return {
              proximoEstado: EstadoBot.EXIBINDO_LISTA_FABRICANTE,
              contextoAtualizado: contexto,
              resposta: this.montarPerguntaFabricante(contexto),
            };
          }
          return this.irParaMenuPrincipal(contexto, roles, nomeUsuario);

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
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth() + 1; // 1-12
    let dataInicio: string;
    let dataFim: string;

    switch (opcao) {
      case '1': // Hoje
        dataInicio = toDateStringManaus(hoje);
        dataFim = toDateStringManaus(hoje);
        break;
      case '2': // Ontem
        const ontem = new Date(hoje);
        ontem.setDate(hoje.getDate() - 1);
        dataInicio = toDateStringManaus(ontem);
        dataFim = toDateStringManaus(ontem);
        break;
      case '3': // Última semana (Seg-Dom)
        dataInicio = toDateStringManaus(this.getInicioSemanaAnterior());
        dataFim = toDateStringManaus(this.getFimSemanaAnterior());
        break;
      case '4': // Este mês — buildDateString evita bug de timezone
        dataInicio = buildDateString(ano, mes, 1);
        dataFim = buildDateString(ano, mes, ultimoDiaMes(ano, mes));
        break;
      case '5': { // Mês anterior
        const mesPrev = mes === 1 ? 12 : mes - 1;
        const anoPrev = mes === 1 ? ano - 1 : ano;
        dataInicio = buildDateString(anoPrev, mesPrev, 1);
        dataFim = buildDateString(anoPrev, mesPrev, ultimoDiaMes(anoPrev, mesPrev));
        break;
      }
      default:
        dataInicio = toDateStringManaus(hoje);
        dataFim = toDateStringManaus(hoje);
    }

    const novoContexto = {
      ...contexto,
      dataInicio,
      dataFim,
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

    if (!['1', '2', '3', '4', '5'].includes(opcao)) {
      return {
        proximoEstado: EstadoBot.AGUARDANDO_TIPO_RESUMO_DIA,
        contextoAtualizado: contexto,
        resposta: this.getMenuTipoResumoDia(),
      };
    }

    const hoje = hojeManaus();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth() + 1; // 1-12
    let dataInicio: string;
    let dataFim: string;
    let agrupamento: string;

    switch (opcao) {
      case '1': // Semana Atual (Seg-Dom desta semana)
        dataInicio = toDateStringManaus(this.getInicioSemanaAtual());
        dataFim = toDateStringManaus(hoje);
        agrupamento = 'semana_atual';
        break;
      case '2': // Semana Anterior (Seg-Dom da semana passada)
        dataInicio = toDateStringManaus(this.getInicioSemanaAnterior());
        dataFim = toDateStringManaus(this.getFimSemanaAnterior());
        agrupamento = 'semana_anterior';
        break;
      case '3': // Mês Atual — buildDateString evita bug de timezone
        dataInicio = buildDateString(ano, mes, 1);
        dataFim = buildDateString(ano, mes, ultimoDiaMes(ano, mes));
        agrupamento = 'mes_atual';
        break;
      case '4': // Ano Atual por semana
        dataInicio = buildDateString(ano, 1, 1);
        dataFim = buildDateString(ano, 12, 31);
        agrupamento = 'ano_semanas';
        break;
      case '5': // Ano Atual por mês
        dataInicio = buildDateString(ano, 1, 1);
        dataFim = buildDateString(ano, 12, 31);
        agrupamento = 'ano_meses';
        break;
      default:
        dataInicio = toDateStringManaus(hoje);
        dataFim = toDateStringManaus(hoje);
        agrupamento = 'dia';
    }

    const novoContexto = {
      ...contexto,
      dataInicio,
      dataFim,
      tipoResumoDia: opcao,
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