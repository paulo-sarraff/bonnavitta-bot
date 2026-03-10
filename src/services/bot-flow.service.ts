import logger from '../utils/logger.js';
import { EstadoBot, MensagemBotResponse, ContextoDados } from '../models/schemas.js';
import {
  formatarNumero,
  hojeStr, buildDateString, addDays, ultimoDiaMes,
  semanaAtualStr, semanaAnteriorStr,
} from '../utils/formatter.js';

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

// Opções de período compartilhadas por itens 1, 2 e 4
const OPCOES_PERIODO = [
  { id: '1', texto: 'Hoje',          emoji: '📍' },
  { id: '2', texto: 'Ontem',         emoji: '⏮️' },
  { id: '3', texto: 'Semana atual',  emoji: '📆' },
  { id: '4', texto: 'Mês atual',     emoji: '📅' },
  { id: '5', texto: 'Mês anterior',  emoji: '⏪' },
  { id: '6', texto: 'Ano atual',     emoji: '📊' },
  { id: '0', texto: 'Voltar',        emoji: '🔙' },
];

class BotFlowService {

  // ============================================================
  // MENUS DE EXIBIÇÃO
  // ============================================================

  getMenuPrincipal(roles: string[] = [], nomeUsuario: string): MensagemBotResponse {
    logger.info(`Gerando menu principal para roles: ${roles.join(', ')}`);

    const isAdminOrDiretoria = roles.includes('admin') || roles.includes('diretoria');
    const isComercial = roles.includes('comercial');
    const isFinanceiro = roles.includes('financeiro');

    if (isAdminOrDiretoria) {
      return {
        resposta: `🏪 O que deseja consultar?\n`,
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

  getMenuComercial(nomeUsuario: string = ''): MensagemBotResponse {
    const saudacao = nomeUsuario ? `🏪 *${nomeUsuario}* — Menu Comercial\n\n` : `🏪 *Menu Comercial*\n\n`;
    return {
      resposta: `${saudacao}O que deseja consultar?\n`,
      opcoes: [
        { id: '1', texto: 'Vendas por Supervisor',  emoji: '👔' },
        { id: '2', texto: 'Vendas por Vendedor',    emoji: '👥' },
        { id: '3', texto: 'Vendas por Dia',         emoji: '📅' },
        { id: '4', texto: 'Vendas por Fabricante',  emoji: '🏭' },
        { id: '0', texto: 'Sair',                   emoji: '👋' },
      ],
      proximoEstado: EstadoBot.MENU_COMERCIAL,
    };
  }

  getMenuPeriodo(): MensagemBotResponse {
    return {
      resposta: `📅 *Qual período deseja consultar?*\n`,
      opcoes: OPCOES_PERIODO,
      proximoEstado: EstadoBot.AGUARDANDO_DATA,
    };
  }

  /**
   * Item 3 — Vendas por Dia: opções descrevem o agrupamento
   */
  getMenuTipoResumoDia(): MensagemBotResponse {
    return {
      resposta: `📊 *Vendas por Dia — Tipo de Resumo*\n\nEscolha o agrupamento:\n`,
      opcoes: [
        { id: '1', texto: 'Semana atual (em dias)',   emoji: '📅' },
        { id: '2', texto: 'Mês atual (em dias)',      emoji: '🗓️' },
        { id: '3', texto: 'Mês atual (em semanas)',   emoji: '📆' },
        { id: '4', texto: 'Ano atual (em semanas)',   emoji: '📊' },
        { id: '5', texto: 'Ano atual (em meses)',     emoji: '📈' },
        { id: '0', texto: 'Voltar',                   emoji: '🔙' },
      ],
      proximoEstado: EstadoBot.AGUARDANDO_TIPO_RESUMO_DIA,
    };
  }

  getMenuFormatoDia(): MensagemBotResponse {
    return {
      resposta: `🖥️ *Como deseja visualizar o resultado?*\n`,
      opcoes: [
        { id: '1', texto: 'Extenso (texto)', emoji: '📝' },
        { id: '2', texto: 'Gráfico',         emoji: '📈' },
        { id: '0', texto: 'Voltar',          emoji: '🔙' },
      ],
      proximoEstado: EstadoBot.AGUARDANDO_FORMATO_DIA,
    };
  }

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

  montarPerguntaFabricante(contexto: ContextoDados): MensagemBotResponse {
    const fabricantes: any[] = contexto.fabricantesCarregados || [];
    let texto = `🏭 *Vendas por Fabricante*\n\n`;

    if (fabricantes.length > 0) {
      fabricantes.forEach((f: any, idx: number) => {
        texto += `${idx + 1} - ${(f.NomeFabricante ?? '').trim()} — R$ ${formatarNumero(f.TotalVendas)}\n`;
      });
      const total = fabricantes.reduce((s: number, f: any) => s + f.TotalVendas, 0);
      texto += `\n💰 *TOTAL GERAL: R$ ${formatarNumero(total)}*`;
    } else {
      texto += '_Nenhum fabricante carregado._\n';
    }

    texto += `\n\nDeseja análise detalhada de algum fabricante?\n*Digite o número* ou *0* para voltar ao menu:`;
    return { resposta: texto, proximoEstado: EstadoBot.EXIBINDO_LISTA_FABRICANTE };
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
          if (opcaoSelecionada === '1') {
            return {
              proximoEstado: EstadoBot.AGUARDANDO_ESCOLHA_SUPERVISOR,
              contextoAtualizado: contexto,
              resposta: this.montarPerguntaSupervisor(contexto),
            };
          }
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

        case EstadoBot.EXIBINDO_LISTA_FABRICANTE: {
          if (opcaoSelecionada === '0') {
            return this.irParaMenuPrincipal(contexto, roles, nomeUsuario);
          }
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
        }

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

  private processarMenuPrincipal(
    opcao: string, contexto: ContextoDados, roles: string[], nomeUsuario: string
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {
    if (opcao === '0') return this.retornarLogout();

    if ((roles.includes('admin') || roles.includes('diretoria')) && opcao === '1') {
      return {
        proximoEstado: EstadoBot.MENU_COMERCIAL,
        contextoAtualizado: {},
        resposta: this.getMenuComercial(nomeUsuario),
      };
    }

    return {
      proximoEstado: EstadoBot.MENU_PRINCIPAL,
      contextoAtualizado: contexto,
      resposta: this.getMenuPrincipal(roles, nomeUsuario),
    };
  }

  private processarMenuComercial(
    opcao: string, contexto: ContextoDados, roles: string[], nomeUsuario: string
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {
    if (opcao === '0') return this.retornarLogout();

    if (!['1', '2', '3', '4'].includes(opcao)) {
      return {
        proximoEstado: EstadoBot.MENU_COMERCIAL,
        contextoAtualizado: contexto,
        resposta: this.getMenuComercial(nomeUsuario),
      };
    }

    const novoContexto = { ...contexto, opcaoMenuComercial: opcao };

    if (opcao === '1') return { proximoEstado: EstadoBot.AGUARDANDO_PERIODO_SUPERVISOR, contextoAtualizado: novoContexto, resposta: this.getMenuPeriodo() };
    if (opcao === '2') return { proximoEstado: EstadoBot.AGUARDANDO_PERIODO_VENDEDOR,   contextoAtualizado: novoContexto, resposta: this.getMenuPeriodo() };
    if (opcao === '3') return { proximoEstado: EstadoBot.AGUARDANDO_TIPO_RESUMO_DIA,    contextoAtualizado: novoContexto, resposta: this.getMenuTipoResumoDia() };
    // opcao === '4'
    return { proximoEstado: EstadoBot.AGUARDANDO_PERIODO_FABRICANTE, contextoAtualizado: novoContexto, resposta: this.getMenuPeriodo() };
  }

  /**
   * Calcula dataInicio/dataFim a partir da opção de período (1-6).
   * Usa APENAS strings YYYY-MM-DD — zero dependência do timezone do servidor.
   */
  private processarPeriodo(
    opcao: string,
    contexto: ContextoDados,
    roles: string[],
    nomeUsuario: string,
    fluxo: 'supervisor' | 'vendedor' | 'fabricante'
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {

    if (opcao === '0') return this.irParaMenuPrincipal(contexto, roles, nomeUsuario);

    const hoje = hojeStr(); // YYYY-MM-DD em Manaus, sem timezone do servidor
    const [ano, mesN] = hoje.split('-').map(Number);

    let dataInicio: string;
    let dataFim: string;

    switch (opcao) {
      case '1': // Hoje
        dataInicio = hoje;
        dataFim = hoje;
        break;
      case '2': // Ontem
        dataInicio = addDays(hoje, -1);
        dataFim = dataInicio;
        break;
      case '3': // Semana atual (Seg-Dom)
        ({ inicio: dataInicio, fim: dataFim } = semanaAtualStr());
        break;
      case '4': // Mês atual
        dataInicio = buildDateString(ano, mesN, 1);
        dataFim = buildDateString(ano, mesN, ultimoDiaMes(ano, mesN));
        break;
      case '5': { // Mês anterior
        const mesPrev = mesN === 1 ? 12 : mesN - 1;
        const anoPrev = mesN === 1 ? ano - 1 : ano;
        dataInicio = buildDateString(anoPrev, mesPrev, 1);
        dataFim = buildDateString(anoPrev, mesPrev, ultimoDiaMes(anoPrev, mesPrev));
        break;
      }
      case '6': // Ano atual
        dataInicio = buildDateString(ano, 1, 1);
        dataFim = buildDateString(ano, 12, 31);
        break;
      default:
        dataInicio = hoje;
        dataFim = hoje;
    }

    const novoContexto = { ...contexto, dataInicio, dataFim };

    if (fluxo === 'supervisor') {
      return {
        proximoEstado: EstadoBot.PROCESSANDO,
        contextoAtualizado: { ...novoContexto, subFluxo: 'carregar_supervisores' },
        resposta: { resposta: '⏳ *Processando...* Buscando dados de supervisores.', proximoEstado: EstadoBot.PROCESSANDO },
      };
    }
    if (fluxo === 'vendedor') {
      return {
        proximoEstado: EstadoBot.PROCESSANDO,
        contextoAtualizado: { ...novoContexto, subFluxo: 'carregar_vendedores' },
        resposta: { resposta: '⏳ *Processando...* Buscando dados de vendedores.', proximoEstado: EstadoBot.PROCESSANDO },
      };
    }
    // fabricante
    return {
      proximoEstado: EstadoBot.PROCESSANDO,
      contextoAtualizado: { ...novoContexto, subFluxo: 'fabricante' },
      resposta: { resposta: '⏳ *Processando...* Buscando dados de fabricantes.', proximoEstado: EstadoBot.PROCESSANDO },
    };
  }

  private processarEscolhaSupervisor(
    opcao: string, contexto: ContextoDados, roles: string[], nomeUsuario: string
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {
    if (opcao === '0') return this.irParaMenuPrincipal(contexto, roles, nomeUsuario);

    const supervisor = SUPERVISORES.find(s => s.id === opcao);
    if (!supervisor) {
      return { proximoEstado: EstadoBot.AGUARDANDO_ESCOLHA_SUPERVISOR, contextoAtualizado: contexto, resposta: this.montarPerguntaSupervisor(contexto) };
    }
    return {
      proximoEstado: EstadoBot.PROCESSANDO,
      contextoAtualizado: { ...contexto, subFluxo: 'analise_supervisor', supervisorNome: supervisor.nome },
      resposta: { resposta: `⏳ *Processando...* Buscando análise de ${supervisor.nome}.`, proximoEstado: EstadoBot.PROCESSANDO },
    };
  }

  private processarCodigoVendedor(
    codigo: string, contexto: ContextoDados, roles: string[], nomeUsuario: string
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {
    if (codigo === '0') return this.irParaMenuPrincipal(contexto, roles, nomeUsuario);

    const codigoNum = parseInt(codigo.trim(), 10);
    if (isNaN(codigoNum)) {
      return {
        proximoEstado: EstadoBot.AGUARDANDO_CODIGO_VENDEDOR,
        contextoAtualizado: contexto,
        resposta: { resposta: `❌ Código inválido. Digite apenas o *número do código* do vendedor:\n(ou *0* para voltar)`, proximoEstado: EstadoBot.AGUARDANDO_CODIGO_VENDEDOR },
      };
    }
    return {
      proximoEstado: EstadoBot.PROCESSANDO,
      contextoAtualizado: { ...contexto, subFluxo: 'analise_vendedor', codigoVendedor: codigoNum },
      resposta: { resposta: `⏳ *Processando...* Buscando análise do vendedor ${codigoNum}.`, proximoEstado: EstadoBot.PROCESSANDO },
    };
  }

  /**
   * Item 3 — define dataInicio/dataFim e agrupamento conforme opção 1-5.
   * Usa APENAS strings — zero dependência do timezone do servidor.
   */
  private processarTipoResumoDia(
    opcao: string, contexto: ContextoDados, roles: string[], nomeUsuario: string
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {
    if (opcao === '0') return this.irParaMenuPrincipal(contexto, roles, nomeUsuario);

    if (!['1', '2', '3', '4', '5'].includes(opcao)) {
      return { proximoEstado: EstadoBot.AGUARDANDO_TIPO_RESUMO_DIA, contextoAtualizado: contexto, resposta: this.getMenuTipoResumoDia() };
    }

    const hoje = hojeStr();
    const [ano, mesN] = hoje.split('-').map(Number);
    let dataInicio: string;
    let dataFim: string;
    let agrupamento: string;

    switch (opcao) {
      case '1': // Semana atual em dias
        ({ inicio: dataInicio, fim: dataFim } = semanaAtualStr());
        agrupamento = 'semana_dias';
        break;
      case '2': // Mês atual em dias
        dataInicio = buildDateString(ano, mesN, 1);
        dataFim = buildDateString(ano, mesN, ultimoDiaMes(ano, mesN));
        agrupamento = 'mes_dias';
        break;
      case '3': // Mês atual em semanas
        dataInicio = buildDateString(ano, mesN, 1);
        dataFim = buildDateString(ano, mesN, ultimoDiaMes(ano, mesN));
        agrupamento = 'mes_semanas';
        break;
      case '4': // Ano atual em semanas
        dataInicio = buildDateString(ano, 1, 1);
        dataFim = buildDateString(ano, 12, 31);
        agrupamento = 'ano_semanas';
        break;
      case '5': // Ano atual em meses
        dataInicio = buildDateString(ano, 1, 1);
        dataFim = buildDateString(ano, 12, 31);
        agrupamento = 'ano_meses';
        break;
      default:
        dataInicio = hoje;
        dataFim = hoje;
        agrupamento = 'semana_dias';
    }

    return {
      proximoEstado: EstadoBot.PROCESSANDO,
      contextoAtualizado: { ...contexto, dataInicio, dataFim, tipoResumoDia: opcao, agrupamentoDia: agrupamento, subFluxo: 'vendas_por_dia', formatoDia: 'extenso' },
      resposta: { resposta: '⏳ *Processando...* Buscando dados de vendas por dia.', proximoEstado: EstadoBot.PROCESSANDO },
    };
  }

  private processarFormatoDia(
    opcao: string, contexto: ContextoDados, roles: string[], nomeUsuario: string
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {
    if (opcao === '0') {
      return { proximoEstado: EstadoBot.AGUARDANDO_TIPO_RESUMO_DIA, contextoAtualizado: contexto, resposta: this.getMenuTipoResumoDia() };
    }
    if (!['1', '2'].includes(opcao)) {
      return { proximoEstado: EstadoBot.AGUARDANDO_FORMATO_DIA, contextoAtualizado: contexto, resposta: this.getMenuFormatoDia() };
    }
    return {
      proximoEstado: EstadoBot.PROCESSANDO,
      contextoAtualizado: { ...contexto, subFluxo: 'vendas_por_dia', formatoDia: 'extenso' },
      resposta: { resposta: '⏳ *Processando...* Buscando dados de vendas por dia.', proximoEstado: EstadoBot.PROCESSANDO },
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  montarPerguntaSupervisor(contexto: ContextoDados): MensagemBotResponse {
    const carregados: any[] = contexto.supervisoresCarregados || [];
    let texto = `📊 *Vendas por Supervisor*\n\n`;

    SUPERVISORES.forEach(sup => {
      const s = carregados.find((v: any) =>
        v.NomeSetor?.toUpperCase().includes(sup.nome.toUpperCase()) ||
        sup.nome.toUpperCase().includes(v.NomeSetor?.toUpperCase())
      );
      if (s) {
        texto += `${sup.id} - ${s.NomeSetor} — R$ ${this.fmt(s.TotalVendas)}\n`;
      } else {
        // Supervisor sem dados no período — exibe com zero
        texto += `${sup.id} - ${sup.nome} — R$ 0,00\n`;
      }
    });

    texto += `\nDeseja análise de algum supervisor? *Digite o número (1-${SUPERVISORES.length})* ou *0* para voltar:`;
    return { resposta: texto, proximoEstado: EstadoBot.AGUARDANDO_ESCOLHA_SUPERVISOR };
  }

  montarPerguntaVendedor(contexto: ContextoDados): MensagemBotResponse {
    const vendedores: any[] = contexto.vendedoresCarregados || [];
    let texto = `👥 *Vendas por Vendedor*\n\n`;

    if (vendedores.length > 0) {
      vendedores.forEach((v: any) => {
        const codigo = v.SetorClientes ?? '—';
        const nome = (v.NomeVendedor ?? '').trim();
        const total = v.TotalVendas ?? 0;
        texto += `${codigo} - ${nome} — R$ ${formatarNumero(total)}\n`;
      });
    } else {
      texto += '_Nenhum vendedor carregado._\n';
    }

    texto += `\nDeseja análise de algum vendedor?\n*Digite o código* do vendedor ou *0* para voltar ao menu:`;
    return { resposta: texto, proximoEstado: EstadoBot.AGUARDANDO_CODIGO_VENDEDOR };
  }

  private retornarLogout(): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {
    return {
      proximoEstado: EstadoBot.ENCERRADO,
      contextoAtualizado: {},
      resposta: { resposta: 'Até logo! 👋\n\nVocê foi desconectado. Digite seu CPF para fazer login novamente.', proximoEstado: EstadoBot.ENCERRADO },
    };
  }

  private irParaMenuPrincipal(
    contexto: ContextoDados, roles: string[], nomeUsuario: string
  ): { proximoEstado: EstadoBot; contextoAtualizado: ContextoDados; resposta: MensagemBotResponse } {
    return {
      proximoEstado: EstadoBot.MENU_PRINCIPAL,
      contextoAtualizado: {},
      resposta: this.getMenuPrincipal(roles, nomeUsuario),
    };
  }

  private fmt(valor: number): string {
    return formatarNumero(valor);
  }
}

export const botFlowService = new BotFlowService();